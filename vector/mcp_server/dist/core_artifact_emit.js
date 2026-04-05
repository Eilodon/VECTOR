export function payloadObject(payload) {
    return payload != null && typeof payload === "object" && !Array.isArray(payload)
        ? payload
        : { value: payload };
}
export function artifactToText(artifact) {
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
function mergeArtifactRegistry(base, action, artifact, phase, deps) {
    const entry = {
        title: artifact.title,
        summary: artifact.summary,
        artifact_type: action,
        phase,
        updated_at: deps.now(),
        version: deps.currentVersion(),
    };
    const key = deps.artifactKeyForAction(action);
    if (!key)
        return base;
    return { ...base, [key]: entry };
}
export function createArtifactEmitter(deps) {
    return {
        async emit(action, artifact, statePatch) {
            const state = deps.getState();
            const nextPhase = String(statePatch.phase ?? state.phase);
            const updatedRegistry = mergeArtifactRegistry(statePatch.artifact_registry ?? state.artifact_registry, action, artifact, nextPhase, deps);
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
                    ...(statePatch.routing ?? {}),
                    mode: statePatch.routing?.mode ?? state.routing?.mode ?? deps.inferModeForPhase(nextPhase),
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
