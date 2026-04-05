import { syncGraphFromState } from "./graph_memory_runtime.js";

export function createStateRuntime(deps: {
  currentVersion: () => string;
  now: () => string;
  logger?: (() => Pick<Console, "error" | "warn"> | undefined) | undefined;
  telemetry?: (() => ((event: string, meta: Record<string, unknown>) => Promise<void>) | undefined) | undefined;
  stateStore: {
    load: () => Promise<any | null>;
    save: (state: any) => Promise<void>;
    saveBackup?: (state: any, previousPhase: string, nextPhase: string) => Promise<void>;
  };
  graphStore: {
    load: () => Promise<any | null>;
    save: (graph: any) => Promise<void>;
  };
  getState: () => any;
  setState: (state: any) => void;
  getGraphMemory: () => any;
  setGraphMemory: (graph: any) => void;
  phaseToStage: (phase: string) => string | null;
  phaseToMilestone: (phase: string) => string;
  inferModeForPhase: (phase: string) => string;
  defaultState: () => any;
  defaultGraphMemory: () => any;
  defaultRouting: (phase?: string) => Record<string, unknown>;
  defaultProduct: () => Record<string, unknown>;
  defaultICP: () => Record<string, unknown>;
  defaultMarket: () => Record<string, unknown>;
  defaultDistribution: () => Record<string, unknown>;
  defaultObjectionMap: () => Record<string, unknown>;
  defaultGates: () => Record<string, unknown>;
  defaultPlatform: () => Record<string, unknown>;
  defaultSession: () => Record<string, unknown>;
  defaultArtifactRegistry: () => Record<string, unknown>;
  stageToCurrentPhaseConfidence: (phase: string) => number;
  reconcileSessionState: (loaded: any) => { state: any; notes: string[] };
  vectorStateSchema: { parse: (value: unknown) => any };
  vectorGraphMemorySchema: { parse: (value: unknown) => any };
}) {
  let commitQueue: Promise<void> = Promise.resolve();

  function coalesceString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value : null;
  }

  function syncCanonicalViews(state: Record<string, any>): any {
    const currentState = deps.getState();
    const phase = state.phase ?? currentState.phase ?? "intake";
    const stage = state.stage ?? deps.phaseToStage(phase);
    const routing = {
      ...(currentState.routing ?? deps.defaultRouting(phase)),
      ...(state.routing ?? {}),
      mode: state.routing?.mode ?? deps.inferModeForPhase(phase),
      persona: state.routing?.persona ?? currentState.routing?.persona ?? "unknown",
      platform: state.routing?.platform ?? currentState.routing?.platform ?? null,
      intent: state.routing?.intent ?? currentState.routing?.intent ?? null,
      last_router_reason: state.routing?.last_router_reason ?? currentState.routing?.last_router_reason ?? null,
    };

    const product = {
      ...(currentState.product ?? deps.defaultProduct()),
      ...(state.product ?? {}),
      name: state.product?.name ?? coalesceString(state.product_description),
      summary: state.product?.summary ?? coalesceString(state.product_description),
      price: state.product?.price ?? null,
      live_status: state.product?.live_status ?? currentState.product?.live_status ?? "unknown",
      category: state.product?.category ?? currentState.product?.category ?? state.product_meta?.category ?? null,
    };

    const icp = {
      ...(currentState.icp ?? deps.defaultICP()),
      ...(state.icp ?? {}),
      hypothesis: state.icp?.hypothesis ?? coalesceString(state.icp_hypothesis),
      confirmed: state.icp?.confirmed ?? state.icp_confirmed ?? false,
      who: state.icp?.who ?? coalesceString(state.target_user),
      problem: state.icp?.problem ?? coalesceString(state.job_statement),
      trigger_moment: state.icp?.trigger_moment ?? null,
      desired_outcome: state.icp?.desired_outcome ?? null,
      watering_holes: state.icp?.watering_holes ?? [],
      wtp_signal: state.icp?.wtp_signal ?? null,
      evidence: state.icp?.evidence ?? [],
      drift_status: state.icp?.drift_status ?? state.icp_drift ?? "unknown",
    };

    const market = {
      ...(currentState.market ?? deps.defaultMarket()),
      ...(state.market ?? {}),
      competitor_map: {
        ...(currentState.market?.competitor_map ?? deps.defaultMarket().competitor_map),
        ...(state.market?.competitor_map ?? {}),
      },
    };

    const distribution = {
      ...(currentState.distribution ?? deps.defaultDistribution()),
      ...(state.distribution ?? {}),
      channel_selected: state.distribution?.channel_selected ?? state.channel_selected ?? null,
      channel_score: state.distribution?.channel_score
        ?? state.channel_scores?.[0]?.score
        ?? currentState.distribution?.channel_score
        ?? null,
      channel_score_raw: state.distribution?.channel_score_raw ?? currentState.distribution?.channel_score_raw ?? null,
      venue_selected: state.distribution?.venue_selected ?? state.venue_selected ?? null,
      primary_angle: state.distribution?.primary_angle ?? state.thesis_card?.angle ?? null,
      growth_multiplier: state.distribution?.growth_multiplier ?? state.thesis_card?.growth_multiplier ?? null,
      growth_multiplier_type: state.distribution?.growth_multiplier_type ?? currentState.distribution?.growth_multiplier_type ?? null,
      unlock_condition: state.distribution?.unlock_condition ?? state.thesis_card?.unlock_condition ?? currentState.distribution?.unlock_condition ?? null,
      alternatives: state.distribution?.alternatives ?? state.thesis_card?.alternatives_rejected ?? [],
    };

    const objection_map = {
      ...(currentState.objection_map ?? deps.defaultObjectionMap()),
      ...(state.objection_map ?? {}),
    };

    const gates = {
      ...(currentState.gates ?? deps.defaultGates()),
      ...(state.gates ?? {}),
    };

    const risk = {
      riskiest_assumption: state.risk?.riskiest_assumption ?? state.riskiest_assumption ?? null,
      top_failure_mode: state.risk?.top_failure_mode ?? null,
      drift_status: state.risk?.drift_status ?? state.icp_drift ?? "unknown",
    };

    const logs = {
      trauma: state.logs?.trauma ?? state.trauma_log ?? [],
      decisions: state.logs?.decisions ?? state.history ?? [],
      questions_open: state.logs?.questions_open ?? [],
      processed_requests: state.logs?.processed_requests ?? currentState.logs?.processed_requests ?? [],
    };

    const confidence = {
      current_phase: state.confidence?.current_phase ?? deps.stageToCurrentPhaseConfidence(phase),
      overall: state.confidence?.overall ?? "unknown",
    };

    const platform = {
      ...(currentState.platform ?? deps.defaultPlatform()),
      ...(state.platform ?? {}),
      name: state.platform?.name ?? currentState.platform?.name ?? null,
    };

    const session = {
      ...(currentState.session ?? deps.defaultSession()),
      ...(state.session ?? {}),
      schema_version: state.session?.schema_version ?? deps.currentVersion(),
    };

    const nextState = {
      ...deps.defaultState(),
      ...currentState,
      ...state,
      phase,
      metadata: state.metadata ?? currentState.metadata ?? { language: "en", notes_language: "vi", version: deps.currentVersion() },
      milestone: state.milestone ?? deps.phaseToMilestone(phase),
      stage,
      routing,
      product,
      icp,
      market,
      distribution,
      objection_map,
      recovery_log: state.recovery_log ?? currentState.recovery_log ?? [],
      gates,
      risk,
      logs,
      confidence,
      platform,
      session,
      research_memo: state.research_memo ?? currentState.research_memo ?? null,
      request_registry: state.request_registry ?? currentState.request_registry ?? {},
      founder_edge_audit: state.founder_edge_audit ?? currentState.founder_edge_audit ?? [],
      copy_review: state.copy_review ?? currentState.copy_review ?? null,
      artifact_registry: state.artifact_registry ?? currentState.artifact_registry ?? deps.defaultArtifactRegistry(),
      experiment_ledger: state.experiment_ledger ?? currentState.experiment_ledger ?? { active: [], archived: [] },
      product_meta: state.product_meta ?? { category: product.category ?? null },
      updated_at: state.updated_at ?? deps.now(),
      icp_drift: state.icp_drift ?? risk.drift_status,
      trauma_log: state.trauma_log ?? logs.trauma,
      history: state.history ?? logs.decisions,
    };

    return deps.vectorStateSchema.parse(nextState);
  }

  async function loadState(): Promise<any> {
    const loaded = await deps.stateStore.load();
    if (!loaded) {
      return deps.defaultState();
    }
    try {
      const reconciled = deps.reconcileSessionState(syncCanonicalViews(loaded));
      if (reconciled.notes.length) {
        void deps.telemetry?.()?.("session_reconciled_on_load", {
          notes: reconciled.notes,
          phase: reconciled.state.phase,
        });
      }
      return reconciled.state;
    } catch (error) {
      deps.logger?.()?.error("Failed to load state, falling back to default:", error);
      return deps.defaultState();
    }
  }

  async function loadGraphMemory(): Promise<any> {
    const loaded = await deps.graphStore.load();
    if (!loaded) {
      return deps.defaultGraphMemory();
    }
    try {
      return deps.vectorGraphMemorySchema.parse({
        ...deps.defaultGraphMemory(),
        ...loaded,
        version: deps.currentVersion(),
        updated_at: loaded.updated_at ?? deps.now(),
      });
    } catch (error) {
      deps.logger?.()?.error("Failed to load graph memory, falling back to empty graph:", error);
      return deps.defaultGraphMemory();
    }
  }

  async function saveState(nextState: any): Promise<void> {
    await deps.stateStore.save(nextState);
  }

  async function saveGraphMemory(nextGraph: any): Promise<void> {
    const parsed = deps.vectorGraphMemorySchema.parse({
      ...nextGraph,
      version: deps.currentVersion(),
      updated_at: deps.now(),
    });
    deps.setGraphMemory(parsed);
    await deps.graphStore.save(parsed);
  }

  function appendHistory(action: string, note = ""): void {
    const state = deps.getState();
    deps.setState({
      ...state,
      history: [
        ...state.history,
        { when: deps.now(), action, note },
      ].slice(-200),
    });
  }

  async function commitState(nextState: any, action: string, note = ""): Promise<any> {
    const run = async (): Promise<any> => {
      const currentState = deps.getState();
      const previousPhase = currentState.phase;
      const validated = syncCanonicalViews({
        ...nextState,
        version: deps.currentVersion(),
        updated_at: deps.now(),
      });
      deps.setState(validated);
      appendHistory(action, note);
      const stateWithHistory = deps.getState();
      const nextCommittedState = {
        ...stateWithHistory,
        logs: {
          ...(stateWithHistory.logs ?? { trauma: [], decisions: [], questions_open: [], processed_requests: [] }),
          decisions: stateWithHistory.history,
          trauma: stateWithHistory.trauma_log,
        },
        history: stateWithHistory.history.slice(-200),
      };
      deps.setState(nextCommittedState);
      await saveState(nextCommittedState);
      if (action !== "vector_graph_sync" && action !== "vector_graph_query") {
        try {
          const nextGraph = deps.vectorGraphMemorySchema.parse(
            syncGraphFromState(nextCommittedState, deps.getGraphMemory(), `auto:${action}`, deps.now()),
          );
          await saveGraphMemory(nextGraph);
        } catch (error) {
          deps.logger?.()?.warn("Failed to auto-sync advisory graph memory:", error);
        }
      }

      if (previousPhase !== nextCommittedState.phase) {
        try {
          await deps.stateStore.saveBackup?.(nextCommittedState, previousPhase, nextCommittedState.phase);
        } catch (error) {
          deps.logger?.()?.warn("Failed to write snapshot backup:", error);
        }
      }

      void deps.telemetry?.()?.("tool_invocation_completed", { action, phase: nextCommittedState.phase, stage: nextCommittedState.stage });
      return deps.getState();
    };
    const result = commitQueue.then(run, run);
    commitQueue = result.then(() => undefined, () => undefined);
    return result;
  }

  return {
    syncCanonicalViews,
    loadState,
    loadGraphMemory,
    saveState,
    saveGraphMemory,
    commitState,
  };
}
