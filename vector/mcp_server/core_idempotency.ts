import { z } from "zod";

export function withRequestSchema<T extends Record<string, z.ZodTypeAny>>(shape: T): T & { request_id: z.ZodOptional<z.ZodString> } {
  return {
    request_id: z.string().min(8).max(128).regex(/^[a-zA-Z0-9:_-]+$/).optional().describe("Optional request id for idempotent retries."),
    ...shape,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function extractRequestId(args: unknown): string | undefined {
  if (!isObject(args)) return undefined;
  return typeof args.request_id === "string" && args.request_id.trim() ? args.request_id : undefined;
}

function stripRequestId<T>(args: T): T {
  if (!isObject(args)) return args;
  const { request_id: _requestId, ...rest } = args;
  return rest as T;
}

export function createIdempotencyRuntime(deps: {
  maxProcessedRequests: number;
  maxRequestRegistryEntries: number;
  now: () => string;
  logger?: (() => Pick<Console, "warn"> | undefined) | undefined;
  telemetry?: (() => ((event: string, meta: Record<string, unknown>) => Promise<void>) | undefined) | undefined;
  loadLatestState: () => Promise<any | null>;
  saveState: (state: any) => Promise<void>;
  syncCanonicalViews: (state: any) => any;
  getState: () => any;
  setState: (state: any) => void;
}) {
  let toolExecutionQueue: Promise<void> = Promise.resolve();

  function pruneRequestRegistry(
    registry: Record<string, { updated_at?: string }> | undefined,
    maxEntries = deps.maxRequestRegistryEntries,
  ): Record<string, { updated_at?: string }> {
    const entries = Object.entries(registry ?? {});
    if (entries.length <= maxEntries) {
      return Object.fromEntries(entries);
    }
    const next = entries
      .sort((a, b) => {
        const left = new Date(a[1]?.updated_at ?? 0).getTime();
        const right = new Date(b[1]?.updated_at ?? 0).getTime();
        return left - right;
      })
      .slice(-maxEntries);
    return Object.fromEntries(next);
  }

  async function enqueueToolExecution<T>(run: () => Promise<T>): Promise<T> {
    const result = toolExecutionQueue.then(run, run);
    toolExecutionQueue = result.then(() => undefined, () => undefined);
    return result;
  }

  async function cacheRequestResponse(requestId: string, action: string, response: { content: Array<{ text: string }> }): Promise<void> {
    const state = deps.getState();
    const responseText = response.content.map((item) => item.text).join("\n\n");
    const nextProcessedRequests = [...(state.logs?.processed_requests ?? []), requestId].slice(-deps.maxProcessedRequests);
    const nextRegistry = pruneRequestRegistry({
      ...(state.request_registry ?? {}),
      [requestId]: {
        action,
        response_text: responseText,
        updated_at: deps.now(),
      },
    });
    const nextState = deps.syncCanonicalViews({
      ...state,
      request_registry: nextRegistry,
      logs: {
        ...(state.logs ?? { trauma: [], decisions: [], questions_open: [], processed_requests: [] }),
        processed_requests: nextProcessedRequests,
      },
    });
    deps.setState(nextState);
    await deps.saveState(nextState);
  }

  function withIdempotency<T extends { content: Array<{ type: "text"; text: string }> }>(
    action: string,
    handler: (args: any) => Promise<T>,
  ) {
    return async (args: any): Promise<T> => {
      return enqueueToolExecution(async () => {
        const startMs = Date.now();
        
        try {
          const latestState = await deps.loadLatestState();
          if (latestState) {
            deps.setState(deps.syncCanonicalViews(latestState));
          }
        } catch (error) {
          deps.logger?.()?.warn("Concurrency hook failed to load state:", error);
        }

        const requestId = extractRequestId(args);
        const state = deps.getState();
        if (requestId) {
          const cached = state.request_registry?.[requestId];
          if (cached && cached.action === action) {
            return { content: [{ type: "text", text: cached.response_text }] } as T;
          }
        }

        try {
          const response = await handler(stripRequestId(args));
          const latencyMs = Date.now() - startMs;
          
          // Emit success telemetry
          void deps.telemetry?.()?.("tool_invocation_completed", {
            action,
            phase: state.phase,
            latency_ms: latencyMs,
            cached: false,
            request_id: requestId ?? null,
          });
          
          if (requestId) {
            await cacheRequestResponse(requestId, action, response);
          }
          return response;
        } catch (error) {
          const latencyMs = Date.now() - startMs;
          
          // Emit error telemetry
          void deps.telemetry?.()?.("tool_invocation_failed", {
            action,
            phase: state.phase,
            latency_ms: latencyMs,
            error_code: error instanceof Error && 'code' in error ? (error as any).code : "UNKNOWN_ERROR",
            error_message: error instanceof Error ? error.message : String(error),
            request_id: requestId ?? null,
          });
          
          throw error;
        }
      });
    };
  }

  return {
    withIdempotency,
    withRequestSchema,
  };
}
