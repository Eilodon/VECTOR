import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  allCapabilityToolsets,
  capabilityPolicy,
  listToolsetTools,
  resolveToolsets,
  type CapabilityToolset,
} from "./capability_contract.js";
import {
  ObservationModeSchema,
  RESEARCH_PROVIDER_INTERFACES,
  type RawSourcePayload,
} from "./research_provider_contract.js";
import {
  getSearchProvider,
  listSearchProviders,
  defaultSearchProviderId,
} from "./research_providers.js";
import {
  CHANNEL_BENCHMARK_LIBRARY,
  SOURCE_FRESHNESS_DAYS,
  evidenceFreshnessSummary,
  mergeResearchMemoFromProvider,
  researchChannelAdjustment,
  researchVenueAdjustment,
  staleAfterDaysFor,
  upsertChannelObservation,
} from "./research_runtime.js";
import {
  COPY_QA_CHECKLIST,
  COPY_VARIANT_FAMILIES,
  buildSalesCopyPack,
  reviewSalesCopyPack,
} from "./copy_runtime.js";
import {
  queryGraph,
  syncGraphFromState,
} from "./graph_memory_runtime.js";
import {
  WORKFLOW_MILESTONES,
  WORKFLOW_MODES,
  WORKFLOW_PHASES,
  WORKFLOW_STAGES,
  artifactKeyForAction,
  phasePolicy,
  toolPolicy,
} from "./workflow_contract.js";

/**
 * VECTOR MCP Server v2.0.0
 * Capability-scoped, evidence-first GTM runtime.
 */
const VECTOR_VERSION = "2.0.0";
type Phase = z.infer<typeof PhaseSchema>;
type Metadata = Record<string, unknown>;
export interface VectorStateStore {
  load(): Promise<Partial<VectorState> | null>;
  save(state: VectorState): Promise<void>;
  saveBackup?(state: VectorState, previousPhase: Phase, nextPhase: Phase): Promise<void>;
  restoreLatestBackup?(): Promise<{ label: string; state: VectorState } | null>;
}
export interface VectorGraphStore {
  load(): Promise<Partial<VectorGraphMemory> | null>;
  save(graph: VectorGraphMemory): Promise<void>;
}
export interface VectorRuntimeOptions {
  version?: string;
  serverName?: string;
  runtimeLabel?: string;
  stateStore: VectorStateStore;
  graphStore: VectorGraphStore;
  capabilityMode?: {
    toolsets?: string[] | undefined;
    safeMode?: boolean | undefined;
  };
  readKbContent?: () => Promise<string | null>;
  telemetry?: (event: string, meta: Metadata) => Promise<void>;
  logger?: Pick<Console, "error" | "warn">;
}
const PhaseSchema = z.enum(WORKFLOW_PHASES);
const MilestoneSchema = z.enum(WORKFLOW_MILESTONES);
const StageSchema = z.enum(WORKFLOW_STAGES).nullable().default(null);
const LiveStatusSchema = z.enum(["live", "prelaunch", "in-dev", "unknown"]).default("unknown");
const ConfidenceLevelSchema = z.enum(["low", "medium", "high", "unknown"]).default("unknown");
const DriftStatusSchema = z.enum(["unknown", "confirmed", "narrowed", "changed", "observed"]).default("unknown");
const ModeSchema = z.enum(WORKFLOW_MODES).default("quick_start");
const PersonaSchema = z.enum(["prelaunch_builder", "active_founder", "scaling_team", "audit_user", "unknown"]).default("unknown");
const InstallStatusSchema = z.enum(["unknown", "pending", "installed", "verified", "failed"]).default("unknown");
const EvidenceTagSchema = z.enum(["observed", "inferred", "benchmarked", "speculative"]).default("speculative");
const EvidenceStrengthSchema = z.enum(["weak", "medium", "strong"]).default("medium");
const SourceTypeSchema = z.enum([
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
const EvidenceKindSchema = z.enum([
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
const ConfidenceSchema = z.number().min(0).max(1);
const ResearchDimensionSchema = z.number().int().min(-2).max(2).default(0);
const SignalItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  source: z.string().default("manual"),
  confidence: ConfidenceSchema.default(0.5),
  notes: z.string().default(""),
  created_at: z.string(),
});
const ChannelScoreSchema = z.object({
  channel: z.string(),
  score: z.number().min(0).max(100),
  confidence: ConfidenceSchema.default(0.5),
  reason: z.string(),
  evidence: z.array(z.string()).default([]),
  risk: z.string().default(""),
  next_test: z.string().default(""),
});
const FounderEdgeAuditEntrySchema = z.object({
  channel: z.string(),
  network_presence: z.boolean().nullable().default(null),
  track_record: z.boolean().nullable().default(null),
  credibility_recognizable: z.boolean().nullable().default(null),
  speed_advantage: z.boolean().nullable().default(null),
  warm_door_opener: z.boolean().nullable().default(null),
  score: z.number().int().min(0).max(5).nullable().default(null),
  notes: z.string().default(""),
});
const MarketMemoSchema = z.object({
  competitors: z.array(z.string()).default([]),
  substitutes: z.array(z.string()).default([]),
  workflow_competitors: z.array(z.string()).default([]),
  attention_competitors: z.array(z.string()).default([]),
  white_space: z.array(z.string()).default([]),
  unresolved_unknowns: z.array(z.string()).default([]),
});
const ThesisCardSchema = z.object({
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
const VenueCardSchema = z.object({
  sales_venue: z.string(),
  entry_offer: z.string().default(""),
  core_offer: z.string().default(""),
  upsell_offer: z.string().default(""),
  trust_signal_needed: z.string().default(""),
  venue_risk: z.string().default(""),
  icp_drift_check: z.string().default(""),
  primary_cta: z.string().default(""),
}).passthrough();
const SalesCopySchema = z.object({
  angle: z.string(),
  headline: z.string(),
  subheadline: z.string(),
  body: z.string(),
  cta: z.string(),
  objections: z.array(z.string()).default([]),
  followup_ladder: z.array(z.string()).default([]),
}).passthrough();
const CopyReviewSchema = z.object({
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
const MediaSpecSchema = z.object({
  artifact_type: z.enum(["hero_image", "social_video", "ad_creative", "carousel", "banner"]),
  style_spec: z.record(z.string(), z.any()),
});
const EvidenceItemSchema = z.object({
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
const ResearchChannelObservationSchema = z.object({
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
const ResearchVenueObservationSchema = z.object({
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
const ResearchProviderRunSchema = z.object({
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
const ResearchMemoSchema = z.object({
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
const GraphEntityTypeSchema = z.enum([
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
const GraphEdgeTypeSchema = z.enum([
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
const GraphProvenanceSchema = z.object({
  source_kind: z.enum(["snapshot_state", "captured_evidence"]),
  source_ref: z.string(),
  phase: PhaseSchema,
  recorded_at: z.string(),
  evidence_ids: z.array(z.string()).default([]),
  provider_run_ids: z.array(z.string()).default([]),
});
const GraphNodeSchema = z.object({
  id: z.string(),
  entity_type: GraphEntityTypeSchema,
  label: z.string(),
  summary: z.string().default(""),
  attributes: z.record(z.string(), z.any()).default({}),
  provenance: z.array(GraphProvenanceSchema).default([]),
  first_seen_at: z.string(),
  last_seen_at: z.string(),
});
const GraphEdgeSchema = z.object({
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
const GraphSyncEntrySchema = z.object({
  id: z.string(),
  action: z.string(),
  phase: PhaseSchema,
  source_snapshot_version: z.string(),
  node_count: z.number().int().nonnegative(),
  edge_count: z.number().int().nonnegative(),
  recorded_at: z.string(),
});
const VectorGraphMemorySchema = z.object({
  version: z.string(),
  updated_at: z.string(),
  nodes: z.array(GraphNodeSchema).default([]),
  edges: z.array(GraphEdgeSchema).default([]),
  sync_history: z.array(GraphSyncEntrySchema).default([]),
});
const RequestRegistryEntrySchema = z.object({
  action: z.string(),
  response_text: z.string(),
  updated_at: z.string(),
});
const ProductStateSchema = z.object({
  name: z.string().nullable().default(null),
  summary: z.string().nullable().default(null),
  price: z.string().nullable().default(null),
  live_status: LiveStatusSchema,
  category: z.string().nullable().default(null),
}).passthrough();
const FourForcesSchema = z.object({
  push: z.string().nullable().default(null),
  pull: z.string().nullable().default(null),
  anxiety: z.string().nullable().default(null),
  habit: z.string().nullable().default(null),
}).passthrough();
const ICPStateSchema = z.object({
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
const MarketStateSchema = z.object({
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
const ChannelScoreRawSchema = z.object({
  icp_match: z.number().nullable().default(null),
  builder_advantage: z.number().nullable().default(null),
  speed_to_signal: z.number().nullable().default(null),
  cost_to_test: z.number().nullable().default(null),
  scalability: z.number().nullable().default(null),
}).passthrough();
const DistributionStateSchema = z.object({
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
const ObjectionMapSchema = z.object({
  primary_objection: z.string().nullable().default(null),
  objection_type: z.string().nullable().default(null),
  copy_job: z.string().nullable().default(null),
  placement: z.string().nullable().default(null),
  secondary_objection: z.string().nullable().default(null),
}).passthrough();
const RecoveryLogEntrySchema = z.object({
  milestone: z.string(),
  drift_type: z.string(),
  return_phase: PhaseSchema,
  correction_applied: z.string().nullable().default(null),
  date: z.string().nullable().default(null),
}).passthrough();
const GatesSchema = z.object({
  intake_cleared: z.boolean().default(false),
  icp_cleared: z.boolean().default(false),
  market_cleared: z.boolean().default(false),
  channel_cleared: z.boolean().default(false),
  thesis_cleared: z.boolean().default(false),
  venue_cleared: z.boolean().default(false),
}).passthrough();
const RoutingStateSchema = z.object({
  persona: PersonaSchema,
  mode: ModeSchema,
  platform: z.string().nullable().default(null),
  intent: z.string().nullable().default(null),
  last_router_reason: z.string().nullable().default(null),
}).passthrough();
const ArtifactRegistryEntrySchema = z.object({
  title: z.string(),
  summary: z.string(),
  artifact_type: z.string(),
  phase: PhaseSchema,
  updated_at: z.string(),
  version: z.string().default(VECTOR_VERSION),
});
const ArtifactRegistrySchema = z.object({
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
const ExperimentEntrySchema = z.object({
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
const ExperimentLedgerSchema = z.object({
  active: z.array(ExperimentEntrySchema).default([]),
  archived: z.array(ExperimentEntrySchema).default([]),
});
const PlatformStateSchema = z.object({
  name: z.string().nullable().default(null),
  install_status: InstallStatusSchema,
  load_order_verified: z.boolean().default(false),
}).passthrough();
const SessionStateSchema = z.object({
  schema_version: z.string(),
  kb_synced: z.boolean().default(false),
  last_sync: z.string().nullable().default(null),
  confidence_delta: z.number().nullable().default(null),
}).passthrough();
const MetadataSchema = z.object({
  language: z.string().default("en"),
  notes_language: z.string().default("vi"),
  version: z.string().default(VECTOR_VERSION),
}).passthrough();
const VectorStateSchema = z.object({
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
type VectorState = z.infer<typeof VectorStateSchema>;
type VectorGraphMemory = z.infer<typeof VectorGraphMemorySchema>;
type SignalItem = z.infer<typeof SignalItemSchema>;
type ChannelScore = z.infer<typeof ChannelScoreSchema>;
type Artifact = {
  title: string;
  summary: string;
  decisions: string[];
  next_actions: string[];
  state_delta: Record<string, unknown>;
  payload: unknown;
};
type ResumeReconciliation = {
  state: VectorState;
  notes: string[];
};
type ToolTextResponse = { content: Array<{ type: "text"; text: string }> };
type VectorToolDefinition = {
  name: string;
  config: { description: string; inputSchema: Record<string, z.ZodTypeAny> };
  handler: (args: any) => Promise<ToolTextResponse>;
};
export type VectorRuntimeInstance = {
  initialize(): Promise<VectorState>;
  connect(transport: Transport): Promise<void>;
  getServer(): McpServer;
  getState(): VectorState;
  getGraphMemory(): VectorGraphMemory;
  getCapabilityMode(): { toolsets: CapabilityToolset[]; safeMode: boolean };
  roleHints(): string;
};
export function createVectorRuntime(initialOptions: VectorRuntimeOptions): VectorRuntimeInstance {
let CURRENT_VERSION = VECTOR_VERSION;
let VECTOR_STATE: VectorState = defaultState();
let GRAPH_MEMORY: VectorGraphMemory = { version: CURRENT_VERSION, updated_at: new Date(0).toISOString(), nodes: [], edges: [], sync_history: [] };
let RUNTIME: VectorRuntimeOptions;
let SERVER = new McpServer({
  name: "vector-gtm-os",
  version: CURRENT_VERSION,
});
let CAPABILITY_STATE: { toolsets: CapabilityToolset[]; safeMode: boolean } = {
  toolsets: allCapabilityToolsets(),
  safeMode: false,
};
const TOOL_DEFINITIONS: VectorToolDefinition[] = [];
const PHASE_TO_MILESTONE = Object.fromEntries(
  WORKFLOW_PHASES.map((phase) => [phase, phasePolicy(phase).milestone]),
) as Record<z.infer<typeof PhaseSchema>, z.infer<typeof MilestoneSchema>>;
function now(): string {
  return new Date().toISOString();
}
function phaseToStage(phase: z.infer<typeof PhaseSchema>): z.infer<typeof StageSchema> {
  return phasePolicy(phase).stage;
}
function stageToCurrentPhaseConfidence(phase: z.infer<typeof PhaseSchema>): number {
  return phasePolicy(phase).phase_confidence;
}
function inferModeForPhase(phase: z.infer<typeof PhaseSchema>): z.infer<typeof ModeSchema> {
  return phasePolicy(phase).default_mode;
}
function defaultArtifactRegistry(): z.infer<typeof ArtifactRegistrySchema> {
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
function defaultRouting(phase: z.infer<typeof PhaseSchema> = "intake"): z.infer<typeof RoutingStateSchema> {
  return {
    persona: "unknown",
    mode: inferModeForPhase(phase),
    platform: null,
    intent: null,
    last_router_reason: null,
  };
}
function defaultProduct(): z.infer<typeof ProductStateSchema> {
  return {
    name: null,
    summary: null,
    price: null,
    live_status: "unknown",
    category: null,
  };
}
function defaultICP(): z.infer<typeof ICPStateSchema> {
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
function defaultMarket(): z.infer<typeof MarketStateSchema> {
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
function defaultDistribution(): z.infer<typeof DistributionStateSchema> {
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
function defaultObjectionMap(): z.infer<typeof ObjectionMapSchema> {
  return {
    primary_objection: null,
    objection_type: null,
    copy_job: null,
    placement: null,
    secondary_objection: null,
  };
}
function defaultGates(): z.infer<typeof GatesSchema> {
  return {
    intake_cleared: false,
    icp_cleared: false,
    market_cleared: false,
    channel_cleared: false,
    thesis_cleared: false,
    venue_cleared: false,
  };
}
function computeFounderEdgeScore(entry: Omit<z.infer<typeof FounderEdgeAuditEntrySchema>, "score">): number {
  return [
    entry.network_presence,
    entry.track_record,
    entry.credibility_recognizable,
    entry.speed_advantage,
    entry.warm_door_opener,
  ].filter((value) => value === true).length;
}
function upsertFounderEdgeAudit(
  audits: z.infer<typeof FounderEdgeAuditEntrySchema>[],
  entry: z.infer<typeof FounderEdgeAuditEntrySchema>,
): z.infer<typeof FounderEdgeAuditEntrySchema>[] {
  const next = audits.filter((item) => item.channel.toLowerCase() !== entry.channel.toLowerCase());
  next.push(entry);
  return next;
}
function founderEdgeAuditFor(channel: string): z.infer<typeof FounderEdgeAuditEntrySchema> | null {
  const normalized = channel.toLowerCase();
  return VECTOR_STATE.founder_edge_audit.find((item) => item.channel.toLowerCase() === normalized) ?? null;
}
function defaultPlatform(): z.infer<typeof PlatformStateSchema> {
  return { name: null, install_status: "unknown", load_order_verified: false };
}
function defaultSession(): z.infer<typeof SessionStateSchema> {
  return {
    schema_version: CURRENT_VERSION,
    kb_synced: false,
    last_sync: null,
    confidence_delta: null,
  };
}
function defaultState(): VectorState {
  return {
    version: CURRENT_VERSION,
    updated_at: now(),
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
    metadata: { language: "en", notes_language: "vi", version: CURRENT_VERSION },
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
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function sanitizeRecursive(value: unknown, depth = 0): unknown {
  const banned = [
    "ignore previous instructions",
    "ignore all previous instructions",
    "system prompt",
    "developer message",
    "override",
    "disregard",
    "jailbreak",
    "reveal chain of thought",
    "tool output",
    "hidden instruction",
  ];
  if (depth > 20) {
    throw new Error("Input nesting is too deep.");
  }
  if (typeof value === "string") {
    if (value.length > 20000) {
      throw new Error("Input string is too long.");
    }
    const lower = value.toLowerCase();
    for (const keyword of banned) {
      if (lower.includes(keyword)) {
        throw new Error(`Prompt injection detected: forbidden phrase '${keyword}'.`);
      }
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 500) {
      throw new Error("Input array is too large.");
    }
    return value.map((item) => sanitizeRecursive(item, depth + 1));
  }
  if (isObject(value)) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") continue; // Prevent Prototype Pollution
      cleaned[key] = sanitizeRecursive(val, depth + 1);
    }
    return cleaned;
  }
  return value;
}
function coalesceString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
function mergeArtifactRegistry(base: z.infer<typeof ArtifactRegistrySchema>, action: string, artifact: Artifact, phase: z.infer<typeof PhaseSchema>): z.infer<typeof ArtifactRegistrySchema> {
  const entry = {
    title: artifact.title,
    summary: artifact.summary,
    artifact_type: action,
    phase,
    updated_at: now(),
    version: CURRENT_VERSION,
  } satisfies z.infer<typeof ArtifactRegistryEntrySchema>;
  const key = artifactKeyForAction(action);
  if (!key) return base;
  return { ...base, [key]: entry };
}
function syncCanonicalViews(state: Partial<VectorState>): VectorState {
  const phase = state.phase ?? VECTOR_STATE.phase ?? "intake";
  const stage = state.stage ?? phaseToStage(phase);
  const routing = {
    ...(VECTOR_STATE.routing ?? defaultRouting(phase)),
    ...(state.routing ?? {}),
    mode: state.routing?.mode ?? inferModeForPhase(phase),
    persona: state.routing?.persona ?? VECTOR_STATE.routing?.persona ?? "unknown",
    platform: state.routing?.platform ?? VECTOR_STATE.routing?.platform ?? null,
    intent: state.routing?.intent ?? VECTOR_STATE.routing?.intent ?? null,
    last_router_reason: state.routing?.last_router_reason ?? VECTOR_STATE.routing?.last_router_reason ?? null,
  } satisfies z.infer<typeof RoutingStateSchema>;

  const product = {
    ...(VECTOR_STATE.product ?? defaultProduct()),
    ...(state.product ?? {}),
    name: state.product?.name ?? coalesceString(state.product_description),
    summary: state.product?.summary ?? coalesceString(state.product_description),
    price: state.product?.price ?? null,
    live_status: state.product?.live_status ?? VECTOR_STATE.product?.live_status ?? "unknown",
    category: state.product?.category ?? VECTOR_STATE.product?.category ?? state.product_meta?.category ?? null,
  } satisfies z.infer<typeof ProductStateSchema>;

  const icp = {
    ...(VECTOR_STATE.icp ?? defaultICP()),
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
    drift_status: state.icp?.drift_status ?? (state.icp_drift as z.infer<typeof DriftStatusSchema>) ?? "unknown",
  } satisfies z.infer<typeof ICPStateSchema>;

  const market = {
    ...(VECTOR_STATE.market ?? defaultMarket()),
    ...(state.market ?? {}),
    competitor_map: {
      ...(VECTOR_STATE.market?.competitor_map ?? defaultMarket().competitor_map),
      ...(state.market?.competitor_map ?? {}),
    },
  } satisfies z.infer<typeof MarketStateSchema>;

  const distribution = {
    ...(VECTOR_STATE.distribution ?? defaultDistribution()),
    ...(state.distribution ?? {}),
    channel_selected: state.distribution?.channel_selected ?? state.channel_selected ?? null,
    channel_score: state.distribution?.channel_score
      ?? state.channel_scores?.[0]?.score
      ?? VECTOR_STATE.distribution?.channel_score
      ?? null,
    channel_score_raw: state.distribution?.channel_score_raw ?? VECTOR_STATE.distribution?.channel_score_raw ?? null,
    venue_selected: state.distribution?.venue_selected ?? state.venue_selected ?? null,
    primary_angle: state.distribution?.primary_angle ?? state.thesis_card?.angle ?? null,
    growth_multiplier: state.distribution?.growth_multiplier ?? state.thesis_card?.growth_multiplier ?? null,
    growth_multiplier_type: state.distribution?.growth_multiplier_type ?? VECTOR_STATE.distribution?.growth_multiplier_type ?? null,
    unlock_condition: state.distribution?.unlock_condition ?? state.thesis_card?.unlock_condition ?? VECTOR_STATE.distribution?.unlock_condition ?? null,
    alternatives: state.distribution?.alternatives ?? state.thesis_card?.alternatives_rejected ?? [],
  } satisfies z.infer<typeof DistributionStateSchema>;

  const objection_map = {
    ...(VECTOR_STATE.objection_map ?? defaultObjectionMap()),
    ...(state.objection_map ?? {}),
  } satisfies z.infer<typeof ObjectionMapSchema>;

  const gates = {
    ...(VECTOR_STATE.gates ?? defaultGates()),
    ...(state.gates ?? {}),
  } satisfies z.infer<typeof GatesSchema>;

  const risk = {
    riskiest_assumption: state.risk?.riskiest_assumption ?? state.riskiest_assumption ?? null,
    top_failure_mode: state.risk?.top_failure_mode ?? null,
    drift_status: state.risk?.drift_status ?? (state.icp_drift as z.infer<typeof DriftStatusSchema>) ?? "unknown",
  } satisfies z.infer<typeof VectorStateSchema>["risk"];

  const logs = {
    trauma: state.logs?.trauma ?? state.trauma_log ?? [],
    decisions: state.logs?.decisions ?? state.history ?? [],
    questions_open: state.logs?.questions_open ?? [],
    processed_requests: state.logs?.processed_requests ?? VECTOR_STATE.logs?.processed_requests ?? [],
  } satisfies z.infer<typeof VectorStateSchema>["logs"];

  const confidence = {
    current_phase: state.confidence?.current_phase ?? stageToCurrentPhaseConfidence(phase),
    overall: state.confidence?.overall ?? "unknown",
  } satisfies z.infer<typeof VectorStateSchema>["confidence"];

  const platform = {
    ...(VECTOR_STATE.platform ?? defaultPlatform()),
    ...(state.platform ?? {}),
    name: state.platform?.name ?? VECTOR_STATE.platform?.name ?? null,
  } satisfies z.infer<typeof PlatformStateSchema>;

  const session = {
    ...(VECTOR_STATE.session ?? defaultSession()),
    ...(state.session ?? {}),
    schema_version: state.session?.schema_version ?? CURRENT_VERSION,
  } satisfies z.infer<typeof SessionStateSchema>;

  const nextState = {
    ...defaultState(),
    ...VECTOR_STATE,
    ...state,
    phase,
    metadata: state.metadata ?? VECTOR_STATE.metadata ?? { language: "en", notes_language: "vi", version: CURRENT_VERSION },
    milestone: state.milestone ?? PHASE_TO_MILESTONE[phase],
    stage,
    routing,
    product,
    icp,
    market,
    distribution,
    objection_map,
    recovery_log: state.recovery_log ?? VECTOR_STATE.recovery_log ?? [],
    gates,
    risk,
    logs,
    confidence,
    platform,
    session,
    research_memo: state.research_memo ?? VECTOR_STATE.research_memo ?? null,
    request_registry: state.request_registry ?? VECTOR_STATE.request_registry ?? {},
    founder_edge_audit: state.founder_edge_audit ?? VECTOR_STATE.founder_edge_audit ?? [],
    copy_review: state.copy_review ?? VECTOR_STATE.copy_review ?? null,
    artifact_registry: state.artifact_registry ?? VECTOR_STATE.artifact_registry ?? defaultArtifactRegistry(),
    experiment_ledger: state.experiment_ledger ?? VECTOR_STATE.experiment_ledger ?? { active: [], archived: [] },
    product_meta: state.product_meta ?? { category: product.category ?? null },
    updated_at: state.updated_at ?? now(),
    icp_drift: state.icp_drift ?? (risk.drift_status as string),
    trauma_log: state.trauma_log ?? logs.trauma,
    history: state.history ?? logs.decisions,
  } satisfies VectorState;

  return VectorStateSchema.parse(nextState);
}
async function loadState(): Promise<VectorState> {
  const loaded = await RUNTIME.stateStore.load();
  if (!loaded) {
    return defaultState();
  }
  try {
    const reconciled = reconcileSessionState(syncCanonicalViews(loaded));
    if (reconciled.notes.length) {
      void RUNTIME.telemetry?.("session_reconciled_on_load", {
        notes: reconciled.notes,
        phase: reconciled.state.phase,
      });
    }
    return reconciled.state;
  } catch (error) {
    RUNTIME.logger?.error("Failed to load state, falling back to default:", error);
    return defaultState();
  }
}
function defaultGraphMemory(): VectorGraphMemory {
  return {
    version: CURRENT_VERSION,
    updated_at: now(),
    nodes: [],
    edges: [],
    sync_history: [],
  };
}
async function loadGraphMemory(): Promise<VectorGraphMemory> {
  const loaded = await RUNTIME.graphStore.load();
  if (!loaded) {
    return defaultGraphMemory();
  }
  try {
    return VectorGraphMemorySchema.parse({
      ...defaultGraphMemory(),
      ...loaded,
      version: CURRENT_VERSION,
      updated_at: (loaded as Partial<VectorGraphMemory>).updated_at ?? now(),
    });
  } catch (error) {
    RUNTIME.logger?.error("Failed to load graph memory, falling back to empty graph:", error);
    return defaultGraphMemory();
  }
}
async function saveState(nextState: VectorState): Promise<void> {
  await RUNTIME.stateStore.save(nextState);
}
async function saveGraphMemory(nextGraph: VectorGraphMemory): Promise<void> {
  GRAPH_MEMORY = VectorGraphMemorySchema.parse({
    ...nextGraph,
    version: CURRENT_VERSION,
    updated_at: now(),
  });
  await RUNTIME.graphStore.save(GRAPH_MEMORY);
}
function appendHistory(action: string, note = ""): void {
  VECTOR_STATE.history = [
    ...VECTOR_STATE.history,
    { when: now(), action, note },
  ].slice(-200);
}
let _commitQueue: Promise<void> = Promise.resolve();
async function commitState(nextState: VectorState, action: string, note = ""): Promise<VectorState> {
  const run = async (): Promise<VectorState> => {
    const previousPhase = VECTOR_STATE.phase;
    const validated = syncCanonicalViews({
      ...nextState,
      version: CURRENT_VERSION,
      updated_at: now(),
    });
    VECTOR_STATE = validated;
    appendHistory(action, note);
    VECTOR_STATE.logs = {
      ...(VECTOR_STATE.logs ?? { trauma: [], decisions: [], questions_open: [], processed_requests: [] }),
      decisions: VECTOR_STATE.history,
      trauma: VECTOR_STATE.trauma_log,
    };
    VECTOR_STATE.history = VECTOR_STATE.history.slice(-200);
    await saveState(VECTOR_STATE);
    if (action !== "vector_graph_sync" && action !== "vector_graph_query") {
      try {
        const nextGraph = VectorGraphMemorySchema.parse(
          syncGraphFromState(VECTOR_STATE, GRAPH_MEMORY, `auto:${action}`, now()),
        );
        await saveGraphMemory(nextGraph);
      } catch (e) {
        RUNTIME.logger?.warn("Failed to auto-sync advisory graph memory:", e);
      }
    }
    
    if (previousPhase !== VECTOR_STATE.phase) {
      try {
        await RUNTIME.stateStore.saveBackup?.(VECTOR_STATE, previousPhase, VECTOR_STATE.phase);
      } catch (e) {
        RUNTIME.logger?.warn("Failed to write snapshot backup:", e);
      }
    }

    // Log Observability
    void RUNTIME.telemetry?.("tool_invocation_completed", { action, phase: VECTOR_STATE.phase, stage: VECTOR_STATE.stage });

    return VECTOR_STATE;
  };
  const result = _commitQueue.then(run, run);
  _commitQueue = result.then(() => undefined, () => undefined);
  return result;
}
function ensurePhaseAllowed(expected: z.infer<typeof PhaseSchema>[]): void {
  if (!expected.includes(VECTOR_STATE.phase)) {
    throw new Error(
      `Phase guard failed. Current phase is '${VECTOR_STATE.phase}', but this tool expects one of: ${expected.join(", ")}.`
    );
  }
}
function ensureToolPhase(toolName: string): void {
  const policy = toolPolicy(toolName);
  if (!policy) {
    throw new Error(`Tool policy is missing for '${toolName}'.`);
  }
  ensurePhaseAllowed([...policy.entry_phases] as z.infer<typeof PhaseSchema>[]);
}
function requireShipReadyCopyReview(): z.infer<typeof CopyReviewSchema> {
  if (!VECTOR_STATE.sales_copy) {
    throw new Error("Ship-facing outputs require an existing sales_copy artifact. Run vector_sales_copy first.");
  }
  if (!VECTOR_STATE.copy_review) {
    throw new Error("Ship-facing outputs require vector_copy_review before render or launch.");
  }
  if (!VECTOR_STATE.copy_review.ship_ready) {
    throw new Error("Current copy_review is not ship-ready. Revise the copy pack and rerun vector_copy_review before rendering ship-facing assets.");
  }
  return VECTOR_STATE.copy_review;
}
function validatePhaseTransition(nextPhase?: z.infer<typeof PhaseSchema>): void {
  if (!nextPhase || nextPhase === VECTOR_STATE.phase) return;
  const allowed = phasePolicy(VECTOR_STATE.phase).allowed_next;
  if (!allowed.includes(nextPhase)) {
    throw new Error(
      `Illegal phase transition: ${VECTOR_STATE.phase} -> ${nextPhase}. Allowed next phases: ${allowed.join(", ") || "none"}.`
    );
  }
}
function roleHints(): string {
  return [
    "Install VECTOR as the runtime, not as a read-only doc set.",
    "Always preserve evidence provenance in downstream artifacts.",
    "Do not skip phase guards unless the server explicitly routes you into recovery.",
  ].join("\n");
}
function payloadObject(payload: unknown): Record<string, unknown> {
  return isObject(payload) ? payload : { value: payload };
}
function withRequestSchema<T extends Record<string, z.ZodTypeAny>>(shape: T): T & { request_id: z.ZodOptional<z.ZodString> } {
  return {
    request_id: z.string().min(8).max(128).regex(/^[a-zA-Z0-9:_-]+$/).optional().describe("Optional request id for idempotent retries."),
    ...shape,
  };
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
async function cacheRequestResponse(requestId: string, action: string, response: ToolTextResponse): Promise<void> {
  const responseText = response.content.map((item) => item.text).join("\n\n");
  VECTOR_STATE = syncCanonicalViews({
    ...VECTOR_STATE,
    request_registry: {
      ...(VECTOR_STATE.request_registry ?? {}),
      [requestId]: {
        action,
        response_text: responseText,
        updated_at: now(),
      },
    },
    logs: {
      ...(VECTOR_STATE.logs ?? { trauma: [], decisions: [], questions_open: [], processed_requests: [] }),
      processed_requests: [...(VECTOR_STATE.logs?.processed_requests ?? []), requestId].slice(-500),
    },
  });
  await saveState(VECTOR_STATE);
}
function withIdempotency(action: string, handler: (args: any) => Promise<ToolTextResponse>) {
  return async (args: any): Promise<ToolTextResponse> => {
    // [ADR-001] Concurrency Lock: Reload state from disk before executing tool 
    try {
      const latestState = await RUNTIME.stateStore.load();
      if (latestState) {
        VECTOR_STATE = syncCanonicalViews(latestState as VectorState);
      }
    } catch (e) {
      RUNTIME.logger?.warn("Concurrency hook failed to load state:", e);
    }

    const requestId = extractRequestId(args);
    if (requestId) {
      const cached = VECTOR_STATE.request_registry?.[requestId];
      if (cached && cached.action === action) {
        return { content: [{ type: "text", text: cached.response_text }] };
      }
    }
    const response = await handler(stripRequestId(args));
    if (requestId) {
      await cacheRequestResponse(requestId, action, response);
    }
    return response;
  };
}
function registerVectorTool(
  name: string,
  config: { description: string; inputSchema: Record<string, z.ZodTypeAny> },
  handler: (args: any) => Promise<ToolTextResponse>,
): void {
  TOOL_DEFINITIONS.push({ name, config, handler });
}
function capabilityModeText(): string {
  return `${CAPABILITY_STATE.toolsets.join(", ")} | safe_mode=${CAPABILITY_STATE.safeMode ? "on" : "off"}`;
}
function createServer(): McpServer {
  return new McpServer({
    name: RUNTIME.serverName ?? "vector-gtm-os",
    version: CURRENT_VERSION,
  });
}
function registerRuntimeTools(): void {
  SERVER = createServer();
  const enabledToolsets = new Set(CAPABILITY_STATE.toolsets);
  for (const definition of TOOL_DEFINITIONS) {
    const policy = capabilityPolicy(definition.name);
    if (!policy) {
      throw new Error(`Capability policy is missing for '${definition.name}'.`);
    }
    if (!enabledToolsets.has(policy.toolset)) {
      continue;
    }
    SERVER.registerTool(
      definition.name,
      {
        ...definition.config,
        inputSchema: withRequestSchema(definition.config.inputSchema),
      },
      withIdempotency(definition.name, async (args: any) => {
        if (CAPABILITY_STATE.safeMode && policy.safe_mode_blocked) {
          throw new Error(`safe_mode blocks '${definition.name}' because it mutates admin state.`);
        }
        return definition.handler(args);
      }),
    );
  }
}
function artifactToText(artifact: Artifact): string {
  return [
    `# ${artifact.title}`,
    "",
    `## Summary`,
    artifact.summary,
    "",
    `## Decisions` ,
    ...artifact.decisions.map((item) => `- ${item}`),
    "",
    `## Next actions` ,
    ...artifact.next_actions.map((item) => `- ${item}`),
    "",
    `## State delta` ,
    "```json",
    JSON.stringify(artifact.state_delta, null, 2),
    "```",
    "",
    `## Payload` ,
    "```json",
    JSON.stringify(artifact.payload, null, 2),
    "```",
  ].join("\n");
}
function signalItem(label: string, source = "manual", confidence = 0.7, notes = ""): SignalItem {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    label,
    source,
    confidence,
    notes,
    created_at: now(),
  };
}
function scoreChannel(channel: string, stageHint?: string, researchMemo?: z.infer<typeof ResearchMemoSchema> | null): ChannelScore {
  const normalized = channel.toLowerCase();
  const heuristics: Record<string, Partial<ChannelScore>> = {
    "cold email": { score: 84, confidence: 0.78, reason: "Fast feedback, direct personalization, low tooling dependency.", risk: "Needs strong list quality and message relevance.", next_test: "Send 20 tightly targeted emails." },
    email: { score: 82, confidence: 0.75, reason: "Reusable once the ICP is known; strong for founder-led outbound.", risk: "Deliverability and list hygiene matter.", next_test: "Run a 20-account precision sequence." },
    linkedin: { score: 78, confidence: 0.72, reason: "High trust when the ICP is founder/operator or B2B buyer.", risk: "Content or network fatigue if overused.", next_test: "Publish one problem-aware post and 10 DMs." },
    community: { score: 80, confidence: 0.7, reason: "Great when the ICP already congregates in a known ecosystem.", risk: "Needs presence before conversion.", next_test: "Pick one community and test 3 contribution loops." },
    content: { score: 74, confidence: 0.68, reason: "Compounds over time and reinforces trust.", risk: "Slowest path to first signal.", next_test: "Ship one sharp insight post per pain point." },
    partnerships: { score: 76, confidence: 0.66, reason: "Can borrow trust and audience alignment.", risk: "Requires relationship capital.", next_test: "Identify 5 adjacent partners with shared ICP." },
    marketplace: { score: 83, confidence: 0.74, reason: "Captures existing intent when the category is already searched for.", risk: "More competition and category pricing pressure.", next_test: "Map top listings and point of differentiation." },
    ads: { score: 71, confidence: 0.6, reason: "Scales once message-market fit is real.", risk: "Expensive before signal exists.", next_test: "Only test after one organic conversion loop works." },
    seo: { score: 69, confidence: 0.58, reason: "Strong for sustained demand capture after the thesis is stable.", risk: "Too slow for first traction in many early-stage cases.", next_test: "Only invest after a stable offer is validated." },
  };
  const base = heuristics[normalized] ?? { score: 67, confidence: 0.5, reason: "Generic channel requiring manual benchmarking.", risk: "No channel-specific heuristics available.", next_test: "Benchmark against the exact ICP and offer." };
  const stageBonus = stageHint?.toLowerCase().includes("prelaunch") || stageHint?.toLowerCase().includes("m0") ? 2 : 0;
  const research = researchChannelAdjustment(channel, researchMemo);
  const founderAudit = founderEdgeAuditFor(channel);
  const founderAdjustment = founderAudit?.score != null ? Math.round((founderAudit.score - 2.5) * 4) : 0;
  const evidenceWeightedScore = Math.min(100, Math.max(0, 50 + research.adjustment));
  const finalScore = research.notes.length
    ? Math.round((((base.score ?? 67) + stageBonus + founderAdjustment) * 0.35) + (evidenceWeightedScore * 0.65))
    : Math.min(100, Math.max(0, (base.score ?? 67) + stageBonus + founderAdjustment));
  return {
    channel,
    score: finalScore,
    confidence: base.confidence ?? 0.5,
    reason: base.reason ?? "",
    evidence: [
      `Stage hint: ${stageHint ?? "not provided"}`,
      `Heuristic bucket: ${normalized in heuristics ? normalized : "fallback"}`,
      founderAudit
        ? `Founder Edge Audit: ${founderAudit.score}/5 measured builder advantage.`
        : "Founder Edge Audit: not found in state.",
      ...(research.notes.length ? ["Scoring mode: evidence-first blend (65% evidence / 35% heuristic)."] : ["Scoring mode: heuristic fallback."]),
      ...research.notes,
    ],
    risk: base.risk ?? "",
    next_test: base.next_test ?? "",
  };
}
function deriveWhiteSpace(competitors: string[], substitutes: string[], workflowCompetitors: string[], attentionCompetitors: string[]): string[] {
  const gaps: string[] = [];
  if (!competitors.length) gaps.push("No named direct competitors supplied; map the category before finalizing the thesis.");
  if (!substitutes.length) gaps.push("Find what the ICP uses instead of buying a dedicated solution.");
  if (!workflowCompetitors.length) gaps.push("Identify internal workflows or spreadsheets that are competing with the product.");
  if (!attentionCompetitors.length) gaps.push("Name the channels, creators, or tools stealing attention from the same ICP.");
  if (competitors.length && substitutes.length) gaps.push("Look for a lower-friction entry point than the direct competitor offers.");
  return gaps;
}
function mergeUniqueStrings(...collections: Array<string[] | undefined>): string[] {
  return [...new Set(collections.flatMap((items) => items ?? []).map((item) => item.trim()).filter(Boolean))];
}
function hasStateField(candidateState: VectorState, field: string): boolean {
  const value = (candidateState as Record<string, unknown>)[field];
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return true;
  return true;
}
function gateHasRequiredFields(state: VectorState, gate: keyof z.infer<typeof GatesSchema>): boolean {
  switch (gate) {
    case "intake_cleared":
      return Boolean(state.product_description?.trim() && state.icp_hypothesis?.trim());
    case "icp_cleared":
      return Boolean(
        state.target_user?.trim()
        && state.job_statement?.trim()
        && state.riskiest_assumption?.trim()
        && state.icp.forces.push?.trim()
        && state.icp.forces.pull?.trim()
        && state.icp.forces.anxiety?.trim()
        && state.icp.forces.habit?.trim(),
      );
    case "market_cleared":
      return Boolean(
        state.market.category_stance?.trim()
        && (
          state.market.competitor_map.direct.length
          || state.market.competitor_map.substitutes.length
          || state.market.competitor_map.workflow_competitors.length
          || state.market.competitor_map.attention_competitors.length
        ),
      );
    case "channel_cleared":
      return Boolean(state.founder_edge_audit.length && state.channel_selected?.trim());
    case "thesis_cleared":
      return Boolean(state.thesis_card?.primary_channel?.trim());
    case "venue_cleared":
      return Boolean(state.venue_card?.sales_venue?.trim() && state.venue_card?.trust_signal_needed?.trim());
  }
  return false;
}
function reconcileSessionState(loaded: VectorState): ResumeReconciliation {
  const state = syncCanonicalViews(loaded);
  const notes: string[] = [];
  const gates = { ...state.gates };
  const gateNames: Array<keyof z.infer<typeof GatesSchema>> = [
    "intake_cleared",
    "icp_cleared",
    "market_cleared",
    "channel_cleared",
    "thesis_cleared",
    "venue_cleared",
  ];
  for (const gate of gateNames) {
    if (gates[gate] && !gateHasRequiredFields(state, gate)) {
      gates[gate] = false;
      notes.push(`Gate '${gate}' reset to false because required fields were missing on load.`);
    }
  }
  const maxPhaseByGates = gates.venue_cleared
    ? "signal"
    : gates.thesis_cleared
      ? "venue"
      : gates.channel_cleared
        ? "thesis"
        : gates.market_cleared
          ? "channel"
          : gates.icp_cleared
            ? "market"
            : gates.intake_cleared
              ? "icp"
              : "intake";
  const currentIndex = WORKFLOW_PHASES.indexOf(state.phase);
  const allowedIndex = WORKFLOW_PHASES.indexOf(maxPhaseByGates);
  const nextActionFromRecovery = state.recovery_log.length
    ? state.recovery_log[state.recovery_log.length - 1]?.correction_applied ?? null
    : null;
  const nextState = syncCanonicalViews({
    ...state,
    phase: currentIndex > allowedIndex ? maxPhaseByGates : state.phase,
    milestone: PHASE_TO_MILESTONE[currentIndex > allowedIndex ? maxPhaseByGates : state.phase],
    gates,
    next_action: nextActionFromRecovery ?? state.next_action,
  });
  if (currentIndex > allowedIndex) {
    notes.push(`Phase rolled back from '${state.phase}' to '${maxPhaseByGates}' during load reconciliation.`);
  }
  return {
    state: nextState,
    notes,
  };
}
function phasePrerequisites(targetPhase: z.infer<typeof PhaseSchema>, candidateState: VectorState): string[] {
  return phasePolicy(targetPhase).prerequisites
    .filter((rule) => {
      const matches = rule.kind === "allOf"
        ? rule.fields.every((field) => hasStateField(candidateState, field))
        : rule.fields.some((field) => hasStateField(candidateState, field));
      return !matches;
    })
    .map((rule) => rule.message);
}
function assertPhasePrerequisites(targetPhase: z.infer<typeof PhaseSchema>, candidateState: VectorState): void {
  const failures = phasePrerequisites(targetPhase, candidateState);
  if (failures.length) {
    throw new Error(`Phase prerequisites failed for '${targetPhase}': ${failures.join("; ")}`);
  }
}
function scoreVenue(venue: string, primaryChannel?: string, stageHint?: string, researchMemo?: z.infer<typeof ResearchMemoSchema> | null): { venue: string; score: number; confidence: number; reason: string; risk: string; next_test: string; evidence: string[] } {
  const normalized = venue.toLowerCase();
  const heuristics: Record<string, { score: number; confidence: number; reason: string; risk: string; next_test: string }> = {
    substack: { score: 86, confidence: 0.7, reason: "Strong for newsletter-led trust and direct audience capture.", risk: "Can be noisy if the ICP is not already reading newsletters.", next_test: "Publish one thesis-backed issue and measure conversion." },
    ghost: { score: 84, confidence: 0.74, reason: "Good for owned publication plus membership or gated content.", risk: "Requires a bit more setup than lightweight newsletter tools.", next_test: "Launch a single landing page with one lead magnet." },
    shopify: { score: 88, confidence: 0.76, reason: "Best when the venue is a store or productized offer with checkout friction.", risk: "Overkill for pure insight or service offers.", next_test: "Compare checkout and content-to-checkout speed." },
    gumroad: { score: 83, confidence: 0.72, reason: "Fastest path to selling a simple digital offer or template.", risk: "Less flexible for complex funnels and brand control.", next_test: "Test a one-page product with a single CTA." },
    webflow: { score: 85, confidence: 0.73, reason: "Great for custom landing pages and higher-control positioning.", risk: "Needs design discipline to avoid scope creep.", next_test: "Ship a landing page with one conversion path." },
    notion: { score: 70, confidence: 0.55, reason: "Useful for internal ops, prototypes, and lightweight client portals.", risk: "Weak as a public conversion venue.", next_test: "Use only if the buyer already works inside Notion." },
    "landing page": { score: 87, confidence: 0.74, reason: "Best generic venue for focused conversion tests.", risk: "Performance depends on traffic quality.", next_test: "Build a one-off page and run direct traffic." },
    email: { score: 81, confidence: 0.78, reason: "Strong when the audience is already permissioned.", risk: "Deliverability and cadence matter.", next_test: "Send a small test sequence to warm contacts." },
    linkedin: { score: 79, confidence: 0.7, reason: "High-trust venue for B2B founders and operators.", risk: "Attention can be shallow unless the offer is sharp.", next_test: "Pair one post with one DM sequence." },
  };
  const base = heuristics[normalized] ?? { score: 68, confidence: 0.5, reason: "Generic venue requiring manual benchmarking.", risk: "No venue-specific heuristics available.", next_test: "Benchmark against the ICP and the trust requirement." };
  const channelBonus = primaryChannel && normalized.includes(primaryChannel.toLowerCase()) ? 2 : 0;
  const stageBonus = stageHint?.toLowerCase().includes("m0") || stageHint?.toLowerCase().includes("prelaunch") ? 1 : 0;
  const research = researchVenueAdjustment(venue, researchMemo);
  const evidenceWeightedScore = Math.min(100, Math.max(0, 50 + research.adjustment));
  const finalScore = research.notes.length
    ? Math.round(((base.score + channelBonus + stageBonus) * 0.35) + (evidenceWeightedScore * 0.65))
    : Math.min(100, Math.max(0, base.score + channelBonus + stageBonus));
  return {
    venue,
    score: finalScore,
    confidence: base.confidence,
    reason: base.reason,
    risk: base.risk,
    next_test: base.next_test,
    evidence: [
      ...(research.notes.length ? ["Scoring mode: evidence-first blend (65% evidence / 35% heuristic)."] : ["Scoring mode: heuristic fallback."]),
      ...research.notes,
    ],
  };
}
function renderStrategyMap(state: VectorState): string {
  const icpNode = state.target_user ?? state.icp.who ?? "ICP";
  const channelNode = state.channel_selected ?? state.thesis_card?.primary_channel ?? "Channel";
  const venueNode = state.venue_selected ?? state.venue_card?.sales_venue ?? "Venue";
  return [
    "flowchart LR",
    `  A[ICP: ${icpNode.replaceAll("\"", "'")}] --> B[Channel: ${channelNode.replaceAll("\"", "'")}]`,
    `  B --> C[Venue: ${venueNode.replaceAll("\"", "'")}]`,
    `  C --> D[Signals: ${state.signals.green.length}/${state.signals.yellow.length}/${state.signals.red.length}]`,
    `  D --> E[Recovery or scale]`,
  ].join("\n");
}
async function emit(action: string, artifact: Artifact, statePatch: Partial<VectorState>): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const nextPhase = (statePatch.phase ?? VECTOR_STATE.phase) as z.infer<typeof PhaseSchema>;
  const updatedRegistry = mergeArtifactRegistry(
    statePatch.artifact_registry ?? VECTOR_STATE.artifact_registry,
    action,
    artifact,
    nextPhase,
  );
  const candidateState = syncCanonicalViews({
    ...VECTOR_STATE,
    ...statePatch,
    stage: statePatch.stage ?? phaseToStage(nextPhase),
    artifact_registry: updatedRegistry,
    session: statePatch.session ?? {
      ...(VECTOR_STATE.session ?? defaultSession()),
      kb_synced: false,
      last_sync: null,
      schema_version: CURRENT_VERSION,
    },
    routing: {
      ...(VECTOR_STATE.routing ?? defaultRouting(nextPhase)),
      ...(statePatch.routing ?? {}),
      mode: statePatch.routing?.mode ?? VECTOR_STATE.routing?.mode ?? inferModeForPhase(nextPhase),
    },
  } as VectorState);
  assertPhasePrerequisites(nextPhase, candidateState);
  const next = await commitState(candidateState, action, artifact.summary);
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
            decisions: next.logs.decisions.slice(-5)
          }
        } 
      } 
    }) }],
  };
}
// --- TOOLS ---
registerVectorTool(
  "vector_list_toolsets",
  {
    description: "List the capability toolsets declared by VECTOR and which ones are enabled in this runtime.",
    inputSchema: {},
  },
  async () => {
    const enabled = new Set(CAPABILITY_STATE.toolsets);
    const toolsets = allCapabilityToolsets().map((toolset) => ({
      toolset,
      enabled: enabled.has(toolset),
      tool_count: listToolsetTools(toolset).length,
    }));
    return {
      content: [{ type: "text", text: artifactToText({
        title: "VECTOR Capability Toolsets",
        summary: `Capability-scoped runtime is active: ${capabilityModeText()}.`,
        decisions: toolsets.map((item) => `${item.toolset}: ${item.enabled ? "enabled" : "disabled"} (${item.tool_count} tools)`),
        next_actions: ["Use vector_list_toolset_tools to inspect the tools inside one toolset."],
        state_delta: {
          capability_mode: {
            enabled_toolsets: CAPABILITY_STATE.toolsets,
            safe_mode: CAPABILITY_STATE.safeMode,
          },
        },
        payload: { toolsets, enabled_toolsets: CAPABILITY_STATE.toolsets, safe_mode: CAPABILITY_STATE.safeMode },
      }) }],
    };
  },
);
registerVectorTool(
  "vector_list_toolset_tools",
  {
    description: "List the tools that belong to a VECTOR capability toolset.",
    inputSchema: {
      toolset: z.enum(allCapabilityToolsets() as [CapabilityToolset, ...CapabilityToolset[]]).describe("Capability toolset to inspect."),
    },
  },
  async ({ toolset }: any) => {
    const tools = listToolsetTools(toolset as CapabilityToolset).map((name) => {
      const policy = capabilityPolicy(name);
      return {
        name,
        mutates_state: policy?.mutates_state ?? false,
        safe_mode_blocked: policy?.safe_mode_blocked ?? false,
      };
    });
    const enabled = CAPABILITY_STATE.toolsets.includes(toolset as CapabilityToolset);
    return {
      content: [{ type: "text", text: artifactToText({
        title: `VECTOR Toolset: ${toolset}`,
        summary: `${toolset} is ${enabled ? "enabled" : "disabled"} in this runtime.`,
        decisions: tools.map((item) => `${item.name} | mutates_state=${item.mutates_state} | safe_mode_blocked=${item.safe_mode_blocked}`),
        next_actions: enabled ? ["Use listed tools directly from this runtime."] : ["Restart runtime with VECTOR_TOOLSETS including this toolset if you need these tools."],
        state_delta: { toolset, enabled },
        payload: { toolset, enabled, tools },
      }) }],
    };
  },
);
registerVectorTool(
  "vector_undo",
  {
    description: "Revert the state to the latest automatic backup (savepoint).",
    inputSchema: {
      reason: z.string().describe("Why you are reverting the state."),
    },
  },
  async ({ reason }: any) => {
    try {
      const restored = await RUNTIME.stateStore.restoreLatestBackup?.();
      if (!restored) {
        return { content: [{ type: "text", text: "No backups available to undo." }] };
      }
      VECTOR_STATE = syncCanonicalViews(restored.state);
      await saveState(VECTOR_STATE);
      return { content: [{ type: "text", text: `Successfully reverted state to backup ${restored.label}. Reason: ${reason}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Failed to undo: ${e}` }] };
    }
  }
);
registerVectorTool(
  "vector_intake",
  {
    description: "Collect the minimum viable input for VECTOR and initialize the execution context.",
    inputSchema: {
      product_description: z.string().describe("A one-sentence description of the product."),
      icp_hypothesis: z.string().describe("Initial ICP hypothesis."),
      is_live: z.boolean().describe("Whether the product is already live."),
      product_name: z.string().optional().describe("Optional product name."),
      product_price: z.string().optional().describe("Optional price or pricing signal."),
      product_category: z.string().optional().describe("Optional product category."),
      builder_background: z.string().optional().describe("Founder background, distribution history, and audience presence."),
      persona: PersonaSchema.optional().describe("Optional routing persona."),
      intent: z.string().optional().describe("Optional routing intent."),
      platform: z.string().optional().describe("Optional platform name."),
      mode: ModeSchema.optional().describe("Optional routing mode."),
      stage: StageSchema.optional().describe("Optional product stage.")
    },
  },
  async ({ product_description, icp_hypothesis, is_live, product_name, product_price, product_category, builder_background, persona, intent, platform, mode, stage }: any) => {
    const cleaned = sanitizeRecursive({ product_description, icp_hypothesis, is_live, product_name, product_price, product_category, builder_background, persona, intent, platform, mode, stage }) as {
      product_description: string;
      icp_hypothesis: string;
      is_live: boolean;
      product_name?: string;
      product_price?: string;
      product_category?: string;
      builder_background?: string;
      persona?: z.infer<typeof PersonaSchema>;
      intent?: string;
      platform?: string;
      mode?: z.infer<typeof ModeSchema>;
      stage?: z.infer<typeof StageSchema>;
    };
    const nextPhase: z.infer<typeof PhaseSchema> = "icp";
    const nextState = {
      ...VECTOR_STATE,
      phase: nextPhase,
      milestone: PHASE_TO_MILESTONE[nextPhase],
      stage: cleaned.stage ?? phaseToStage(nextPhase),
      product_description: cleaned.product_description,
      product: {
        ...(VECTOR_STATE.product ?? defaultProduct()),
        name: cleaned.product_name ?? cleaned.product_description,
        summary: cleaned.product_description,
        price: cleaned.product_price ?? VECTOR_STATE.product?.price ?? null,
        live_status: cleaned.is_live ? "live" : "prelaunch",
        category: cleaned.product_category ?? VECTOR_STATE.product?.category ?? null,
      },
      icp_hypothesis: cleaned.icp_hypothesis,
      builder_background: cleaned.builder_background ?? null,
      icp_confirmed: false,
      next_action: is_live ? "Run ICP/JTBD validation on the current audience or target segment." : "Clarify the first target segment before launch.",
      icp_drift: "unknown",
      routing: {
        ...(VECTOR_STATE.routing ?? defaultRouting(nextPhase)),
        persona: cleaned.persona ?? VECTOR_STATE.routing?.persona ?? "unknown",
        intent: cleaned.intent ?? VECTOR_STATE.routing?.intent ?? null,
        platform: cleaned.platform ?? VECTOR_STATE.routing?.platform ?? null,
        mode: cleaned.mode ?? VECTOR_STATE.routing?.mode ?? inferModeForPhase(nextPhase),
        last_router_reason: "captured during intake",
      },
      session: {
        ...(VECTOR_STATE.session ?? defaultSession()),
        kb_synced: false,
        last_sync: null,
        schema_version: CURRENT_VERSION,
      },
      market_memo: null,
      research_memo: null,
      channel_selected: null,
      venue_selected: null,
      thesis_card: null,
      venue_card: null,
      sales_copy: null,
    } satisfies VectorState;
    return emit(
      "vector_intake",
      {
        title: "VECTOR Intake Card",
        summary: `Intake captured for ${cleaned.product_description}. VECTOR has been routed into the ICP phase.`,
        decisions: [
          `Product: ${cleaned.product_description}`,
          `Initial ICP hypothesis: ${cleaned.icp_hypothesis}`,
          `Live status: ${is_live ? "live" : "not live"}`,
          cleaned.product_price ? `Price signal: ${cleaned.product_price}` : "Price signal: not provided",
        ],
        next_actions: [
          "Refine the ICP into a single target user with a concrete job statement.",
          "Record the riskiest assumption before moving to market analysis.",
        ],
        state_delta: {
          phase: nextPhase,
          milestone: PHASE_TO_MILESTONE[nextPhase],
          stage: cleaned.stage ?? phaseToStage(nextPhase),
          product_description: cleaned.product_description,
          icp_hypothesis: cleaned.icp_hypothesis,
          builder_background: cleaned.builder_background ?? null,
          routing: {
            persona: cleaned.persona ?? "unknown",
            mode: cleaned.mode ?? inferModeForPhase(nextPhase),
            platform: cleaned.platform ?? null,
            intent: cleaned.intent ?? null,
            last_router_reason: "captured during intake",
          },
        },
        payload: cleaned,
      },
      nextState
    );
  }
);
registerVectorTool(
  "vector_icp_jtbd",
  {
    description: "Convert the intake into an ICP + JTBD card with a concrete risk statement.",
    inputSchema: {
      target_user: z.string().describe("The single target user segment."),
      job_statement: z.string().describe("The job the user is trying to get done."),
      riskiest_assumption: z.string().describe("The riskiest assumption that must be validated first."),
      evidence: z.array(z.string()).optional().describe("Optional evidence notes or source bullets."),
      watering_holes: z.array(z.string()).optional().describe("Where the ICP already congregates or listens."),
      wtp_signal: z.string().optional().describe("Observed willingness-to-pay signal."),
      trigger_moment: z.string().optional().describe("What event makes the ICP act now."),
      desired_outcome: z.string().optional().describe("The concrete outcome the ICP wants."),
      push: z.string().optional().describe("4 Forces: pain or urgency pushing the ICP away from the status quo."),
      pull: z.string().optional().describe("4 Forces: desired outcome pulling the ICP toward change."),
      anxiety: z.string().optional().describe("4 Forces: fear, risk, or uncertainty blocking the switch."),
      habit: z.string().optional().describe("4 Forces: inertia or current workaround keeping the ICP in place."),
      evidence_tags: z.object({
        who: EvidenceTagSchema.optional(),
        problem: EvidenceTagSchema.optional(),
        trigger_moment: EvidenceTagSchema.optional(),
        wtp_signal: EvidenceTagSchema.optional(),
        forces: EvidenceTagSchema.optional(),
      }).optional().describe("Optional evidence tags for the ICP card claims."),
      confidence: ConfidenceLevelSchema.optional().describe("Overall confidence level for the ICP card."),
      top_unknown: z.string().optional().describe("The single biggest unknown left in the ICP card."),
      next_experiment: z.string().optional().describe("The next smallest experiment to reduce uncertainty."),
    },
  },
  async ({ target_user, job_statement, riskiest_assumption, evidence, watering_holes, wtp_signal, trigger_moment, desired_outcome, push, pull, anxiety, habit, evidence_tags, confidence, top_unknown, next_experiment }: any) => {
    ensureToolPhase("vector_icp_jtbd");
    const cleaned = sanitizeRecursive({ target_user, job_statement, riskiest_assumption, evidence, watering_holes, wtp_signal, trigger_moment, desired_outcome, push, pull, anxiety, habit, evidence_tags, confidence, top_unknown, next_experiment }) as {
      target_user: string;
      job_statement: string;
      riskiest_assumption: string;
      evidence?: string[];
      watering_holes?: string[];
      wtp_signal?: string;
      trigger_moment?: string;
      desired_outcome?: string;
      push?: string;
      pull?: string;
      anxiety?: string;
      habit?: string;
      evidence_tags?: Partial<z.infer<typeof ICPStateSchema>["evidence_tags"]>;
      confidence?: z.infer<typeof ConfidenceLevelSchema>;
      top_unknown?: string;
      next_experiment?: string;
    };
    const nextPhase: z.infer<typeof PhaseSchema> = "market";
    const nextState = {
      ...VECTOR_STATE,
      phase: nextPhase,
      milestone: PHASE_TO_MILESTONE[nextPhase],
      stage: phaseToStage(nextPhase),
      target_user: cleaned.target_user,
      job_statement: cleaned.job_statement,
      riskiest_assumption: cleaned.riskiest_assumption,
      icp_confirmed: true,
      icp_drift: "observed",
      icp: {
        ...(VECTOR_STATE.icp ?? defaultICP()),
        hypothesis: VECTOR_STATE.icp?.hypothesis ?? VECTOR_STATE.icp_hypothesis ?? null,
        confirmed: true,
        who: cleaned.target_user,
        problem: cleaned.job_statement,
        trigger_moment: cleaned.trigger_moment ?? VECTOR_STATE.icp?.trigger_moment ?? null,
        desired_outcome: cleaned.desired_outcome ?? VECTOR_STATE.icp?.desired_outcome ?? null,
        watering_holes: cleaned.watering_holes ?? VECTOR_STATE.icp?.watering_holes ?? [],
        wtp_signal: cleaned.wtp_signal ?? VECTOR_STATE.icp?.wtp_signal ?? null,
        evidence: cleaned.evidence ?? VECTOR_STATE.icp?.evidence ?? [],
        drift_status: "observed",
        evidence_tags: {
          ...(VECTOR_STATE.icp?.evidence_tags ?? defaultICP().evidence_tags),
          ...(cleaned.evidence_tags ?? {}),
        },
        confidence: cleaned.confidence ?? VECTOR_STATE.icp?.confidence ?? "unknown",
        top_unknown: cleaned.top_unknown ?? VECTOR_STATE.icp?.top_unknown ?? null,
        next_experiment: cleaned.next_experiment ?? VECTOR_STATE.icp?.next_experiment ?? null,
        forces: {
          ...(VECTOR_STATE.icp?.forces ?? defaultICP().forces),
          push: cleaned.push ?? VECTOR_STATE.icp?.forces.push ?? null,
          pull: cleaned.pull ?? VECTOR_STATE.icp?.forces.pull ?? null,
          anxiety: cleaned.anxiety ?? VECTOR_STATE.icp?.forces.anxiety ?? null,
          habit: cleaned.habit ?? VECTOR_STATE.icp?.forces.habit ?? null,
        },
      },
      risk: {
        riskiest_assumption: cleaned.riskiest_assumption,
        top_failure_mode: VECTOR_STATE.risk?.top_failure_mode ?? null,
        drift_status: "observed",
      },
      research_memo: null,
      next_action: "Map the market terrain and separate competitors from substitutes.",
    } satisfies VectorState;
    return emit(
      "vector_icp_jtbd",
      {
        title: "ICP + JTBD Card",
        summary: `The target user has been clarified as ${cleaned.target_user}. The system now carries a concrete job statement and a riskiest assumption.`,
        decisions: [
          `Target user: ${cleaned.target_user}`,
          `Job statement: ${cleaned.job_statement}`,
          `Riskiest assumption: ${cleaned.riskiest_assumption}`,
          `4 Forces mapped: ${[cleaned.push, cleaned.pull, cleaned.anxiety, cleaned.habit].every(Boolean) ? "yes" : "partial"}`,
        ],
        next_actions: [
          "Collect direct market evidence around competitors, substitutes, and workarounds.",
          "Validate whether the ICP is actively experiencing the stated job and pain.",
        ],
        state_delta: {
          phase: nextPhase,
          milestone: PHASE_TO_MILESTONE[nextPhase],
          stage: phaseToStage(nextPhase),
          target_user: cleaned.target_user,
          job_statement: cleaned.job_statement,
          riskiest_assumption: cleaned.riskiest_assumption,
          icp_confirmed: true,
          watering_holes: cleaned.watering_holes ?? [],
          wtp_signal: cleaned.wtp_signal ?? null,
          trigger_moment: cleaned.trigger_moment ?? null,
          desired_outcome: cleaned.desired_outcome ?? null,
          forces: {
            push: cleaned.push ?? null,
            pull: cleaned.pull ?? null,
            anxiety: cleaned.anxiety ?? null,
            habit: cleaned.habit ?? null,
          },
        },
        payload: {
          ...cleaned,
          evidence: cleaned.evidence ?? [],
          watering_holes: cleaned.watering_holes ?? [],
          wtp_signal: cleaned.wtp_signal ?? null,
          trigger_moment: cleaned.trigger_moment ?? null,
          desired_outcome: cleaned.desired_outcome ?? null,
        },
      },
      nextState
    );
  }
);
registerVectorTool(
  "vector_market_terrain",
  {
    description: "Map the market terrain across direct competitors, substitutes, workflow competitors, and attention competitors.",
    inputSchema: {
      stage_confirmed: z.string().optional().describe("Confirmed operating stage, such as 0→1, 1→10, or 10→100."),
      market_category: z.string().optional().describe("How buyers currently think about this market or category."),
      category_stance: z.string().optional().describe("Category stance: entering, reframing, or creating."),
      competitors: z.array(z.string()).optional().describe("Direct competitors."),
      substitutes: z.array(z.string()).optional().describe("Substitutes or manual workarounds."),
      workflow_competitors: z.array(z.string()).optional().describe("Internal workflows, spreadsheets, or DIY systems."),
      attention_competitors: z.array(z.string()).optional().describe("People, tools, or channels competing for the same ICP attention."),
      gold_zone_channels: z.array(z.string()).optional().describe("Channels with high ICP presence and manageable competitor density."),
      red_ocean: z.array(z.string()).optional().describe("Channels to avoid at the current stage."),
      white_space_notes: z.string().optional().describe("Why whitespace exists in the current market terrain."),
      why_now_pressure: z.string().optional().describe("Market shift or urgency increasing buyer intent now."),
      next_research_question: z.string().optional().describe("The next market question that would most improve channel choice."),
      notes: z.array(z.string()).optional().describe("Optional market notes."),
    },
  },
  async ({ stage_confirmed, market_category, category_stance, competitors, substitutes, workflow_competitors, attention_competitors, gold_zone_channels, red_ocean, white_space_notes, why_now_pressure, next_research_question, notes }: any) => {
    ensureToolPhase("vector_market_terrain");
    const cleaned = sanitizeRecursive({ stage_confirmed, market_category, category_stance, competitors, substitutes, workflow_competitors, attention_competitors, gold_zone_channels, red_ocean, white_space_notes, why_now_pressure, next_research_question, notes }) as {
      stage_confirmed?: string;
      market_category?: string;
      category_stance?: string;
      competitors?: string[];
      substitutes?: string[];
      workflow_competitors?: string[];
      attention_competitors?: string[];
      gold_zone_channels?: string[];
      red_ocean?: string[];
      white_space_notes?: string;
      why_now_pressure?: string;
      next_research_question?: string;
      notes?: string[];
    };
    const marketMemo = {
      competitors: cleaned.competitors ?? [],
      substitutes: cleaned.substitutes ?? [],
      workflow_competitors: cleaned.workflow_competitors ?? [],
      attention_competitors: cleaned.attention_competitors ?? [],
      white_space: deriveWhiteSpace(cleaned.competitors ?? [], cleaned.substitutes ?? [], cleaned.workflow_competitors ?? [], cleaned.attention_competitors ?? []),
      unresolved_unknowns: [
        cleaned.competitors?.length ? "" : "Need named competitors.",
        cleaned.substitutes?.length ? "" : "Need substitute/workaround map.",
        cleaned.workflow_competitors?.length ? "" : "Need internal workflow competitor map.",
        cleaned.attention_competitors?.length ? "" : "Need attention competitor map.",
      ].filter(Boolean),
    };
    const nextPhase: z.infer<typeof PhaseSchema> = VECTOR_STATE.founder_edge_audit.length ? "channel" : "market";
    const nextState = {
      ...VECTOR_STATE,
      phase: nextPhase,
      milestone: PHASE_TO_MILESTONE[nextPhase],
      stage: VECTOR_STATE.stage ?? phaseToStage(nextPhase),
      market_memo: marketMemo,
      market: {
        ...(VECTOR_STATE.market ?? defaultMarket()),
        stage_confirmed: cleaned.stage_confirmed ?? VECTOR_STATE.market?.stage_confirmed ?? VECTOR_STATE.stage ?? null,
        market_category: cleaned.market_category ?? VECTOR_STATE.market?.market_category ?? null,
        category_stance: cleaned.category_stance ?? VECTOR_STATE.market?.category_stance ?? null,
        competitor_map: {
          direct: cleaned.competitors ?? [],
          substitutes: cleaned.substitutes ?? [],
          workflow_competitors: cleaned.workflow_competitors ?? [],
          attention_competitors: cleaned.attention_competitors ?? [],
        },
        gold_zone_channels: cleaned.gold_zone_channels ?? VECTOR_STATE.market?.gold_zone_channels ?? [],
        red_ocean: cleaned.red_ocean ?? VECTOR_STATE.market?.red_ocean ?? [],
        white_space_notes: cleaned.white_space_notes ?? VECTOR_STATE.market?.white_space_notes ?? (marketMemo.white_space.join(" | ") || null),
        why_now_pressure: cleaned.why_now_pressure ?? VECTOR_STATE.market?.why_now_pressure ?? null,
        next_research_question: cleaned.next_research_question ?? VECTOR_STATE.market?.next_research_question ?? null,
        last_updated: now(),
      },
      next_action: nextPhase === "channel"
        ? "Rank channels by speed, trust, repetition, and founder advantage."
        : "Run Founder Edge Audit on candidate channels before entering channel scoring.",
    } satisfies VectorState;
    return emit(
      "vector_market_terrain",
      {
        title: "Market Terrain Memo",
        summary: "Market terrain has been separated into direct competitors, substitutes, workflow competitors, and attention competitors.",
        decisions: [
          `Direct competitors captured: ${marketMemo.competitors.length}`,
          `Substitutes captured: ${marketMemo.substitutes.length}`,
          `Workflow competitors captured: ${marketMemo.workflow_competitors.length}`,
          `Attention competitors captured: ${marketMemo.attention_competitors.length}`,
          `Category stance: ${cleaned.category_stance ?? "not set"}`,
          `Phase after market mapping: ${nextPhase}`,
        ],
        next_actions: [
          "Use the white-space list to decide which angle the product can own.",
          nextPhase === "channel"
            ? "Feed the strongest white space into the channel scoring step."
            : "Run vector_founder_edge_audit on the candidate channels before channel scoring.",
        ],
        state_delta: {
          phase: nextPhase,
          milestone: PHASE_TO_MILESTONE[nextPhase],
          stage: VECTOR_STATE.stage ?? phaseToStage(nextPhase),
          market_memo: marketMemo,
          market: {
            stage_confirmed: cleaned.stage_confirmed ?? VECTOR_STATE.stage ?? null,
            market_category: cleaned.market_category ?? null,
            category_stance: cleaned.category_stance ?? null,
            gold_zone_channels: cleaned.gold_zone_channels ?? [],
            red_ocean: cleaned.red_ocean ?? [],
            white_space_notes: cleaned.white_space_notes ?? (marketMemo.white_space.join(" | ") || null),
            why_now_pressure: cleaned.why_now_pressure ?? null,
            next_research_question: cleaned.next_research_question ?? null,
          },
        },
        payload: {
          ...marketMemo,
          stage_confirmed: cleaned.stage_confirmed ?? null,
          market_category: cleaned.market_category ?? null,
          category_stance: cleaned.category_stance ?? null,
          gold_zone_channels: cleaned.gold_zone_channels ?? [],
          red_ocean: cleaned.red_ocean ?? [],
          white_space_notes: cleaned.white_space_notes ?? (marketMemo.white_space.join(" | ") || null),
          why_now_pressure: cleaned.why_now_pressure ?? null,
          next_research_question: cleaned.next_research_question ?? null,
          notes: cleaned.notes ?? [],
        },
      },
      nextState
    );
  }
);
registerVectorTool(
  "vector_list_research_providers",
  {
    description: "List the research providers and interfaces available to the current VECTOR runtime.",
    inputSchema: {},
  },
  async () => {
    ensureToolPhase("vector_list_research_providers");
    const providers = listSearchProviders();
    return {
      content: [{ type: "text", text: artifactToText({
        title: "Research Providers",
        summary: `${providers.length} research provider(s) are available for provider-backed evidence acquisition.`,
        decisions: providers.map((provider) => `${provider.id} (${provider.readiness}/${provider.availability}) whitelist=${provider.source_whitelist.join(", ") || "open"}`),
        next_actions: ["Use vector_research_search with one provider to capture fresh evidence before scoring."],
        state_delta: { research_provider_count: providers.length },
        payload: { providers },
      }) }],
    };
  },
);
registerVectorTool(
  "vector_research_search",
  {
    description: "Run a provider-backed search, normalize raw payloads into evidence, and derive research observations.",
    inputSchema: {
      query: z.string().describe("Research question or search query."),
      provider: z.string().optional().describe("Provider id. Defaults to the best configured search provider."),
      source_whitelist: z.array(z.string()).optional().describe("Optional domain whitelist to constrain the provider."),
      max_results: z.number().int().positive().max(10).optional().describe("Budget cap for search results."),
    },
  },
  async ({ query, provider, source_whitelist, max_results }: any) => {
    ensureToolPhase("vector_research_search");
    const cleaned = sanitizeRecursive({ query, provider, source_whitelist, max_results }) as {
      query: string;
      provider?: string;
      source_whitelist?: string[];
      max_results?: number;
    };
    const searchProvider = getSearchProvider(cleaned.provider ?? defaultSearchProviderId());
    const searchResponse = await searchProvider.search({
      query: cleaned.query,
      source_whitelist: cleaned.source_whitelist ?? [],
      max_results: cleaned.max_results ?? searchProvider.default_max_results,
    });
    const providerRun = ResearchProviderRunSchema.parse({
      id: `${searchResponse.provider}:${Date.now()}`,
      provider: searchResponse.provider,
      interface: searchResponse.interface,
      query: searchResponse.query,
      result_count: searchResponse.result_count,
      budget_used: searchResponse.budget_used,
      raw_payload_ref: searchResponse.raw_payload_ref,
      source_whitelist: searchResponse.source_whitelist,
      collected_at: now(),
    });
    const existing = VECTOR_STATE.research_memo ?? ResearchMemoSchema.parse({
      question: cleaned.query,
      synthesis: "",
      recommendation: "",
      next_experiment: "",
      updated_at: now(),
    });
    const nextResearchMemo = ResearchMemoSchema.parse(
      mergeResearchMemoFromProvider(existing, cleaned.query, providerRun, searchResponse.results, now()),
    );
    const affectedChannels = [...new Set(nextResearchMemo.channel_observations
      .filter((item) => item.provider_run_id === providerRun.id)
      .map((item) => item.channel))];
    const previewScores = affectedChannels.map((channel) => scoreChannel(channel, VECTOR_STATE.stage ?? undefined, nextResearchMemo));
    const nextState = {
      ...VECTOR_STATE,
      research_memo: nextResearchMemo,
      next_action: previewScores[0]?.next_test ?? "Map the strongest provider-backed observation into the next GTM step.",
    } satisfies VectorState;
    return emit(
      "vector_research_search",
      {
        title: "Provider Research Search",
        summary: `Provider ${searchResponse.provider} returned ${searchResponse.result_count} result(s) for: ${cleaned.query}`,
        decisions: [
          `Provider run id: ${providerRun.id}`,
          `Evidence items appended: ${searchResponse.results.length}`,
          `Channel observations derived: ${nextResearchMemo.channel_observations.filter((item) => item.provider_run_id === providerRun.id).length}`,
          `Venue observations derived: ${nextResearchMemo.venue_observations.filter((item) => item.provider_run_id === providerRun.id).length}`,
        ],
        next_actions: previewScores.length
          ? previewScores.map((score) => `Preview ${score.channel}: ${score.score}/100`)
          : ["Run vector_channel_score to compare channels after provider-backed evidence capture."],
        state_delta: { research_memo: nextResearchMemo },
        payload: {
          provider_run: providerRun,
          raw_results: searchResponse.results,
          preview_scores: previewScores,
        },
      },
      nextState,
    );
  },
);
registerVectorTool(
  "vector_source_capture",
  {
    description: "Capture auditable research sources with provenance and freshness metadata before synthesis.",
    inputSchema: {
      question: z.string().describe("The research question these sources support."),
      sources: z.array(z.object({
        id: z.string(),
        source: z.string(),
        source_url: z.string().url().nullable().optional(),
        source_type: SourceTypeSchema,
        kind: EvidenceKindSchema,
        claim: z.string(),
        observed_fact: z.boolean().optional(),
        relevance: z.string().optional(),
        strength: EvidenceStrengthSchema,
        collected_at: z.string().optional(),
        stale_after_days: z.number().int().positive().optional(),
        notes: z.string().optional(),
      })).min(1).describe("Evidence sources to append into the research memo."),
    },
  },
  async ({ question, sources }: any) => {
    ensureToolPhase("vector_source_capture");
    const cleaned = sanitizeRecursive({ question, sources }) as {
      question: string;
      sources: Array<z.infer<typeof EvidenceItemSchema>>;
    };
    const normalizedSources = cleaned.sources.map((item) => EvidenceItemSchema.parse({
      ...item,
      source_url: item.source_url ?? null,
      observed_fact: item.observed_fact ?? true,
      relevance: item.relevance ?? "",
      collected_at: item.collected_at ?? now(),
      stale_after_days: item.stale_after_days ?? staleAfterDaysFor(item.source_type),
      notes: item.notes ?? "",
    }));
    const existing = VECTOR_STATE.research_memo ?? ResearchMemoSchema.parse({
      question: cleaned.question,
      synthesis: "",
      recommendation: "",
      next_experiment: "",
      updated_at: now(),
    });
    const nextResearchMemo = ResearchMemoSchema.parse({
      ...existing,
      question: cleaned.question,
      evidence_table: [...existing.evidence_table, ...normalizedSources],
      updated_at: now(),
    });
    const nextState = {
      ...VECTOR_STATE,
      research_memo: nextResearchMemo,
      next_action: "Map competitors and channel evidence before final scoring.",
    } satisfies VectorState;
    return emit(
      "vector_source_capture",
      {
        title: "Source Capture",
        summary: `Captured ${normalizedSources.length} auditable sources for: ${cleaned.question}`,
        decisions: [
          `Total research evidence items: ${nextResearchMemo.evidence_table.length}`,
          `Latest source types: ${mergeUniqueStrings(normalizedSources.map((item) => item.source_type)) .join(", ")}`,
        ],
        next_actions: [
          "Use competitor mapping to classify the captured evidence.",
          "Attach the strongest evidence ids to channel or venue observations.",
        ],
        state_delta: { research_memo: nextResearchMemo },
        payload: { question: cleaned.question, appended_sources: normalizedSources },
      },
      nextState,
    );
  },
);
registerVectorTool(
  "vector_competitor_map",
  {
    description: "Classify direct competitors, substitutes, workflow competitors, and attention competitors using captured evidence.",
    inputSchema: {
      competitors: z.array(z.string()).optional().describe("Direct competitors."),
      substitutes: z.array(z.string()).optional().describe("Substitutes or workarounds."),
      workflow_competitors: z.array(z.string()).optional().describe("Internal workflows or DIY alternatives."),
      attention_competitors: z.array(z.string()).optional().describe("Channels or tools competing for attention."),
      pricing_observations: z.array(z.string()).optional().describe("Pricing or packaging notes."),
      trust_signals: z.array(z.string()).optional().describe("Trust signals buyers expect."),
      customer_language: z.array(z.string()).optional().describe("Repeated buyer language."),
      unknowns: z.array(z.string()).optional().describe("Still-unresolved unknowns."),
    },
  },
  async (args: any) => {
    ensureToolPhase("vector_competitor_map");
    const cleaned = sanitizeRecursive(args) as {
      competitors?: string[];
      substitutes?: string[];
      workflow_competitors?: string[];
      attention_competitors?: string[];
      pricing_observations?: string[];
      trust_signals?: string[];
      customer_language?: string[];
      unknowns?: string[];
    };
    const existingMemo = VECTOR_STATE.research_memo;
    const existing = existingMemo ?? ResearchMemoSchema.parse({
      question: "Market structure",
      synthesis: "",
      recommendation: "",
      next_experiment: "",
      updated_at: now(),
    });
    const nextResearchMemo = ResearchMemoSchema.parse({
      ...existing,
      competitors: mergeUniqueStrings(existing.competitors, cleaned.competitors),
      substitutes: mergeUniqueStrings(existing.substitutes, cleaned.substitutes),
      workflow_competitors: mergeUniqueStrings(existing.workflow_competitors, cleaned.workflow_competitors),
      attention_competitors: mergeUniqueStrings(existing.attention_competitors, cleaned.attention_competitors),
      pricing_observations: mergeUniqueStrings(existing.pricing_observations, cleaned.pricing_observations),
      trust_signals: mergeUniqueStrings(existing.trust_signals, cleaned.trust_signals),
      customer_language: mergeUniqueStrings(existing.customer_language, cleaned.customer_language),
      unknowns: mergeUniqueStrings(existing.unknowns, cleaned.unknowns),
      updated_at: now(),
    });
    const marketMemo = {
      competitors: nextResearchMemo.competitors,
      substitutes: nextResearchMemo.substitutes,
      workflow_competitors: nextResearchMemo.workflow_competitors,
      attention_competitors: nextResearchMemo.attention_competitors,
      white_space: deriveWhiteSpace(
        nextResearchMemo.competitors,
        nextResearchMemo.substitutes,
        nextResearchMemo.workflow_competitors,
        nextResearchMemo.attention_competitors,
      ),
      unresolved_unknowns: nextResearchMemo.unknowns,
    };
    const nextState = {
      ...VECTOR_STATE,
      market_memo: marketMemo,
      research_memo: nextResearchMemo,
      next_action: "Attach channel evidence before promoting a winning motion.",
    } satisfies VectorState;
    return emit(
      "vector_competitor_map",
      {
        title: "Competitor Map",
        summary: "Competitor structure has been reconciled into the research memo and market memo.",
        decisions: [
          `Direct competitors: ${nextResearchMemo.competitors.length}`,
          `Substitutes: ${nextResearchMemo.substitutes.length}`,
          `Workflow competitors: ${nextResearchMemo.workflow_competitors.length}`,
          `Attention competitors: ${nextResearchMemo.attention_competitors.length}`,
        ],
        next_actions: [
          "Link the strongest evidence ids to channel observations.",
          "Use unresolved unknowns as blockers before scaling the thesis.",
        ],
        state_delta: { market_memo: marketMemo, research_memo: nextResearchMemo },
        payload: nextResearchMemo,
      },
      nextState,
    );
  },
);
registerVectorTool(
  "vector_channel_evidence",
  {
    description: "Store evidence-backed channel observations that drive evidence-first scoring.",
    inputSchema: {
      channel: z.string().describe("The channel being evaluated."),
      icp_presence: ResearchDimensionSchema.describe("Observed buyer presence in this channel."),
      trust_match: ResearchDimensionSchema.describe("Observed trust match for this channel."),
      speed_to_signal: ResearchDimensionSchema.describe("Observed speed to first signal."),
      cost_to_test: ResearchDimensionSchema.describe("Observed cost or friction to test."),
      founder_advantage: ResearchDimensionSchema.describe("Observed founder edge in this channel."),
      evidence_ids: z.array(z.string()).min(1).describe("Evidence ids supporting this observation."),
      benchmark_key: z.string().optional().describe("Optional benchmark library key; defaults to channel."),
      notes: z.string().optional().describe("Short analyst notes."),
    },
  },
  async (args: any) => {
    ensureToolPhase("vector_channel_evidence");
    const cleaned = sanitizeRecursive(args) as z.infer<typeof ResearchChannelObservationSchema>;
    const existingMemo = VECTOR_STATE.research_memo;
    const existing = existingMemo ?? ResearchMemoSchema.parse({
      question: "Channel evidence",
      synthesis: "",
      recommendation: "",
      next_experiment: "",
      updated_at: now(),
    });
    const missingEvidence = cleaned.evidence_ids.filter((id) => !existing.evidence_table.some((item) => item.id === id));
    if (missingEvidence.length) {
      throw new Error(`Channel evidence references missing evidence ids: ${missingEvidence.join(", ")}`);
    }
    const observation = ResearchChannelObservationSchema.parse({
      ...cleaned,
      benchmark_key: cleaned.benchmark_key ?? cleaned.channel,
      notes: cleaned.notes ?? "",
    });
    const nextResearchMemo = ResearchMemoSchema.parse({
      ...existing,
      channel_observations: upsertChannelObservation(existing.channel_observations, observation),
      updated_at: now(),
    });
    const preview = scoreChannel(cleaned.channel, VECTOR_STATE.stage ?? undefined, nextResearchMemo);
    const nextState = {
      ...VECTOR_STATE,
      research_memo: nextResearchMemo,
      next_action: preview.next_test,
    } satisfies VectorState;
    return emit(
      "vector_channel_evidence",
      {
        title: "Channel Evidence",
        summary: `Stored evidence-backed observation for ${cleaned.channel}.`,
        decisions: [
          `Evidence ids linked: ${cleaned.evidence_ids.length}`,
          `Preview score: ${preview.score}/100`,
          `Benchmark key: ${observation.benchmark_key ?? cleaned.channel}`,
        ],
        next_actions: [
          preview.next_test,
          "Compare this channel against peers only after enough fresh evidence exists.",
        ],
        state_delta: { research_memo: nextResearchMemo },
        payload: { observation, preview },
      },
      nextState,
    );
  },
);
registerVectorTool(
  "vector_research_memo",
  {
    description: "Capture structured research evidence and convert it into a reusable research memo for later channel and venue decisions.",
    inputSchema: {
      question: z.string().describe("The research question being answered."),
      evidence_table: z.array(EvidenceItemSchema).min(1).describe("Observed evidence items with provenance and strength."),
      competitors: z.array(z.string()).optional().describe("Named direct competitors."),
      substitutes: z.array(z.string()).optional().describe("Named substitutes or workarounds."),
      workflow_competitors: z.array(z.string()).optional().describe("Internal workflows competing with the product."),
      attention_competitors: z.array(z.string()).optional().describe("Channels or tools stealing buyer attention."),
      channel_observations: z.array(ResearchChannelObservationSchema).optional().describe("Observed research-derived channel adjustments."),
      venue_observations: z.array(ResearchVenueObservationSchema).optional().describe("Observed research-derived venue adjustments."),
      trust_signals: z.array(z.string()).optional().describe("Trust signals buyers expect."),
      pricing_observations: z.array(z.string()).optional().describe("Observed pricing or packaging notes."),
      customer_language: z.array(z.string()).optional().describe("Repeated customer language or phrases."),
      synthesis: z.string().describe("What the evidence most likely means."),
      recommendation: z.string().describe("The current recommendation from the research pass."),
      risks: z.array(z.string()).optional().describe("Key risks discovered in research."),
      unknowns: z.array(z.string()).optional().describe("Unresolved unknowns still blocking confidence."),
      next_experiment: z.string().describe("The smallest next experiment justified by the evidence."),
    },
  },
  async (args: any) => {
    ensureToolPhase("vector_research_memo");
    const cleaned = sanitizeRecursive(args) as z.infer<typeof ResearchMemoSchema>;
    const normalizedEvidenceTable = (cleaned.evidence_table ?? []).map((item) => EvidenceItemSchema.parse({
      ...item,
      stale_after_days: item.stale_after_days ?? staleAfterDaysFor(item.source_type),
    }));
    const researchMemo = ResearchMemoSchema.parse({
      ...cleaned,
      evidence_table: normalizedEvidenceTable,
      competitors: cleaned.competitors ?? [],
      substitutes: cleaned.substitutes ?? [],
      workflow_competitors: cleaned.workflow_competitors ?? [],
      attention_competitors: cleaned.attention_competitors ?? [],
      channel_observations: cleaned.channel_observations ?? [],
      venue_observations: cleaned.venue_observations ?? [],
      trust_signals: cleaned.trust_signals ?? [],
      pricing_observations: cleaned.pricing_observations ?? [],
      customer_language: cleaned.customer_language ?? [],
      risks: cleaned.risks ?? [],
      unknowns: cleaned.unknowns ?? [],
      updated_at: now(),
    });
    const marketMemo = {
      competitors: researchMemo.competitors,
      substitutes: researchMemo.substitutes,
      workflow_competitors: researchMemo.workflow_competitors,
      attention_competitors: researchMemo.attention_competitors,
      white_space: deriveWhiteSpace(
        researchMemo.competitors,
        researchMemo.substitutes,
        researchMemo.workflow_competitors,
        researchMemo.attention_competitors,
      ),
      unresolved_unknowns: researchMemo.unknowns,
    };
    const nextPhase: z.infer<typeof PhaseSchema> = VECTOR_STATE.phase === "market" ? "channel" : VECTOR_STATE.phase;
    const nextState = {
      ...VECTOR_STATE,
      phase: nextPhase,
      milestone: PHASE_TO_MILESTONE[nextPhase],
      market_memo: marketMemo,
      research_memo: researchMemo,
      next_action: researchMemo.next_experiment,
    } satisfies VectorState;
    return emit(
      "vector_research_memo",
      {
        title: "Research Memo",
        summary: `Research memo captured for question: ${researchMemo.question}`,
        decisions: [
          `Evidence items captured: ${researchMemo.evidence_table.length}`,
          `Channel observations: ${researchMemo.channel_observations.length}`,
          `Venue observations: ${researchMemo.venue_observations.length}`,
          `Recommendation: ${researchMemo.recommendation}`,
        ],
        next_actions: [
          researchMemo.next_experiment,
          "Feed the structured observations into channel and venue scoring before changing the thesis.",
        ],
        state_delta: {
          phase: nextPhase,
          milestone: PHASE_TO_MILESTONE[nextPhase],
          market_memo: marketMemo,
          research_memo: researchMemo,
        },
        payload: researchMemo,
      },
      nextState
    );
  }
);
registerVectorTool(
  "vector_founder_edge_audit",
  {
    description: "Run Founder Edge Audit for candidate channels before channel scoring.",
    inputSchema: {
      channels: z.array(z.string().min(1)).min(1).describe("Channels to audit."),
      assessments: z.array(z.object({
        channel: z.string().min(1),
        network_presence: z.boolean().optional(),
        track_record: z.boolean().optional(),
        credibility_recognizable: z.boolean().optional(),
        speed_advantage: z.boolean().optional(),
        warm_door_opener: z.boolean().optional(),
        notes: z.string().optional(),
      })).optional().describe("Optional per-channel binary assessments. Missing values fall back to prior state or false."),
    },
  },
  async ({ channels, assessments }: any) => {
    ensureToolPhase("vector_founder_edge_audit");
    const cleaned = sanitizeRecursive({ channels, assessments }) as {
      channels: string[];
      assessments?: Array<{
        channel: string;
        network_presence?: boolean;
        track_record?: boolean;
        credibility_recognizable?: boolean;
        speed_advantage?: boolean;
        warm_door_opener?: boolean;
        notes?: string;
      }>;
    };
    const assessmentLookup = new Map(
      (cleaned.assessments ?? []).map((item) => [item.channel.toLowerCase(), item]),
    );
    let nextAudits = [...VECTOR_STATE.founder_edge_audit];
    const results = cleaned.channels.map((channel) => {
      const existing = founderEdgeAuditFor(channel);
      const provided = assessmentLookup.get(channel.toLowerCase());
      const entryWithoutScore = {
        channel,
        network_presence: provided?.network_presence ?? existing?.network_presence ?? false,
        track_record: provided?.track_record ?? existing?.track_record ?? false,
        credibility_recognizable: provided?.credibility_recognizable ?? existing?.credibility_recognizable ?? false,
        speed_advantage: provided?.speed_advantage ?? existing?.speed_advantage ?? false,
        warm_door_opener: provided?.warm_door_opener ?? existing?.warm_door_opener ?? false,
        notes: provided?.notes ?? existing?.notes ?? "",
      };
      const parsed = FounderEdgeAuditEntrySchema.parse({
        ...entryWithoutScore,
        score: computeFounderEdgeScore(entryWithoutScore),
      });
      nextAudits = upsertFounderEdgeAudit(nextAudits, parsed);
      return parsed;
    });
    const strongest = [...results].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] ?? null;
    const nextPhase: z.infer<typeof PhaseSchema> = VECTOR_STATE.phase === "market" ? "channel" : VECTOR_STATE.phase;
    const nextState = {
      ...VECTOR_STATE,
      phase: nextPhase,
      milestone: PHASE_TO_MILESTONE[nextPhase],
      founder_edge_audit: nextAudits,
      next_action: "Run vector_channel_score with the audited channels and stage-weighted scoring.",
    } satisfies VectorState;
    return emit(
      "vector_founder_edge_audit",
      {
        title: "Founder Edge Audit",
        summary: strongest
          ? `${results.length} channel(s) audited. Strongest measured builder advantage: ${strongest.channel} (${strongest.score}/5).`
          : "No channels were audited.",
        decisions: results.map((item) => `${item.channel}: ${item.score}/5 builder advantage`),
        next_actions: [
          "Use these measured builder-advantage scores before ranking channels.",
          "Re-run the audit whenever a new candidate channel is introduced.",
        ],
        state_delta: {
          phase: nextPhase,
          milestone: PHASE_TO_MILESTONE[nextPhase],
          founder_edge_audit: results,
        },
        payload: { audits: results },
      },
      nextState,
    );
  },
);
registerVectorTool(
  "vector_channel_score",
  {
    description: "Score candidate distribution channels and select the best starting motion.",
    inputSchema: {
      channels: z.array(z.string().min(1)).min(1).describe("Candidate channels to evaluate."),
      stage_hint: z.string().optional().describe("Optional stage hint such as prelaunch, live, or post-launch."),
      constraints: z.array(z.string()).optional().describe("Optional constraints like time, budget, or audience size."),
    },
  },
  async ({ channels, stage_hint, constraints }: any) => {
    ensureToolPhase("vector_channel_score");
    const cleaned = sanitizeRecursive({ channels, stage_hint, constraints }) as {
      channels: string[];
      stage_hint?: string;
      constraints?: string[];
    };
    const scored = cleaned.channels.map((channel) => scoreChannel(channel, cleaned.stage_hint, VECTOR_STATE.research_memo));
    const ranked = [...scored].sort((a, b) => b.score - a.score);
    const selected = ranked[0] ?? null;
    const nextPhase: z.infer<typeof PhaseSchema> = "thesis";
    const nextState = {
      ...VECTOR_STATE,
      phase: nextPhase,
      milestone: PHASE_TO_MILESTONE[nextPhase],
      channel_selected: selected?.channel ?? null,
      channel_scores: ranked,
      next_action: selected ? `Build a thesis around ${selected.channel} before entering the venue gate.` : "No channel selected; return to recovery.",
    } satisfies VectorState;
    return emit(
      "vector_channel_score",
      {
        title: "Channel Scorecard",
        summary: selected
          ? `The top channel is ${selected.channel} with a score of ${selected.score}/100.`
          : "No channel could be selected from the provided list.",
        decisions: ranked.map((item) => `${item.channel}: ${item.score}/100 — ${item.reason}`),
        next_actions: selected
          ? [
              `Use ${selected.channel} as the primary motion for the first traction loop.`,
              `Run the next test: ${selected.next_test}`,
            ]
          : ["Gather more candidate channels and rerun the scorecard."],
        state_delta: {
          phase: nextPhase,
          milestone: PHASE_TO_MILESTONE[nextPhase],
          channel_selected: selected?.channel ?? null,
          channel_scores: ranked,
        },
        payload: { scored: ranked, constraints: cleaned.constraints ?? [], selected },
      },
      nextState
    );
  }
);
registerVectorTool(
  "vector_venue_score",
  {
    description: "Score candidate sales venues and select the best conversion surface.",
    inputSchema: {
      venues: z.array(z.string().min(1)).min(1).describe("Candidate venues to evaluate, such as Substack, Ghost, Shopify, or Gumroad."),
      primary_channel: z.string().optional().describe("Optional primary channel used as context for venue fit."),
      stage_hint: z.string().optional().describe("Optional stage hint such as prelaunch or live."),
      constraints: z.array(z.string()).optional().describe("Optional venue constraints like checkout, ownership, or speed."),
    },
  },
  async ({ venues, primary_channel, stage_hint, constraints }: any) => {
    ensureToolPhase("vector_venue_score");
    const cleaned = sanitizeRecursive({ venues, primary_channel, stage_hint, constraints }) as {
      venues: string[];
      primary_channel?: string;
      stage_hint?: string;
      constraints?: string[];
    };
    const scored = cleaned.venues.map((venue) => scoreVenue(venue, cleaned.primary_channel, cleaned.stage_hint, VECTOR_STATE.research_memo));
    const ranked = [...scored].sort((a, b) => b.score - a.score);
    const selected = ranked[0] ?? null;
    const nextState = {
      ...VECTOR_STATE,
      venue_selected: selected?.venue ?? VECTOR_STATE.venue_selected,
      distribution: {
        ...(VECTOR_STATE.distribution ?? defaultDistribution()),
        venue_selected: selected?.venue ?? VECTOR_STATE.distribution?.venue_selected ?? null,
        alternatives: ranked.map((item) => item.venue),
      },
      next_action: selected ? `Use ${selected.venue} as the primary sales venue and validate trust before launch.` : VECTOR_STATE.next_action,
      session: {
        ...(VECTOR_STATE.session ?? defaultSession()),
        kb_synced: false,
        last_sync: null,
        schema_version: CURRENT_VERSION,
      },
    } satisfies VectorState;
    return emit(
      "vector_venue_score",
      {
        title: "Venue Scorecard",
        summary: selected
          ? `The top venue is ${selected.venue} with a score of ${selected.score}/100.`
          : "No venue could be selected from the provided list.",
        decisions: ranked.map((item) => `${item.venue}: ${item.score}/100 — ${item.reason}`),
        next_actions: selected
          ? [
              `Use ${selected.venue} as the conversion surface.`,
              `Run the next test: ${selected.next_test}`,
            ]
          : ["Gather more venue candidates and rerun the scorecard."],
        state_delta: {
          venue_selected: selected?.venue ?? null,
          distribution: {
            venue_selected: selected?.venue ?? null,
            alternatives: ranked.map((item) => item.venue),
          },
        },
        payload: { scored: ranked, selected, constraints: cleaned.constraints ?? [], primary_channel: cleaned.primary_channel ?? null },
      },
      nextState
    );
  }
);
registerVectorTool(
  "vector_route_context",
  {
    description: "Set routing metadata such as persona, mode, platform, and intent without changing phase.",
    inputSchema: {
      persona: PersonaSchema.describe("Routing persona.").optional(),
      mode: ModeSchema.optional().describe("Routing mode."),
      platform: z.string().optional().describe("Platform name."),
      intent: z.string().optional().describe("User intent or task intent."),
      reason: z.string().optional().describe("Why this route was chosen."),
    },
  },
  async ({ persona, mode, platform, intent, reason }: any) => {
    const cleaned = sanitizeRecursive({ persona, mode, platform, intent, reason }) as {
      persona?: z.infer<typeof PersonaSchema>;
      mode?: z.infer<typeof ModeSchema>;
      platform?: string;
      intent?: string;
      reason?: string;
    };
    const nextState = {
      ...VECTOR_STATE,
      routing: {
        ...(VECTOR_STATE.routing ?? defaultRouting(VECTOR_STATE.phase)),
        persona: cleaned.persona ?? VECTOR_STATE.routing?.persona ?? "unknown",
        mode: cleaned.mode ?? VECTOR_STATE.routing?.mode ?? inferModeForPhase(VECTOR_STATE.phase),
        platform: cleaned.platform ?? VECTOR_STATE.routing?.platform ?? null,
        intent: cleaned.intent ?? VECTOR_STATE.routing?.intent ?? null,
        last_router_reason: cleaned.reason ?? VECTOR_STATE.routing?.last_router_reason ?? null,
      },
      session: {
        ...(VECTOR_STATE.session ?? defaultSession()),
        kb_synced: false,
        last_sync: null,
        schema_version: CURRENT_VERSION,
      },
    } satisfies VectorState;
    return emit(
      "vector_route_context",
      {
        title: "Routing Context",
        summary: `Routing metadata has been updated to ${cleaned.mode ?? inferModeForPhase(VECTOR_STATE.phase)}.`,
        decisions: [
          `Persona: ${cleaned.persona ?? VECTOR_STATE.routing?.persona ?? "unknown"}`,
          `Mode: ${cleaned.mode ?? VECTOR_STATE.routing?.mode ?? inferModeForPhase(VECTOR_STATE.phase)}`,
          `Intent: ${cleaned.intent ?? VECTOR_STATE.routing?.intent ?? "not set"}`,
        ],
        next_actions: ["Keep the routing context aligned with the current task.", "Sync KB after the next stable decision."],
        state_delta: { routing: nextState.routing },
        payload: nextState.routing,
      },
      nextState
    );
  }
);
registerVectorTool(
  "vector_strategy_map",
  {
    description: "Render a lightweight Mermaid strategy map from the current VECTOR state.",
    inputSchema: {
      title: z.string().optional().describe("Optional title for the map."),
    },
  },
  async ({ title }: any) => {
    const map = renderStrategyMap(VECTOR_STATE);
    const nextState = {
      ...VECTOR_STATE,
      artifact_registry: {
        ...(VECTOR_STATE.artifact_registry ?? defaultArtifactRegistry()),
        strategy_map: {
          title: title ?? "Strategy Map",
          summary: "Mermaid strategy map rendered from the current state.",
          artifact_type: "strategy_map",
          phase: VECTOR_STATE.phase,
          updated_at: now(),
          version: CURRENT_VERSION,
        },
      },
    } satisfies VectorState;
    return emit(
      "vector_strategy_map",
      {
        title: title ?? "Strategy Map",
        summary: "A Mermaid strategy map has been rendered from the current state.",
        decisions: [
          `Phase: ${VECTOR_STATE.phase}`,
          `Channel: ${VECTOR_STATE.channel_selected ?? VECTOR_STATE.thesis_card?.primary_channel ?? "not set"}`,
          `Venue: ${VECTOR_STATE.venue_selected ?? VECTOR_STATE.venue_card?.sales_venue ?? "not set"}`,
        ],
        next_actions: ["Paste the Mermaid block into a renderer.", "Use the map as a visual check on the strategy chain."],
        state_delta: { mermaid: map },
        payload: { mermaid: map },
      },
      nextState
    );
  }
);
registerVectorTool(
  "vector_graph_sync",
  {
    description: "Sync the current authoritative snapshot into advisory graph memory with provenance-linked nodes and edges.",
    inputSchema: {
      reason: z.string().optional().describe("Optional reason for this graph sync."),
    },
  },
  async ({ reason }: any) => {
    const graph = VectorGraphMemorySchema.parse(
      syncGraphFromState(VECTOR_STATE, GRAPH_MEMORY, reason ? `vector_graph_sync:${reason}` : "vector_graph_sync", now()),
    );
    await saveGraphMemory(graph);
    return {
      content: [{ type: "text", text: artifactToText({
        title: "Graph Memory Sync",
        summary: "Snapshot state has been projected into advisory graph memory.",
        decisions: [
          `Graph nodes: ${graph.nodes.length}`,
          `Graph edges: ${graph.edges.length}`,
          `Snapshot phase remains authoritative: ${VECTOR_STATE.phase}`,
        ],
        next_actions: [
          "Use vector_graph_query to inspect longitudinal memory with provenance.",
          "Keep workflow decisions anchored in vector_state.json, not graph memory.",
        ],
        state_delta: {
          graph_updated_at: graph.updated_at,
          graph_node_count: graph.nodes.length,
          graph_edge_count: graph.edges.length,
        },
        payload: {
          reason: reason ?? null,
          latest_sync: graph.sync_history.at(-1) ?? null,
        },
      }) }],
    };
  },
);
registerVectorTool(
  "vector_graph_query",
  {
    description: "Query advisory graph memory by node id, entity type, or free-text search. Returns provenance-linked nodes and edges.",
    inputSchema: {
      node_id: z.string().optional().describe("Exact graph node id."),
      entity_type: GraphEntityTypeSchema.optional().describe("Optional graph entity type filter."),
      search: z.string().optional().describe("Free-text search against id, label, and summary."),
      limit: z.number().int().positive().max(25).optional().describe("Maximum nodes to return."),
    },
  },
  async ({ node_id, entity_type, search, limit }: any) => {
    const cleaned = sanitizeRecursive({ node_id, entity_type, search, limit }) as {
      node_id?: string;
      entity_type?: z.infer<typeof GraphEntityTypeSchema>;
      search?: string;
      limit?: number;
    };
    const { nodes: matchedNodes, edges: relatedEdges } = queryGraph(GRAPH_MEMORY, cleaned);
    return {
      content: [{ type: "text", text: artifactToText({
        title: "Graph Memory Query",
        summary: `Returned ${matchedNodes.length} node(s) and ${relatedEdges.length} related edge(s) from advisory graph memory.`,
        decisions: matchedNodes.map((node) => `${node.id} | ${node.entity_type} | provenance=${node.provenance.length}`),
        next_actions: [
          "Use node provenance to trace every graph fact back to snapshot state or captured evidence.",
          "Do not treat graph query output as a workflow phase override.",
        ],
        state_delta: {
          matched_node_count: matchedNodes.length,
          matched_edge_count: relatedEdges.length,
        },
        payload: {
          query: cleaned,
          nodes: matchedNodes,
          edges: relatedEdges,
        },
      }) }],
    };
  },
);
registerVectorTool(
  "vector_sync_kb",
  {
    description: "Mark the current runtime state as synchronized back to the knowledge base.",
    inputSchema: {
      note: z.string().optional().describe("Optional sync note."),
    },
  },
  async ({ note }: any) => {
    const cleaned = sanitizeRecursive({ note }) as { note?: string };

    // [ADR-002] KB-to-State Drift Prevention
    if (RUNTIME.readKbContent) {
      try {
        const kbData = await RUNTIME.readKbContent();
        if (kbData) {
          const phaseMatch = kbData.match(/phase:\s*([a-z_]+)/i);
          if (phaseMatch && phaseMatch[1]) {
            const kbPhase = phaseMatch[1].trim().toLowerCase();
            if (kbPhase !== VECTOR_STATE.phase) {
              throw new Error(`State Drift Detected [ADR-002]: KNOWLEDGE_BASE.md indicates phase '${kbPhase}', but MCP Server is in phase '${VECTOR_STATE.phase}'. Please use the appropriate vector_* tools to advance the state, instead of modifying the Markdown file manually.`);
            }
          }
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes("State Drift Detected")) {
          throw e; // Rethrow drift errors to the LLM
        }
      }
    }

    const nextState = {
      ...VECTOR_STATE,
      session: {
        ...(VECTOR_STATE.session ?? defaultSession()),
        kb_synced: true,
        last_sync: now(),
        confidence_delta: VECTOR_STATE.session?.confidence_delta ?? null,
        schema_version: CURRENT_VERSION,
      },
      artifact_registry: {
        ...(VECTOR_STATE.artifact_registry ?? defaultArtifactRegistry()),
        decision_memo: {
          title: "KB Sync",
          summary: cleaned.note ?? "State synchronized back to the knowledge base.",
          artifact_type: "decision_memo",
          phase: VECTOR_STATE.phase,
          updated_at: now(),
          version: CURRENT_VERSION,
        },
      },
    } satisfies VectorState;
    return emit(
      "vector_sync_kb",
      {
        title: "KB Sync",
        summary: cleaned.note ?? "State synchronized back to the knowledge base.",
        decisions: ["session.kb_synced set to true", `Last sync: ${nextState.session.last_sync}`],
        next_actions: ["Continue from the synced snapshot.", "Re-run sync after the next major decision."],
        state_delta: { session: nextState.session },
        payload: { note: cleaned.note ?? null },
      },
      nextState
    );
  }
);
registerVectorTool(
  "vector_thesis",
  {
    description: "Commit the chosen channel into a thesis card with evidence, reversibility, and unlock conditions.",
    inputSchema: {
      product: z.string().optional().describe("Optional product name or shorthand."),
      primary_channel: z.string().describe("The selected primary channel."),
      why_this_channel: z.string().describe("Why this channel is the right bet now."),
      angle: z.string().describe("The primary angle or message frame."),
      unfair_advantage: z.string().optional().describe("Why the founder has an edge here."),
      growth_multiplier: z.string().describe("Why this thesis could compound after validation."),
      unlock_condition: z.string().describe("What must be true before the multiplier opens."),
      reversibility: z.string().optional().describe("How the thesis can be reversed if signal fails."),
      evidence_used: z.array(z.string()).optional().describe("Evidence that justifies the thesis."),
      alternatives_rejected: z.array(z.string()).optional().describe("Alternatives that were explicitly rejected."),
      confidence: z.number().min(0).max(1).optional().describe("Confidence in the thesis.")
    },
  },
  async (args: any) => {
    ensureToolPhase("vector_thesis");
    const cleaned = sanitizeRecursive(args) as {
      product?: string;
      primary_channel: string;
      why_this_channel: string;
      angle: string;
      unfair_advantage?: string;
      growth_multiplier: string;
      unlock_condition: string;
      reversibility?: string;
      evidence_used?: string[];
      alternatives_rejected?: string[];
      confidence?: number;
    };
    const thesis_card = {
      product: cleaned.product ?? VECTOR_STATE.product_description ?? "",
      primary_channel: cleaned.primary_channel,
      why_this_channel: cleaned.why_this_channel,
      angle: cleaned.angle,
      unfair_advantage: cleaned.unfair_advantage ?? "",
      growth_multiplier: cleaned.growth_multiplier,
      unlock_condition: cleaned.unlock_condition,
      reversibility: cleaned.reversibility ?? "",
      evidence_used: cleaned.evidence_used ?? [],
      alternatives_rejected: cleaned.alternatives_rejected ?? [],
      confidence: cleaned.confidence ?? 0.5,
    };
    const nextPhase: z.infer<typeof PhaseSchema> = "venue";
    const nextState = {
      ...VECTOR_STATE,
      phase: nextPhase,
      milestone: PHASE_TO_MILESTONE[nextPhase],
      channel_selected: thesis_card.primary_channel,
      thesis_card,
      venue_selected: null,
      venue_card: null,
      sales_copy: null,
      copy_review: null,
      next_action: "Run the venue gate separately. Do not move to signal or copy until the venue card is complete.",
    } satisfies VectorState;
    return emit(
      "vector_thesis",
      {
        title: "Thesis Card",
        summary: `The thesis is now committed around ${thesis_card.primary_channel}.`,
        decisions: [
          `Primary channel: ${thesis_card.primary_channel}`,
          `Growth multiplier: ${thesis_card.growth_multiplier}`,
          `Unlock condition: ${thesis_card.unlock_condition}`,
        ],
        next_actions: [
          "Use the separate venue gate to define where money changes hands.",
          "Do not move to signal or copy until the venue card is complete.",
        ],
        state_delta: {
          phase: nextPhase,
          milestone: PHASE_TO_MILESTONE[nextPhase],
          channel_selected: thesis_card.primary_channel,
          thesis_card,
        },
        payload: thesis_card,
      },
      nextState
    );
  }
);
registerVectorTool(
  "vector_venue",
  {
    description: "Define the separate venue gate: where the offer converts and how the product is packaged.",
    inputSchema: {
      sales_venue: z.string().describe("Where the offer should convert."),
      entry_offer: z.string().describe("Low-friction entry offer."),
      core_offer: z.string().describe("Core offer or product."),
      upsell_offer: z.string().optional().describe("Upsell or expansion offer."),
      trust_signal_needed: z.string().describe("The trust signal required before launch."),
      venue_risk: z.string().describe("The main structural risk of the venue."),
      icp_drift_check: z.string().describe("How to check whether the ICP still matches."),
      primary_cta: z.string().optional().describe("Primary conversion CTA."),
    },
  },
  async (args: any) => {
    ensureToolPhase("vector_venue");
    if (!VECTOR_STATE.thesis_card) {
      throw new Error("Venue gate requires an existing thesis card. Run vector_thesis first.");
    }
    const cleaned = sanitizeRecursive(args) as {
      sales_venue: string;
      entry_offer: string;
      core_offer: string;
      upsell_offer?: string;
      trust_signal_needed: string;
      venue_risk: string;
      icp_drift_check: string;
      primary_cta?: string;
    };
    const venue_card = {
      sales_venue: cleaned.sales_venue,
      entry_offer: cleaned.entry_offer,
      core_offer: cleaned.core_offer,
      upsell_offer: cleaned.upsell_offer ?? "",
      trust_signal_needed: cleaned.trust_signal_needed,
      venue_risk: cleaned.venue_risk,
      icp_drift_check: cleaned.icp_drift_check,
      primary_cta: cleaned.primary_cta ?? "",
    };
    const nextPhase: z.infer<typeof PhaseSchema> = "signal";
    const nextState = {
      ...VECTOR_STATE,
      phase: nextPhase,
      milestone: PHASE_TO_MILESTONE[nextPhase],
      venue_selected: venue_card.sales_venue,
      venue_card,
      sales_copy: null,
      copy_review: null,
      next_action: "Review real-world signal against the thesis and package the winning angle into sales copy.",
    } satisfies VectorState;
    return emit(
      "vector_venue",
      {
        title: "Venue Card",
        summary: `The venue gate is now explicit: ${venue_card.sales_venue}.`,
        decisions: [
          `Sales venue: ${venue_card.sales_venue}`,
          `Trust signal needed: ${venue_card.trust_signal_needed}`,
          `Venue risk: ${venue_card.venue_risk}`,
        ],
        next_actions: [
          "Validate that the trust signal exists before launch.",
          "Move into signal review only after the thesis and venue are both documented.",
        ],
        state_delta: {
          phase: nextPhase,
          milestone: PHASE_TO_MILESTONE[nextPhase],
          venue_selected: venue_card.sales_venue,
          venue_card,
        },
        payload: venue_card,
      },
      nextState
    );
  }
);
registerVectorTool(
  "vector_signal_review",
  {
    description: "Review live signal, classify it into green/yellow/red, and decide the next move.",
    inputSchema: {
      green: z.array(z.string()).optional().default([]).describe("Positive signals observed."),
      yellow: z.array(z.string()).optional().default([]).describe("Ambiguous signals observed."),
      red: z.array(z.string()).optional().default([]).describe("Negative signals observed."),
      sample_size: z.number().int().nonnegative().optional().describe("How many observations were reviewed."),
      notes: z.array(z.string()).optional().describe("Analyst notes."),
    },
  },
  async ({ green, yellow, red, sample_size, notes }: any) => {
    ensureToolPhase("vector_signal_review");
    const cleaned = sanitizeRecursive({ green, yellow, red, sample_size, notes }) as {
      green?: string[];
      yellow?: string[];
      red?: string[];
      sample_size?: number;
      notes?: string[];
    };
    const positives = (cleaned.green ?? []).map((item) => signalItem(item, "review", 0.8, "green"));
    const ambers = (cleaned.yellow ?? []).map((item) => signalItem(item, "review", 0.6, "yellow"));
    const negatives = (cleaned.red ?? []).map((item) => signalItem(item, "review", 0.3, "red"));
    const redCount = negatives.length;
    const greenCount = positives.length;
    const nextPhase: z.infer<typeof PhaseSchema> = redCount > greenCount ? "recovery" : "signal";
    const ledgerEntry = {
      when: now(),
      action: "signal_review",
      note: cleaned.notes?.join(" | ") ?? "",
      phase: VECTOR_STATE.phase,
      milestone: PHASE_TO_MILESTONE[nextPhase],
      channel: VECTOR_STATE.channel_selected ?? VECTOR_STATE.thesis_card?.primary_channel ?? "",
      venue: VECTOR_STATE.venue_selected ?? VECTOR_STATE.venue_card?.sales_venue ?? "",
      sample_size: cleaned.sample_size ?? (positives.length + ambers.length + negatives.length),
      green_count: positives.length,
      yellow_count: ambers.length,
      red_count: negatives.length,
      drift_status: redCount > greenCount ? "observed" : VECTOR_STATE.risk.drift_status,
      decision_impact: redCount > greenCount ? "recovery_recommended" : "continue_signal_loop",
      next_action: redCount > greenCount
        ? "Inspect the weakest assumption before another scaling attempt."
        : "Continue signal collection and tighten the winning pattern.",
    } satisfies z.infer<typeof ExperimentEntrySchema>;
    const nextState = {
      ...VECTOR_STATE,
      phase: nextPhase,
      milestone: PHASE_TO_MILESTONE[nextPhase],
      signals: {
        green: [...VECTOR_STATE.signals.green, ...positives].slice(-100),
        yellow: [...VECTOR_STATE.signals.yellow, ...ambers].slice(-100),
        red: [...VECTOR_STATE.signals.red, ...negatives].slice(-100),
      },
      icp_drift: redCount > greenCount ? "observed" : VECTOR_STATE.icp_drift,
      trauma_log: redCount > greenCount
        ? [
            ...VECTOR_STATE.trauma_log,
            {
              when: now(),
              what: "Signal review detected more negative than positive evidence.",
              why_failed: "Recovery route recommended because the current thesis is underperforming.",
              phase: VECTOR_STATE.phase,
            },
          ].slice(-50)
        : VECTOR_STATE.trauma_log,
      experiment_ledger: {
        ...(VECTOR_STATE.experiment_ledger ?? { active: [], archived: [] }),
        active: [
          ...(VECTOR_STATE.experiment_ledger?.active ?? []),
          ledgerEntry,
        ].slice(-100),
        archived: VECTOR_STATE.experiment_ledger?.archived ?? [],
      },
      next_action: redCount > greenCount
        ? "Route into recovery: inspect ICP, channel fit, and venue friction before another scaling attempt."
        : "Continue signal collection and tighten the winning pattern.",
    } satisfies VectorState;
    return emit(
      "vector_signal_review",
      {
        title: "Signal Review Memo",
        summary: redCount > greenCount
          ? "The signal distribution is weak enough to justify a recovery step."
          : "The signal distribution is net positive; continue tightening the motion.",
        decisions: [
          `Sample size: ${cleaned.sample_size ?? (positives.length + ambers.length + negatives.length)}`,
          `Green: ${positives.length}`,
          `Yellow: ${ambers.length}`,
          `Red: ${negatives.length}`,
          `Next phase: ${nextPhase}`,
        ],
        next_actions: redCount > greenCount
          ? [
              "Return to recovery and inspect the weakest assumption first.",
              "Do not scale the motion before the recovery loop produces a stronger signal.",
            ]
          : [
              "Double down on the strongest conversion path.",
              "Preserve the winning message and keep collecting evidence.",
            ],
        state_delta: {
          phase: nextPhase,
          milestone: PHASE_TO_MILESTONE[nextPhase],
          icp_drift: redCount > greenCount ? "observed" : VECTOR_STATE.icp_drift,
          experiment_ledger_added: ledgerEntry,
          signals_added: {
            green: positives.length,
            yellow: ambers.length,
            red: negatives.length,
          },
        },
        payload: { green: positives, yellow: ambers, red: negatives, notes: cleaned.notes ?? [] },
      },
      nextState
    );
  }
);
registerVectorTool(
  "vector_sales_copy",
  {
    description: "Package the validated thesis into launch-ready sales copy, DM copy, or landing copy.",
    inputSchema: {
      desired_conversion_step: z.string().optional().describe("Primary conversion step the copy should drive."),
      angle: z.string().describe("The core sales angle."),
      headline: z.string().describe("Primary headline."),
      subheadline: z.string().describe("Supporting subheadline."),
      body: z.string().describe("Main sales body."),
      cta: z.string().describe("Primary call to action."),
      objections: z.array(z.string()).optional().describe("Likely objections to answer."),
      followup_ladder: z.array(z.string()).optional().describe("Follow-up sequence or ladder."),
    },
  },
  async ({ desired_conversion_step, angle, headline, subheadline, body, cta, objections, followup_ladder }: any) => {
    ensureToolPhase("vector_sales_copy");
    if (!VECTOR_STATE.thesis_card || !VECTOR_STATE.venue_card) {
      throw new Error("Sales copy requires both thesis_card and venue_card. Lock the venue gate first.");
    }
    if (!VECTOR_STATE.icp.forces.anxiety?.trim() || !VECTOR_STATE.icp.forces.habit?.trim()) {
      throw new Error("Sales copy requires ICP 4 Forces, especially anxiety and habit, before running objection protocol.");
    }
    const cleaned = sanitizeRecursive({ desired_conversion_step, angle, headline, subheadline, body, cta, objections, followup_ladder }) as {
      desired_conversion_step?: string;
      angle: string;
      headline: string;
      subheadline: string;
      body: string;
      cta: string;
      objections?: string[];
      followup_ladder?: string[];
    };
    const { sales_copy, objection_map } = buildSalesCopyPack(VECTOR_STATE, cleaned);
    const nextState = {
      ...VECTOR_STATE,
      sales_copy,
      objection_map,
      copy_review: null,
      next_action: "Run vector_copy_review before shipping or rendering assets from this copy pack.",
    } satisfies VectorState;
    return emit(
      "vector_sales_copy",
      {
        title: "Sales Copy Pack",
        summary: "The validated thesis has been packaged into a usable sales copy artifact.",
        decisions: [
          `Angle: ${sales_copy.angle}`,
          `CTA: ${sales_copy.cta}`,
          `Objections covered: ${sales_copy.objections.length}`,
          `Primary objection: ${objection_map.primary_objection}`,
        ],
        next_actions: [
          "Run vector_copy_review before shipping this copy.",
          "Only render or deploy assets after copy_review returns ship_ready=true.",
        ],
        state_delta: { sales_copy, objection_map, copy_review: null },
        payload: sales_copy,
      },
      nextState
    );
  }
);
registerVectorTool(
  "vector_copy_review",
  {
    description: "Review the current sales copy against thesis, objection, trust, and venue fit before shipping.",
    inputSchema: {},
  },
  async () => {
    ensureToolPhase("vector_copy_review");
    if (!VECTOR_STATE.sales_copy) {
      throw new Error("Copy review requires an existing sales_copy artifact. Run vector_sales_copy first.");
    }
    const copy_review = CopyReviewSchema.parse(reviewSalesCopyPack(VECTOR_STATE, now()));
    const nextState = {
      ...VECTOR_STATE,
      copy_review,
      next_action: copy_review.ship_ready
        ? `Ship ${copy_review.first_test_variant} first and collect signal in the selected venue.`
        : copy_review.recommendations[0] ?? "Revise the copy pack before shipping.",
    } satisfies VectorState;
    return emit(
      "vector_copy_review",
      {
        title: "Copy Review",
        summary: copy_review.ship_ready
          ? `Copy is ship-ready with score ${copy_review.overall_score}/100.`
          : `Copy review found quality gaps with score ${copy_review.overall_score}/100.`,
        decisions: [
          `Ship ready: ${copy_review.ship_ready}`,
          `First test variant: ${copy_review.first_test_variant}`,
          `Failed checks: ${copy_review.failed_checks.length}`,
        ],
        next_actions: copy_review.recommendations,
        state_delta: { copy_review },
        payload: copy_review,
      },
      nextState,
    );
  },
);
registerVectorTool(
  "vector_update_state",
  {
    description: "Apply a validated patch to VECTOR state while preserving phase discipline.",
    inputSchema: {
      metadata: z.object({
        language: z.string().optional(),
        notes_language: z.string().optional(),
        version: z.string().optional(),
      }).optional(),
      phase: PhaseSchema.optional(),
      milestone: MilestoneSchema.optional(),
      stage: StageSchema.optional(),
      icp_confirmed: z.boolean().optional(),
      routing: z.object({
        persona: PersonaSchema.optional(),
        mode: ModeSchema.optional(),
        platform: z.string().nullable().optional(),
        intent: z.string().nullable().optional(),
        last_router_reason: z.string().nullable().optional(),
      }).optional(),
      product: ProductStateSchema.partial().optional(),
      icp: ICPStateSchema.partial().optional(),
      distribution: DistributionStateSchema.partial().optional(),
      confidence: z.object({
        current_phase: z.number().nullable().optional(),
        overall: ConfidenceLevelSchema.optional(),
      }).optional(),
      risk: z.object({
        riskiest_assumption: z.string().nullable().optional(),
        top_failure_mode: z.string().nullable().optional(),
        drift_status: DriftStatusSchema.optional(),
      }).optional(),
      channel_selected: z.string().nullable().optional(),
      venue_selected: z.string().nullable().optional(),
      riskiest_assumption: z.string().nullable().optional(),
      icp_drift: z.string().optional(),
      next_action: z.string().nullable().optional(),
    },
  },
  async (patch: any) => {
    const cleaned = sanitizeRecursive(patch) as Partial<VectorState>;
    validatePhaseTransition(cleaned.phase);
    const nextState = {
      ...VECTOR_STATE,
      ...cleaned,
      metadata: cleaned.metadata ?? VECTOR_STATE.metadata,
      stage: cleaned.stage ?? (cleaned.phase ? phaseToStage(cleaned.phase) : VECTOR_STATE.stage),
      milestone: cleaned.phase ? PHASE_TO_MILESTONE[cleaned.phase] : (cleaned.milestone ?? VECTOR_STATE.milestone),
      updated_at: now(),
    } satisfies VectorState;
    assertPhasePrerequisites(nextState.phase, syncCanonicalViews(nextState));
    return emit(
      "vector_update_state",
      {
        title: "State Patch Applied",
        summary: "VECTOR state has been patched with validated fields.",
        decisions: [
          `Phase: ${nextState.phase}`,
          `Milestone: ${nextState.milestone}`,
        ],
        next_actions: ["Continue with the next allowed phase."],
        state_delta: patch,
        payload: patch,
      },
      nextState
    );
  }
);
registerVectorTool(
  "vector_state_snapshot",
  {
    description: "Return the current VECTOR state snapshot for downstream inspection or debugging.",
    inputSchema: {},
  },
  async () => {
    const snapshot = VECTOR_STATE;
    return {
      content: [{ type: "text", text: artifactToText({
        title: "VECTOR State Snapshot",
        summary: "Current durable state snapshot.",
        decisions: [
          `Version: ${snapshot.metadata.version}`,
          `Language: ${snapshot.metadata.language}`,
          `Phase: ${snapshot.phase}`,
          `Milestone: ${snapshot.milestone}`,
          `Stage: ${snapshot.stage ?? "none"}`,
          `ICP confirmed: ${snapshot.icp_confirmed}`,
          `Channel selected: ${snapshot.channel_selected ?? "none"}`,
          `Venue selected: ${snapshot.venue_selected ?? "none"}`,
          `KB synced: ${snapshot.session.kb_synced}`,
        ],
        next_actions: [snapshot.next_action ?? "No next action queued."],
        state_delta: snapshot,
        payload: snapshot,
      }) }],
    };
  }
);
registerVectorTool(
  "vector_render_media",
  {
    description: "Return a structured media spec that downstream renderers can consume.",
    inputSchema: MediaSpecSchema.shape,
  },
  async (args: any) => {
    ensureToolPhase("vector_render_media");
    const cleaned = sanitizeRecursive(args) as z.infer<typeof MediaSpecSchema>;
    const review = requireShipReadyCopyReview();
    return {
      content: [{
        type: "text",
        text: artifactToText({
          title: "Media Spec",
          summary: `A structured spec for ${cleaned.artifact_type} has been prepared for downstream rendering.`,
          decisions: [
            `Artifact type: ${cleaned.artifact_type}`,
            `Copy review score: ${review.overall_score}/100`,
            `Approved first variant: ${review.first_test_variant}`,
            `Style keys: ${Object.keys(cleaned.style_spec ?? {}).join(", ") || "none"}`,
          ],
          next_actions: ["Pass this spec to a dedicated image/video renderer.", "Keep the output as a design contract rather than a final asset."],
          state_delta: { media_spec: cleaned },
          payload: cleaned,
        }),
      }],
    };
  }
);
async function initializeVectorRuntime(): Promise<VectorState> {
  RUNTIME = {
    serverName: "vector-gtm-os",
    runtimeLabel: "VECTOR runtime",
    version: VECTOR_VERSION,
    logger: console,
    ...initialOptions,
  };
  CURRENT_VERSION = RUNTIME.version ?? VECTOR_VERSION;
  CAPABILITY_STATE = {
    toolsets: resolveToolsets(RUNTIME.capabilityMode?.toolsets),
    safeMode: Boolean(RUNTIME.capabilityMode?.safeMode),
  };
  registerRuntimeTools();
  VECTOR_STATE = await loadState();
  GRAPH_MEMORY = await loadGraphMemory();
  VECTOR_STATE = VectorStateSchema.parse({ ...defaultState(), ...VECTOR_STATE, version: CURRENT_VERSION, updated_at: now() });
  await saveState(VECTOR_STATE);
  return VECTOR_STATE;
}
async function connectVectorRuntime(transport: Transport): Promise<void> {
  await SERVER.connect(transport);
}
function getVectorServer(): McpServer {
  return SERVER;
}
function getVectorState(): VectorState {
  return VECTOR_STATE;
}
function getVectorGraphMemory(): VectorGraphMemory {
  return GRAPH_MEMORY;
}
function getVectorCapabilityMode(): { toolsets: CapabilityToolset[]; safeMode: boolean } {
  return {
    toolsets: [...CAPABILITY_STATE.toolsets],
    safeMode: CAPABILITY_STATE.safeMode,
  };
}
function vectorRoleHints(): string {
  return roleHints();
}
return {
  initialize: initializeVectorRuntime,
  connect: connectVectorRuntime,
  getServer: getVectorServer,
  getState: getVectorState,
  getGraphMemory: getVectorGraphMemory,
  getCapabilityMode: getVectorCapabilityMode,
  roleHints: vectorRoleHints,
};
}
