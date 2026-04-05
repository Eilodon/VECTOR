import type {
  ArtifactRegistry,
  DistributionState,
  Gates,
  ICPState,
  MarketState,
  Mode,
  ObjectionMap,
  Phase,
  PlatformState,
  ProductState,
  RoutingState,
  SessionState,
  VectorState,
} from "./core_schemas.js";

type StateDefaultDeps = {
  currentVersion: () => string;
  now: () => string;
  inferModeForPhase: (phase: Phase) => Mode;
};

export function createStateDefaults(deps: StateDefaultDeps) {
  function defaultArtifactRegistry(): ArtifactRegistry {
    return {
      intake_memo: null,
      icp_card: null,
      market_map: null,
      channel_scorecard: null,
      founder_edge_audit_result: null,
      thesis_card: null,
      venue_card: null,
      venue_scorecard: null,
      signal_ledger: null,
      research_memo: null,
      copy_pack: null,
      copy_review: null,
      objection_map: null,
      decision_memo: null,
      strategy_map: null,
    };
  }

  function defaultRouting(phase: Phase = "intake"): RoutingState {
    return {
      persona: "unknown",
      mode: deps.inferModeForPhase(phase),
      platform: null,
      intent: null,
      last_router_reason: null,
    };
  }

  function defaultProduct(): ProductState {
    return {
      name: null,
      summary: null,
      price: null,
      live_status: "unknown",
      category: null,
    };
  }

  function defaultICP(): ICPState {
    return {
      hypothesis: null,
      confirmed: false,
      who: null,
      problem: null,
      trigger_moment: null,
      desired_outcome: null,
      watering_holes: [],
      wtp_signal: null,
      evidence: [],
      drift_status: "unknown",
      evidence_tags: {
        who: "speculative",
        problem: "speculative",
        trigger_moment: "speculative",
        wtp_signal: "speculative",
        forces: "speculative",
      },
      confidence: "unknown",
      top_unknown: null,
      next_experiment: null,
      forces: {
        push: null,
        pull: null,
        anxiety: null,
        habit: null,
      },
    };
  }

  function defaultMarket(): MarketState {
    return {
      stage_confirmed: null,
      market_category: null,
      category_stance: null,
      competitor_map: {
        direct: [],
        substitutes: [],
        workflow_competitors: [],
        attention_competitors: [],
      },
      gold_zone_channels: [],
      red_ocean: [],
      white_space_notes: null,
      why_now_pressure: null,
      next_research_question: null,
      last_updated: null,
    };
  }

  function defaultDistribution(): DistributionState {
    return {
      channel_selected: null,
      channel_score: null,
      channel_score_raw: null,
      venue_selected: null,
      primary_angle: null,
      growth_multiplier: null,
      growth_multiplier_type: null,
      unlock_condition: null,
      alternatives: [],
    };
  }

  function defaultObjectionMap(): ObjectionMap {
    return {
      primary_objection: null,
      objection_type: null,
      copy_job: null,
      placement: null,
      secondary_objection: null,
    };
  }

  function defaultGates(): Gates {
    return {
      intake_cleared: false,
      icp_cleared: false,
      market_cleared: false,
      channel_cleared: false,
      thesis_cleared: false,
      venue_cleared: false,
    };
  }

  function defaultPlatform(): PlatformState {
    return { name: null, install_status: "unknown", load_order_verified: false };
  }

  function defaultSession(): SessionState {
    return {
      schema_version: deps.currentVersion(),
      kb_synced: false,
      last_sync: null,
      confidence_delta: null,
    };
  }

  function defaultState(): VectorState {
    return {
      version: deps.currentVersion(),
      updated_at: deps.now(),
      phase: "intake",
      milestone: "M0",
      stage: "0→1",
      icp_confirmed: false,
      product_description: null,
      product: defaultProduct(),
      builder_background: null,
      icp_hypothesis: null,
      target_user: null,
      job_statement: null,
      riskiest_assumption: null,
      market_memo: null,
      market: defaultMarket(),
      research_memo: null,
      request_registry: {},
      founder_edge_audit: [],
      channel_selected: null,
      channel_scores: [],
      venue_selected: null,
      thesis_card: null,
      venue_card: null,
      sales_copy: null,
      copy_review: null,
      routing: defaultRouting(),
      artifact_registry: defaultArtifactRegistry(),
      experiment_ledger: { active: [], archived: [] },
      platform: defaultPlatform(),
      session: defaultSession(),
      metadata: { language: "en", notes_language: "vi", version: deps.currentVersion() },
      product_meta: { category: null },
      icp: defaultICP(),
      distribution: defaultDistribution(),
      objection_map: defaultObjectionMap(),
      recovery_log: [],
      gates: defaultGates(),
      confidence: { current_phase: null, overall: "unknown" },
      risk: { riskiest_assumption: null, top_failure_mode: null, drift_status: "unknown" },
      logs: { trauma: [], decisions: [], questions_open: [], processed_requests: [] },
      signals: { green: [], yellow: [], red: [] },
      icp_drift: "unknown",
      trauma_log: [],
      next_action: null,
      history: [],
    };
  }

  return {
    defaultArtifactRegistry,
    defaultRouting,
    defaultProduct,
    defaultICP,
    defaultMarket,
    defaultDistribution,
    defaultObjectionMap,
    defaultGates,
    defaultPlatform,
    defaultSession,
    defaultState,
  };
}
