import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { VectorError } from "./core_error_codes.js";
import { createArtifactEmitter, artifactToText } from "./core_artifact_emit.js";
import { registerAdminTools } from "./core_admin_tools.js";
import { registerCopyTools } from "./core_copy_tools.js";
import { computeFounderEdgeScore, founderEdgeAuditFor as findFounderEdgeAudit, upsertFounderEdgeAudit } from "./core_founder_edge_helpers.js";
import { ensureToolPhase as ensureToolPhaseGuard, requireShipReadyCopyReview as requireShipReadyCopyReviewGuard, sanitizeRecursive } from "./core_guard_helpers.js";
import { registerGraphTools } from "./core_graph_tools.js";
import { createIdempotencyRuntime, withRequestSchema } from "./core_idempotency.js";
import { registerResearchTools } from "./core_research_tools.js";
import {
  ArtifactRegistrySchema,
  ChannelScoreSchema,
  ConfidenceLevelSchema,
  CopyReviewSchema,
  DistributionStateSchema,
  DriftStatusSchema,
  EvidenceItemSchema,
  EvidenceKindSchema,
  EvidenceStrengthSchema,
  EvidenceTagSchema,
  ExperimentEntrySchema,
  FounderEdgeAuditEntrySchema,
  GatesSchema,
  GraphEntityTypeSchema,
  ICPStateSchema,
  MarketStateSchema,
  MediaSpecSchema,
  MilestoneSchema,
  ModeSchema,
  PersonaSchema,
  PhaseSchema,
  PlatformStateSchema,
  ProductStateSchema,
  ResearchChannelObservationSchema,
  ResearchDimensionSchema,
  ResearchMemoSchema,
  ResearchProviderRunSchema,
  ResearchVenueObservationSchema,
  RoutingStateSchema,
  SessionStateSchema,
  SourceTypeSchema,
  StageSchema,
  VECTOR_VERSION,
  VectorGraphMemorySchema,
  VectorStateSchema,
  type ChannelScore,
  type CopyReview,
  type FounderEdgeAuditEntry,
  type Phase,
  type SignalItem,
  type VectorGraphMemory,
  type VectorState,
} from "./core_schemas.js";
import { createStateDefaults } from "./core_state_defaults.js";
import { createStateRuntime } from "./core_state_runtime.js";
import { createToolRegistrar } from "./core_tool_registration.js";
import { createWorkflowHelpers } from "./core_workflow_helpers.js";
import { registerWorkflowTools } from "./core_workflow_tools.js";
import {
  allCapabilityToolsets,
  capabilityPolicy,
  listToolsetTools,
  resolveToolsets,
  type CapabilityToolset,
} from "./capability_contract.js";
import {
  type RawSourcePayload,
} from "./research_provider_contract.js";
import {
  getSearchProvider,
  listSearchProviders,
  defaultSearchProviderId,
} from "./research_providers.js";
import {
  CHANNEL_BENCHMARK_LIBRARY,
  MAX_RESEARCH_EVIDENCE_ITEMS,
  SOURCE_FRESHNESS_DAYS,
  evidenceFreshnessSummary,
  mergeBoundedEvidence,
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
const MAX_PROCESSED_REQUESTS = 500;
const MAX_REQUEST_REGISTRY_ENTRIES = 500;
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
let RUNTIME!: VectorRuntimeOptions;
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
let syncCanonicalViewsRef: ((state: Partial<VectorState>) => VectorState) | null = null;
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
function founderEdgeAuditFor(channel: string): z.infer<typeof FounderEdgeAuditEntrySchema> | null {
  return findFounderEdgeAudit(VECTOR_STATE.founder_edge_audit, channel);
}
const stateDefaults = createStateDefaults({
  currentVersion: () => CURRENT_VERSION,
  now,
  inferModeForPhase,
});
const {
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
} = stateDefaults;

let VECTOR_STATE: VectorState = defaultState();
let GRAPH_MEMORY: VectorGraphMemory = { version: CURRENT_VERSION, updated_at: new Date(0).toISOString(), nodes: [], edges: [], sync_history: [] };
const workflowHelpers = createWorkflowHelpers({
  now,
  getState: () => VECTOR_STATE,
  workflowPhases: WORKFLOW_PHASES,
  phasePolicy,
  phaseToMilestone: PHASE_TO_MILESTONE,
  getSyncCanonicalViews: () => {
    if (!syncCanonicalViewsRef) {
      throw new VectorError(
        "UNKNOWN_ERROR",
        "syncCanonicalViews is not initialized yet.",
        { hint: "Call createVectorRuntime first" }
      );
    }
    return syncCanonicalViewsRef;
  },
  researchChannelAdjustment,
  researchVenueAdjustment,
  founderEdgeAuditFor,
});
const {
  validatePhaseTransition,
  signalItem,
  scoreChannel,
  deriveWhiteSpace,
  mergeUniqueStrings,
  reconcileSessionState,
  assertPhasePrerequisites,
  scoreVenue,
  renderStrategyMap,
} = workflowHelpers;
const stateRuntime = createStateRuntime({
  currentVersion: () => CURRENT_VERSION,
  now,
  logger: () => RUNTIME?.logger,
  telemetry: () => RUNTIME?.telemetry,
  stateStore: {
    load: async () => RUNTIME.stateStore.load(),
    save: async (state) => RUNTIME.stateStore.save(state),
    saveBackup: async (state, previousPhase, nextPhase) => RUNTIME.stateStore.saveBackup?.(state, previousPhase as Phase, nextPhase as Phase),
  },
  graphStore: {
    load: async () => RUNTIME.graphStore.load(),
    save: async (graph) => RUNTIME.graphStore.save(graph),
  },
  getState: () => VECTOR_STATE,
  setState: (state) => {
    VECTOR_STATE = state;
  },
  getGraphMemory: () => GRAPH_MEMORY,
  setGraphMemory: (graph) => {
    GRAPH_MEMORY = graph;
  },
  phaseToStage: (phase) => phaseToStage(phase as z.infer<typeof PhaseSchema>),
  phaseToMilestone: (phase) => PHASE_TO_MILESTONE[phase as z.infer<typeof PhaseSchema>],
  inferModeForPhase: (phase) => inferModeForPhase(phase as z.infer<typeof PhaseSchema>),
  defaultState,
  defaultGraphMemory: () => ({
    version: CURRENT_VERSION,
    updated_at: now(),
    nodes: [],
    edges: [],
    sync_history: [],
  }),
  defaultRouting: (phase) => defaultRouting(phase as z.infer<typeof PhaseSchema> | undefined),
  defaultProduct,
  defaultICP,
  defaultMarket,
  defaultDistribution,
  defaultObjectionMap,
  defaultGates,
  defaultPlatform,
  defaultSession,
  defaultArtifactRegistry,
  stageToCurrentPhaseConfidence: (phase) => stageToCurrentPhaseConfidence(phase as z.infer<typeof PhaseSchema>),
  reconcileSessionState,
  vectorStateSchema: VectorStateSchema,
  vectorGraphMemorySchema: VectorGraphMemorySchema,
});
const {
  syncCanonicalViews,
  loadState,
  loadGraphMemory,
  saveState,
  saveGraphMemory,
  commitState,
} = stateRuntime;
syncCanonicalViewsRef = syncCanonicalViews;
const idempotencyRuntime = createIdempotencyRuntime({
  maxProcessedRequests: MAX_PROCESSED_REQUESTS,
  maxRequestRegistryEntries: MAX_REQUEST_REGISTRY_ENTRIES,
  now,
  logger: () => RUNTIME?.logger,
  loadLatestState: async () => RUNTIME.stateStore.load(),
  saveState,
  syncCanonicalViews,
  getState: () => VECTOR_STATE,
  setState: (state) => {
    VECTOR_STATE = state;
  },
});
const { withIdempotency } = idempotencyRuntime;
const { emit } = createArtifactEmitter({
  now,
  currentVersion: () => CURRENT_VERSION,
  artifactKeyForAction,
  phaseToStage: (phase) => phaseToStage(phase as z.infer<typeof PhaseSchema>),
  defaultSession,
  defaultRouting: (phase) => defaultRouting(phase as z.infer<typeof PhaseSchema> | undefined),
  inferModeForPhase: (phase) => inferModeForPhase(phase as z.infer<typeof PhaseSchema>),
  assertPhasePrerequisites: (targetPhase, candidateState) => assertPhasePrerequisites(targetPhase as z.infer<typeof PhaseSchema>, candidateState),
  syncCanonicalViews,
  commitState,
  getState: () => VECTOR_STATE,
});
const { registerRuntimeTools } = createToolRegistrar({
  currentVersion: () => CURRENT_VERSION,
  serverName: () => RUNTIME.serverName,
  getCapabilityState: () => ({ toolsets: CAPABILITY_STATE.toolsets, safeMode: CAPABILITY_STATE.safeMode }),
  getToolDefinitions: () => TOOL_DEFINITIONS,
  capabilityPolicy: (toolName) => capabilityPolicy(toolName),
  withRequestSchema,
  withIdempotency,
  setServer: (server) => {
    SERVER = server;
  },
});
function ensureToolPhase(toolName: string): void {
  ensureToolPhaseGuard(toolName, VECTOR_STATE.phase, toolPolicy);
}
function requireShipReadyCopyReview(): z.infer<typeof CopyReviewSchema> {
  return requireShipReadyCopyReviewGuard(VECTOR_STATE) as z.infer<typeof CopyReviewSchema>;
}
function roleHints(): string {
  return [
    "Install VECTOR as the runtime, not as a read-only doc set.",
    "Always preserve evidence provenance in downstream artifacts.",
    "Do not skip phase guards unless the server explicitly routes you into recovery.",
  ].join("\n");
}
function registerVectorTool(
  name: string,
  config: { description: string; inputSchema: Record<string, z.ZodTypeAny> },
  handler: (args: any) => Promise<ToolTextResponse>,
): void {
  for (const [field, schema] of Object.entries(config.inputSchema)) {
    const isSchemaObject = Boolean(schema) && typeof schema === "object";
    const hasZodLikeParser = isSchemaObject && ("parse" in schema || "safeParse" in schema);
    if (!hasZodLikeParser) {
      throw new VectorError(
        "UNKNOWN_ERROR",
        `Tool '${name}' has invalid input schema for field '${field}'.`,
        { tool: name, field }
      );
    }
  }
  TOOL_DEFINITIONS.push({ name, config, handler });
}
function capabilityModeText(): string {
  return `${CAPABILITY_STATE.toolsets.join(", ")} | safe_mode=${CAPABILITY_STATE.safeMode ? "on" : "off"}`;
}
// --- TOOLS ---
registerAdminTools({
  registerVectorTool,
  artifactToText,
  getCapabilityState: () => ({ toolsets: CAPABILITY_STATE.toolsets, safeMode: CAPABILITY_STATE.safeMode }),
  allCapabilityToolsets,
  listToolsetTools: (toolset) => listToolsetTools(toolset as CapabilityToolset),
  capabilityPolicy,
  capabilityModeText,
  zod: z,
  phaseSchema: PhaseSchema,
  milestoneSchema: MilestoneSchema,
  stageSchema: StageSchema,
  personaSchema: PersonaSchema,
  modeSchema: ModeSchema,
  productStateSchema: ProductStateSchema,
  icpStateSchema: ICPStateSchema,
  distributionStateSchema: DistributionStateSchema,
  confidenceLevelSchema: ConfidenceLevelSchema,
  driftStatusSchema: DriftStatusSchema,
  getState: () => VECTOR_STATE,
  setState: (state) => {
    VECTOR_STATE = state;
  },
  runtime: () => RUNTIME,
  syncCanonicalViews,
  saveState,
  sanitizeRecursive,
  validatePhaseTransition,
  phaseToStage,
  phaseToMilestone: PHASE_TO_MILESTONE,
  assertPhasePrerequisites,
  emit,
});
registerWorkflowTools({
  registerVectorTool,
  ensureToolPhase,
  sanitizeRecursive,
  emit,
  getState: () => VECTOR_STATE,
  runtime: () => RUNTIME,
  zod: z,
  personaSchema: PersonaSchema,
  modeSchema: ModeSchema,
  stageSchema: StageSchema,
  evidenceTagSchema: EvidenceTagSchema,
  confidenceLevelSchema: ConfidenceLevelSchema,
  founderEdgeAuditEntrySchema: FounderEdgeAuditEntrySchema,
  experimentEntrySchema: ExperimentEntrySchema,
  getCurrentVersion: () => CURRENT_VERSION,
  now,
  phaseToStage,
  inferModeForPhase,
  defaultRouting,
  defaultSession,
  defaultProduct,
  defaultMarket,
  defaultDistribution,
  defaultICP,
  defaultArtifactRegistry,
  phaseToMilestone: PHASE_TO_MILESTONE,
  renderStrategyMap,
  scoreChannel,
  scoreVenue,
  signalItem,
  deriveWhiteSpace,
  founderEdgeAuditFor,
  computeFounderEdgeScore,
  upsertFounderEdgeAudit,
  validatePhaseTransition,
});
registerResearchTools({
  registerVectorTool,
  ensureToolPhase,
  sanitizeRecursive,
  artifactToText,
  emit,
  getState: () => VECTOR_STATE,
  setState: (state) => {
    VECTOR_STATE = state;
  },
  now,
  zod: z,
  listSearchProviders,
  getSearchProvider,
  defaultSearchProviderId,
  mergeResearchMemoFromProvider,
  mergeBoundedEvidence,
  maxResearchEvidenceItems: MAX_RESEARCH_EVIDENCE_ITEMS,
  evidenceItemSchema: EvidenceItemSchema,
  evidenceKindSchema: EvidenceKindSchema,
  sourceTypeSchema: SourceTypeSchema,
  evidenceStrengthSchema: EvidenceStrengthSchema,
  researchProviderRunSchema: ResearchProviderRunSchema,
  researchMemoSchema: ResearchMemoSchema,
  researchChannelObservationSchema: ResearchChannelObservationSchema,
  researchVenueObservationSchema: ResearchVenueObservationSchema,
  staleAfterDaysFor,
  scoreChannel,
  mergeUniqueStrings,
  deriveWhiteSpace,
  upsertChannelObservation,
  defaultResearchMemo: (question) => ResearchMemoSchema.parse({
    question,
    synthesis: "",
    recommendation: "",
    next_experiment: "",
    updated_at: now(),
  }),
  researchDimensionSchema: ResearchDimensionSchema,
});
registerGraphTools({
  registerVectorTool,
  sanitizeRecursive,
  artifactToText,
  now,
  getState: () => VECTOR_STATE,
  getGraphMemory: () => GRAPH_MEMORY,
  saveGraphMemory,
  vectorGraphMemorySchema: VectorGraphMemorySchema,
  syncGraphFromState,
  queryGraph,
  zod: z,
  graphEntityTypeSchema: GraphEntityTypeSchema,
});
registerCopyTools({
  registerVectorTool,
  ensureToolPhase,
  sanitizeRecursive,
  emit,
  artifactToText,
  getState: () => VECTOR_STATE,
  buildSalesCopyPack,
  reviewSalesCopyPack: (state, reviewedAt) => CopyReviewSchema.parse(reviewSalesCopyPack(state, reviewedAt)),
  now,
  requireShipReadyCopyReview,
  zod: z,
  mediaSpecShape: MediaSpecSchema.shape,
});
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
