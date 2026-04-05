import { z } from "zod";
import { ObservationModeSchema, RESEARCH_PROVIDER_INTERFACES, } from "./research_provider_contract.js";
import { WORKFLOW_MILESTONES, WORKFLOW_MODES, WORKFLOW_PHASES, WORKFLOW_STAGES, } from "./workflow_contract.js";
export const VECTOR_VERSION = "2.0.0";
export const PhaseSchema = z.enum(WORKFLOW_PHASES);
export const MilestoneSchema = z.enum(WORKFLOW_MILESTONES);
export const StageSchema = z.enum(WORKFLOW_STAGES).nullable().default(null);
export const LiveStatusSchema = z.enum(["live", "prelaunch", "in-dev", "unknown"]).default("unknown");
export const ConfidenceLevelSchema = z.enum(["low", "medium", "high", "unknown"]).default("unknown");
export const DriftStatusSchema = z.enum(["unknown", "confirmed", "narrowed", "changed", "observed"]).default("unknown");
export const ModeSchema = z.enum(WORKFLOW_MODES).default("quick_start");
export const PersonaSchema = z.enum(["prelaunch_builder", "active_founder", "scaling_team", "audit_user", "unknown"]).default("unknown");
export const InstallStatusSchema = z.enum(["unknown", "pending", "installed", "verified", "failed"]).default("unknown");
export const EvidenceTagSchema = z.enum(["observed", "inferred", "benchmarked", "speculative"]).default("speculative");
export const EvidenceStrengthSchema = z.enum(["weak", "medium", "strong"]).default("medium");
export const SourceTypeSchema = z.enum([
    "official_docs",
    "github",
    "search_result",
    "browser_capture",
    "crm_note",
    "internal_note",
    "community_post",
    "social_signal",
    "benchmark",
    "other",
]).default("other");
export const EvidenceKindSchema = z.enum([
    "competitor",
    "substitute",
    "workflow_competitor",
    "attention_competitor",
    "channel_presence",
    "venue_fit",
    "trust_signal",
    "pricing",
    "customer_language",
    "experiment",
    "other",
]).default("other");
export const ConfidenceSchema = z.number().min(0).max(1);
export const ResearchDimensionSchema = z.number().int().min(-2).max(2).default(0);
export const SignalItemSchema = z.object({
    id: z.string(),
    label: z.string(),
    source: z.string().default("manual"),
    confidence: ConfidenceSchema.default(0.5),
    notes: z.string().default(""),
    created_at: z.string(),
});
export const ChannelScoreSchema = z.object({
    channel: z.string(),
    score: z.number().min(0).max(100),
    confidence: ConfidenceSchema.default(0.5),
    reason: z.string(),
    evidence: z.array(z.string()).default([]),
    risk: z.string().default(""),
    next_test: z.string().default(""),
});
export const FounderEdgeAuditEntrySchema = z.object({
    channel: z.string(),
    network_presence: z.boolean().nullable().default(null),
    track_record: z.boolean().nullable().default(null),
    credibility_recognizable: z.boolean().nullable().default(null),
    speed_advantage: z.boolean().nullable().default(null),
    warm_door_opener: z.boolean().nullable().default(null),
    score: z.number().int().min(0).max(5).nullable().default(null),
    notes: z.string().default(""),
});
export const MarketMemoSchema = z.object({
    competitors: z.array(z.string()).default([]),
    substitutes: z.array(z.string()).default([]),
    workflow_competitors: z.array(z.string()).default([]),
    attention_competitors: z.array(z.string()).default([]),
    white_space: z.array(z.string()).default([]),
    unresolved_unknowns: z.array(z.string()).default([]),
});
export const ThesisCardSchema = z.object({
    product: z.string().default(""),
    primary_channel: z.string(),
    why_this_channel: z.string(),
    angle: z.string(),
    unfair_advantage: z.string().default(""),
    growth_multiplier: z.string(),
    unlock_condition: z.string(),
    reversibility: z.string().default(""),
    evidence_used: z.array(z.string()).default([]),
    alternatives_rejected: z.array(z.string()).default([]),
    confidence: ConfidenceSchema.default(0.5),
}).passthrough();
export const VenueCardSchema = z.object({
    sales_venue: z.string(),
    entry_offer: z.string().default(""),
    core_offer: z.string().default(""),
    upsell_offer: z.string().default(""),
    trust_signal_needed: z.string().default(""),
    venue_risk: z.string().default(""),
    icp_drift_check: z.string().default(""),
    primary_cta: z.string().default(""),
}).passthrough();
export const SalesCopySchema = z.object({
    angle: z.string(),
    headline: z.string(),
    subheadline: z.string(),
    body: z.string(),
    cta: z.string(),
    objections: z.array(z.string()).default([]),
    followup_ladder: z.array(z.string()).default([]),
}).passthrough();
export const CopyReviewSchema = z.object({
    reviewed_at: z.string(),
    overall_score: z.number().int().min(0).max(100),
    ship_ready: z.boolean(),
    first_test_variant: z.string(),
    dimensions: z.array(z.object({
        name: z.string(),
        score: z.number().int().min(1).max(5),
        rationale: z.string(),
    })),
    failed_checks: z.array(z.string()).default([]),
    recommendations: z.array(z.string()).default([]),
}).passthrough();
export const MediaSpecSchema = z.object({
    artifact_type: z.enum(["hero_image", "social_video", "ad_creative", "carousel", "banner"]),
    style_spec: z.record(z.string(), z.any()),
});
export const EvidenceItemSchema = z.object({
    id: z.string(),
    source: z.string(),
    source_url: z.string().url().nullable().default(null),
    provider: z.string().nullable().default(null),
    provider_run_id: z.string().nullable().default(null),
    raw_payload_ref: z.string().nullable().default(null),
    source_type: SourceTypeSchema,
    kind: EvidenceKindSchema,
    claim: z.string(),
    observed_fact: z.boolean().default(true),
    relevance: z.string().default(""),
    strength: EvidenceStrengthSchema,
    collected_at: z.string(),
    stale_after_days: z.number().int().positive().default(30),
    notes: z.string().default(""),
});
export const ResearchChannelObservationSchema = z.object({
    channel: z.string(),
    confidence: ConfidenceSchema.default(0.7),
    observation_mode: ObservationModeSchema,
    source_provider: z.string().nullable().default(null),
    provider_run_id: z.string().nullable().default(null),
    icp_presence: ResearchDimensionSchema,
    trust_match: ResearchDimensionSchema,
    speed_to_signal: ResearchDimensionSchema,
    cost_to_test: ResearchDimensionSchema,
    founder_advantage: ResearchDimensionSchema,
    evidence_ids: z.array(z.string()).default([]),
    benchmark_key: z.string().nullable().default(null),
    notes: z.string().default(""),
});
export const ResearchVenueObservationSchema = z.object({
    venue: z.string(),
    confidence: ConfidenceSchema.default(0.7),
    observation_mode: ObservationModeSchema,
    source_provider: z.string().nullable().default(null),
    provider_run_id: z.string().nullable().default(null),
    trust_requirement_fit: ResearchDimensionSchema,
    checkout_fit: ResearchDimensionSchema,
    speed_to_launch: ResearchDimensionSchema,
    audience_match: ResearchDimensionSchema,
    evidence_ids: z.array(z.string()).default([]),
    notes: z.string().default(""),
});
export const ResearchProviderRunSchema = z.object({
    id: z.string(),
    provider: z.string(),
    interface: z.enum(RESEARCH_PROVIDER_INTERFACES),
    query: z.string(),
    result_count: z.number().int().nonnegative(),
    budget_used: z.number().nonnegative(),
    raw_payload_ref: z.string(),
    source_whitelist: z.array(z.string()).default([]),
    collected_at: z.string(),
});
export const ResearchMemoSchema = z.object({
    question: z.string(),
    provider_runs: z.array(ResearchProviderRunSchema).default([]),
    evidence_table: z.array(EvidenceItemSchema).default([]),
    competitors: z.array(z.string()).default([]),
    substitutes: z.array(z.string()).default([]),
    workflow_competitors: z.array(z.string()).default([]),
    attention_competitors: z.array(z.string()).default([]),
    channel_observations: z.array(ResearchChannelObservationSchema).default([]),
    venue_observations: z.array(ResearchVenueObservationSchema).default([]),
    trust_signals: z.array(z.string()).default([]),
    pricing_observations: z.array(z.string()).default([]),
    customer_language: z.array(z.string()).default([]),
    synthesis: z.string(),
    recommendation: z.string(),
    risks: z.array(z.string()).default([]),
    unknowns: z.array(z.string()).default([]),
    next_experiment: z.string(),
    updated_at: z.string(),
});
export const GraphEntityTypeSchema = z.enum([
    "icp_entity",
    "competitor_entity",
    "substitute_entity",
    "workflow_competitor_entity",
    "attention_competitor_entity",
    "channel_entity",
    "venue_entity",
    "thesis_revision",
    "signal_observation",
    "experiment",
    "trust_signal_expectation",
]);
export const GraphEdgeTypeSchema = z.enum([
    "targets_channel",
    "converts_at",
    "competes_for_attention",
    "replaces_workflow",
    "observed_in_signal",
    "tested_in_experiment",
    "expects_trust_signal",
    "validated_by_evidence",
    "records_revision",
]);
export const GraphProvenanceSchema = z.object({
    source_kind: z.enum(["snapshot_state", "captured_evidence"]),
    source_ref: z.string(),
    phase: PhaseSchema,
    recorded_at: z.string(),
    evidence_ids: z.array(z.string()).default([]),
    provider_run_ids: z.array(z.string()).default([]),
});
export const GraphNodeSchema = z.object({
    id: z.string(),
    entity_type: GraphEntityTypeSchema,
    label: z.string(),
    summary: z.string().default(""),
    attributes: z.record(z.string(), z.any()).default({}),
    provenance: z.array(GraphProvenanceSchema).default([]),
    first_seen_at: z.string(),
    last_seen_at: z.string(),
});
export const GraphEdgeSchema = z.object({
    id: z.string(),
    edge_type: GraphEdgeTypeSchema,
    from: z.string(),
    to: z.string(),
    label: z.string().default(""),
    attributes: z.record(z.string(), z.any()).default({}),
    provenance: z.array(GraphProvenanceSchema).default([]),
    first_seen_at: z.string(),
    last_seen_at: z.string(),
});
export const GraphSyncEntrySchema = z.object({
    id: z.string(),
    action: z.string(),
    phase: PhaseSchema,
    source_snapshot_version: z.string(),
    node_count: z.number().int().nonnegative(),
    edge_count: z.number().int().nonnegative(),
    recorded_at: z.string(),
});
export const VectorGraphMemorySchema = z.object({
    version: z.string(),
    updated_at: z.string(),
    nodes: z.array(GraphNodeSchema).default([]),
    edges: z.array(GraphEdgeSchema).default([]),
    sync_history: z.array(GraphSyncEntrySchema).default([]),
});
export const RequestRegistryEntrySchema = z.object({
    action: z.string(),
    response_text: z.string(),
    updated_at: z.string(),
});
export const ProductStateSchema = z.object({
    name: z.string().nullable().default(null),
    summary: z.string().nullable().default(null),
    price: z.string().nullable().default(null),
    live_status: LiveStatusSchema,
    category: z.string().nullable().default(null),
}).passthrough();
export const FourForcesSchema = z.object({
    push: z.string().nullable().default(null),
    pull: z.string().nullable().default(null),
    anxiety: z.string().nullable().default(null),
    habit: z.string().nullable().default(null),
}).passthrough();
export const ICPStateSchema = z.object({
    hypothesis: z.string().nullable().default(null),
    confirmed: z.boolean().default(false),
    who: z.string().nullable().default(null),
    problem: z.string().nullable().default(null),
    trigger_moment: z.string().nullable().default(null),
    desired_outcome: z.string().nullable().default(null),
    watering_holes: z.array(z.string()).default([]),
    wtp_signal: z.string().nullable().default(null),
    evidence: z.array(z.string()).default([]),
    drift_status: DriftStatusSchema,
    evidence_tags: z.object({
        who: EvidenceTagSchema,
        problem: EvidenceTagSchema,
        trigger_moment: EvidenceTagSchema,
        wtp_signal: EvidenceTagSchema,
        forces: EvidenceTagSchema,
    }).default({
        who: "speculative",
        problem: "speculative",
        trigger_moment: "speculative",
        wtp_signal: "speculative",
        forces: "speculative",
    }),
    confidence: ConfidenceLevelSchema.default("unknown"),
    top_unknown: z.string().nullable().default(null),
    next_experiment: z.string().nullable().default(null),
    forces: FourForcesSchema.default({
        push: null,
        pull: null,
        anxiety: null,
        habit: null,
    }),
}).passthrough();
export const MarketStateSchema = z.object({
    stage_confirmed: z.string().nullable().default(null),
    market_category: z.string().nullable().default(null),
    category_stance: z.string().nullable().default(null),
    competitor_map: z.object({
        direct: z.array(z.string()).default([]),
        substitutes: z.array(z.string()).default([]),
        workflow_competitors: z.array(z.string()).default([]),
        attention_competitors: z.array(z.string()).default([]),
    }).passthrough().default({
        direct: [],
        substitutes: [],
        workflow_competitors: [],
        attention_competitors: [],
    }),
    gold_zone_channels: z.array(z.string()).default([]),
    red_ocean: z.array(z.string()).default([]),
    white_space_notes: z.string().nullable().default(null),
    why_now_pressure: z.string().nullable().default(null),
    next_research_question: z.string().nullable().default(null),
    last_updated: z.string().nullable().default(null),
}).passthrough();
export const ChannelScoreRawSchema = z.object({
    icp_match: z.number().nullable().default(null),
    builder_advantage: z.number().nullable().default(null),
    speed_to_signal: z.number().nullable().default(null),
    cost_to_test: z.number().nullable().default(null),
    scalability: z.number().nullable().default(null),
}).passthrough();
export const DistributionStateSchema = z.object({
    channel_selected: z.string().nullable().default(null),
    channel_score: z.number().nullable().default(null),
    channel_score_raw: ChannelScoreRawSchema.nullable().default(null),
    venue_selected: z.string().nullable().default(null),
    primary_angle: z.string().nullable().default(null),
    growth_multiplier: z.string().nullable().default(null),
    growth_multiplier_type: z.string().nullable().default(null),
    unlock_condition: z.string().nullable().default(null),
    alternatives: z.array(z.string()).default([]),
}).passthrough();
export const ObjectionMapSchema = z.object({
    primary_objection: z.string().nullable().default(null),
    objection_type: z.string().nullable().default(null),
    copy_job: z.string().nullable().default(null),
    placement: z.string().nullable().default(null),
    secondary_objection: z.string().nullable().default(null),
}).passthrough();
export const RecoveryLogEntrySchema = z.object({
    milestone: z.string(),
    drift_type: z.string(),
    return_phase: PhaseSchema,
    correction_applied: z.string().nullable().default(null),
    date: z.string().nullable().default(null),
}).passthrough();
export const GatesSchema = z.object({
    intake_cleared: z.boolean().default(false),
    icp_cleared: z.boolean().default(false),
    market_cleared: z.boolean().default(false),
    channel_cleared: z.boolean().default(false),
    thesis_cleared: z.boolean().default(false),
    venue_cleared: z.boolean().default(false),
}).passthrough();
export const RoutingStateSchema = z.object({
    persona: PersonaSchema,
    mode: ModeSchema,
    platform: z.string().nullable().default(null),
    intent: z.string().nullable().default(null),
    last_router_reason: z.string().nullable().default(null),
}).passthrough();
export const ArtifactRegistryEntrySchema = z.object({
    title: z.string(),
    summary: z.string(),
    artifact_type: z.string(),
    phase: PhaseSchema,
    updated_at: z.string(),
    version: z.string().default(VECTOR_VERSION),
});
export const ArtifactRegistrySchema = z.object({
    intake_memo: ArtifactRegistryEntrySchema.nullable().default(null),
    icp_card: ArtifactRegistryEntrySchema.nullable().default(null),
    market_map: ArtifactRegistryEntrySchema.nullable().default(null),
    channel_scorecard: ArtifactRegistryEntrySchema.nullable().default(null),
    founder_edge_audit_result: ArtifactRegistryEntrySchema.nullable().default(null),
    thesis_card: ArtifactRegistryEntrySchema.nullable().default(null),
    venue_card: ArtifactRegistryEntrySchema.nullable().default(null),
    venue_scorecard: ArtifactRegistryEntrySchema.nullable().default(null),
    signal_ledger: ArtifactRegistryEntrySchema.nullable().default(null),
    research_memo: ArtifactRegistryEntrySchema.nullable().default(null),
    copy_pack: ArtifactRegistryEntrySchema.nullable().default(null),
    copy_review: ArtifactRegistryEntrySchema.nullable().default(null),
    objection_map: ArtifactRegistryEntrySchema.nullable().default(null),
    decision_memo: ArtifactRegistryEntrySchema.nullable().default(null),
    strategy_map: ArtifactRegistryEntrySchema.nullable().default(null),
}).passthrough();
export const ExperimentEntrySchema = z.object({
    when: z.string(),
    action: z.string(),
    note: z.string().default(""),
    phase: PhaseSchema.optional(),
    milestone: z.string().default(""),
    channel: z.string().default(""),
    venue: z.string().default(""),
    sample_size: z.number().int().nonnegative().nullable().default(null),
    green_count: z.number().int().nonnegative().nullable().default(null),
    yellow_count: z.number().int().nonnegative().nullable().default(null),
    red_count: z.number().int().nonnegative().nullable().default(null),
    drift_status: DriftStatusSchema.optional(),
    decision_impact: z.string().default(""),
    next_action: z.string().default(""),
});
export const ExperimentLedgerSchema = z.object({
    active: z.array(ExperimentEntrySchema).default([]),
    archived: z.array(ExperimentEntrySchema).default([]),
});
export const PlatformStateSchema = z.object({
    name: z.string().nullable().default(null),
    install_status: InstallStatusSchema,
    load_order_verified: z.boolean().default(false),
}).passthrough();
export const SessionStateSchema = z.object({
    schema_version: z.string(),
    kb_synced: z.boolean().default(false),
    last_sync: z.string().nullable().default(null),
    confidence_delta: z.number().nullable().default(null),
}).passthrough();
export const MetadataSchema = z.object({
    language: z.string().default("en"),
    notes_language: z.string().default("vi"),
    version: z.string().default(VECTOR_VERSION),
}).passthrough();
export const VectorStateSchema = z.object({
    version: z.string(),
    updated_at: z.string(),
    metadata: MetadataSchema,
    phase: PhaseSchema,
    milestone: MilestoneSchema,
    stage: StageSchema,
    icp_confirmed: z.boolean(),
    product_description: z.string().nullable(),
    product: ProductStateSchema,
    builder_background: z.string().nullable(),
    icp_hypothesis: z.string().nullable(),
    target_user: z.string().nullable(),
    job_statement: z.string().nullable(),
    riskiest_assumption: z.string().nullable(),
    market_memo: MarketMemoSchema.nullable(),
    market: MarketStateSchema,
    research_memo: ResearchMemoSchema.nullable(),
    request_registry: z.record(z.string(), RequestRegistryEntrySchema).default({}),
    founder_edge_audit: z.array(FounderEdgeAuditEntrySchema).default([]),
    channel_selected: z.string().nullable(),
    channel_scores: z.array(ChannelScoreSchema),
    venue_selected: z.string().nullable(),
    thesis_card: ThesisCardSchema.nullable(),
    venue_card: VenueCardSchema.nullable(),
    sales_copy: SalesCopySchema.nullable(),
    copy_review: CopyReviewSchema.nullable(),
    routing: RoutingStateSchema,
    artifact_registry: ArtifactRegistrySchema,
    experiment_ledger: ExperimentLedgerSchema,
    platform: PlatformStateSchema,
    session: SessionStateSchema,
    product_meta: z.object({
        category: z.string().nullable().default(null),
    }),
    icp: ICPStateSchema,
    distribution: DistributionStateSchema,
    objection_map: ObjectionMapSchema,
    recovery_log: z.array(RecoveryLogEntrySchema).default([]),
    gates: GatesSchema,
    confidence: z.object({
        current_phase: z.number().nullable().default(null),
        overall: ConfidenceLevelSchema,
    }).passthrough(),
    risk: z.object({
        riskiest_assumption: z.string().nullable().default(null),
        top_failure_mode: z.string().nullable().default(null),
        drift_status: DriftStatusSchema,
    }).passthrough(),
    logs: z.object({
        trauma: z.array(z.object({
            when: z.string(),
            what: z.string(),
            why_failed: z.string(),
            phase: PhaseSchema,
        })).default([]),
        decisions: z.array(z.object({
            when: z.string(),
            action: z.string(),
            note: z.string().default(""),
        })).default([]),
        questions_open: z.array(z.string()).default([]),
        processed_requests: z.array(z.string()).default([]),
    }).passthrough(),
    signals: z.object({
        green: z.array(SignalItemSchema),
        yellow: z.array(SignalItemSchema),
        red: z.array(SignalItemSchema),
    }).passthrough(),
    icp_drift: z.string(),
    trauma_log: z.array(z.object({
        when: z.string(),
        what: z.string(),
        why_failed: z.string(),
        phase: PhaseSchema,
    })),
    next_action: z.string().nullable(),
    history: z.array(z.object({
        when: z.string(),
        action: z.string(),
        note: z.string().default(""),
    }).passthrough()),
}).passthrough();
