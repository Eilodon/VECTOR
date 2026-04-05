import { z } from "zod";
export function withRequestSchema(shape) {
    return {
        request_id: z.string().min(8).max(128).regex(/^[a-zA-Z0-9:_-]+$/).optional().describe("Optional request id for idempotent retries."),
        ...shape,
    };
}
function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
function extractRequestId(args) {
    if (!isObject(args))
        return undefined;
    return typeof args.request_id === "string" && args.request_id.trim() ? args.request_id : undefined;
}
function stripRequestId(args) {
    if (!isObject(args))
        return args;
    const { request_id: _requestId, ...rest } = args;
    return rest;
}
export function createIdempotencyRuntime(deps) {
    let toolExecutionQueue = Promise.resolve();
    function pruneRequestRegistry(registry, maxEntries = deps.maxRequestRegistryEntries) {
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
    async function enqueueToolExecution(run) {
        const result = toolExecutionQueue.then(run, run);
        toolExecutionQueue = result.then(() => undefined, () => undefined);
        return result;
    }
    async function cacheRequestResponse(requestId, action, response) {
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
    function withIdempotency(action, handler) {
        return async (args) => {
            return enqueueToolExecution(async () => {
                try {
                    const latestState = await deps.loadLatestState();
                    if (latestState) {
                        deps.setState(deps.syncCanonicalViews(latestState));
                    }
                }
                catch (error) {
                    deps.logger?.()?.warn("Concurrency hook failed to load state:", error);
                }
                const requestId = extractRequestId(args);
                const state = deps.getState();
                if (requestId) {
                    const cached = state.request_registry?.[requestId];
                    if (cached && cached.action === action) {
                        return { content: [{ type: "text", text: cached.response_text }] };
                    }
                }
                const response = await handler(stripRequestId(args));
                if (requestId) {
                    await cacheRequestResponse(requestId, action, response);
                }
                return response;
            });
        };
    }
    return {
        withIdempotency,
        withRequestSchema,
    };
}
