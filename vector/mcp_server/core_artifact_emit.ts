export type ArtifactLike = {
  title: string;
  summary: string;
  decisions: string[];
  next_actions: string[];
  state_delta: Record<string, unknown>;
  payload: unknown;
};

export type ToolTextResponseLike = { content: Array<{ type: "text"; text: string }> };

export function payloadObject(payload: unknown): Record<string, unknown> {
  return payload != null && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : { value: payload };
}

export function artifactToText(artifact: ArtifactLike): string {
  return [
    `# ${artifact.title}`,
    "",
    `## Summary`,
    artifact.summary,
    "",
    `## Decisions`,
    ...artifact.decisions.map((item) => `- ${item}`),
    "",
    `## Next actions`,
    ...artifact.next_actions.map((item) => `- ${item}`),
    "",
    `## State delta`,
    "```json",
    JSON.stringify(artifact.state_delta, null, 2),
    "```",
    "",
    `## Payload`,
    "```json",
    JSON.stringify(artifact.payload, null, 2),
    "```",
  ].join("\n");
}

function mergeArtifactRegistry(
  base: Record<string, unknown>,
  action: string,
  artifact: ArtifactLike,
  phase: string,
  deps: {
    now: () => string;
    currentVersion: () => string;
    artifactKeyForAction: (action: string) => string | null | undefined;
  },
): Record<string, unknown> {
  const entry = {
    title: artifact.title,
    summary: artifact.summary,
    artifact_type: action,
    phase,
    updated_at: deps.now(),
    version: deps.currentVersion(),
  };
  const key = deps.artifactKeyForAction(action);
  if (!key) return base;
  return { ...base, [key]: entry };
}

export function createArtifactEmitter(deps: {
  now: () => string;
  currentVersion: () => string;
  artifactKeyForAction: (action: string) => string | null | undefined;
  phaseToStage: (phase: string) => string | null;
  defaultSession: () => Record<string, unknown>;
  defaultRouting: (phase?: string) => Record<string, unknown>;
  inferModeForPhase: (phase: string) => string;
  assertPhasePrerequisites: (targetPhase: string, candidateState: any) => void;
  syncCanonicalViews: (state: any) => any;
  commitState: (nextState: any, action: string, note?: string) => Promise<any>;
  getState: () => any;
}) {
  return {
    async emit(action: string, artifact: ArtifactLike, statePatch: Record<string, unknown>): Promise<ToolTextResponseLike> {
      const state = deps.getState();
      const nextPhase = String(statePatch.phase ?? state.phase);
      const updatedRegistry = mergeArtifactRegistry(
        (statePatch.artifact_registry as Record<string, unknown> | undefined) ?? state.artifact_registry,
        action,
        artifact,
        nextPhase,
        deps,
      );
      const candidateState = deps.syncCanonicalViews({
        ...state,
        ...statePatch,
        stage: statePatch.stage ?? deps.phaseToStage(nextPhase),
        artifact_registry: updatedRegistry,
        session: statePatch.session ?? {
          ...(state.session ?? deps.defaultSession()),
          kb_synced: false,
          last_sync: null,
          schema_version: deps.currentVersion(),
        },
        routing: {
          ...(state.routing ?? deps.defaultRouting(nextPhase)),
          ...((statePatch.routing as Record<string, unknown> | undefined) ?? {}),
          mode: (statePatch.routing as Record<string, unknown> | undefined)?.mode ?? state.routing?.mode ?? deps.inferModeForPhase(nextPhase),
        },
      });
      deps.assertPhasePrerequisites(nextPhase, candidateState);
      const next = await deps.commitState(candidateState, action, artifact.summary);
      return {
        content: [{ type: "text", text: artifactToText({
          ...artifact,
          state_delta: statePatch,
          payload: {
            ...payloadObject(artifact.payload),
            state: {
              ...next,
              history: next.history.slice(-5),
              trauma_log: next.trauma_log.slice(-3),
              logs: {
                ...next.logs,
                trauma: next.logs.trauma.slice(-3),
                decisions: next.logs.decisions.slice(-5),
              },
            },
          },
        }) }],
      };
    },
  };
}
