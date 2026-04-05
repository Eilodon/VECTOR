import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createArtifactEmitter, artifactToText } from "./core_artifact_emit.js";
import { registerAdminTools } from "./core_admin_tools.js";
import { registerCopyTools } from "./core_copy_tools.js";
import { computeFounderEdgeScore, founderEdgeAuditFor as findFounderEdgeAudit, upsertFounderEdgeAudit } from "./core_founder_edge_helpers.js";
import { ensureToolPhase as ensureToolPhaseGuard, requireShipReadyCopyReview as requireShipReadyCopyReviewGuard, sanitizeRecursive } from "./core_guard_helpers.js";
import { registerGraphTools } from "./core_graph_tools.js";
import { createIdempotencyRuntime, withRequestSchema } from "./core_idempotency.js";
import { registerResearchTools } from "./core_research_tools.js";
import { ConfidenceLevelSchema, CopyReviewSchema, DistributionStateSchema, DriftStatusSchema, EvidenceItemSchema, EvidenceKindSchema, EvidenceStrengthSchema, EvidenceTagSchema, ExperimentEntrySchema, FounderEdgeAuditEntrySchema, GraphEntityTypeSchema, ICPStateSchema, MediaSpecSchema, MilestoneSchema, ModeSchema, PersonaSchema, PhaseSchema, ProductStateSchema, ResearchChannelObservationSchema, ResearchDimensionSchema, ResearchMemoSchema, ResearchProviderRunSchema, ResearchVenueObservationSchema, SourceTypeSchema, StageSchema, VECTOR_VERSION, VectorGraphMemorySchema, VectorStateSchema, } from "./core_schemas.js";
import { createStateDefaults } from "./core_state_defaults.js";
import { createStateRuntime } from "./core_state_runtime.js";
import { createToolRegistrar } from "./core_tool_registration.js";
import { createWorkflowHelpers } from "./core_workflow_helpers.js";
import { registerWorkflowTools } from "./core_workflow_tools.js";
import { allCapabilityToolsets, capabilityPolicy, listToolsetTools, resolveToolsets, } from "./capability_contract.js";
import { getSearchProvider, listSearchProviders, defaultSearchProviderId, } from "./research_providers.js";
import { MAX_RESEARCH_EVIDENCE_ITEMS, mergeBoundedEvidence, mergeResearchMemoFromProvider, researchChannelAdjustment, researchVenueAdjustment, staleAfterDaysFor, upsertChannelObservation, } from "./research_runtime.js";
import { buildSalesCopyPack, reviewSalesCopyPack, } from "./copy_runtime.js";
import { queryGraph, syncGraphFromState, } from "./graph_memory_runtime.js";
import { WORKFLOW_PHASES, artifactKeyForAction, phasePolicy, toolPolicy, } from "./workflow_contract.js";
/**
 * VECTOR MCP Server v2.0.0
 * Capability-scoped, evidence-first GTM runtime.
 */
const MAX_PROCESSED_REQUESTS = 500;
const MAX_REQUEST_REGISTRY_ENTRIES = 500;
export function createVectorRuntime(initialOptions) {
    let CURRENT_VERSION = VECTOR_VERSION;
    let RUNTIME;
    let SERVER = new McpServer({
        name: "vector-gtm-os",
        version: CURRENT_VERSION,
    });
    let CAPABILITY_STATE = {
        toolsets: allCapabilityToolsets(),
        safeMode: false,
    };
    const TOOL_DEFINITIONS = [];
    const PHASE_TO_MILESTONE = Object.fromEntries(WORKFLOW_PHASES.map((phase) => [phase, phasePolicy(phase).milestone]));
    let syncCanonicalViewsRef = null;
    function now() {
        return new Date().toISOString();
    }
    function phaseToStage(phase) {
        return phasePolicy(phase).stage;
    }
    function stageToCurrentPhaseConfidence(phase) {
        return phasePolicy(phase).phase_confidence;
    }
    function inferModeForPhase(phase) {
        return phasePolicy(phase).default_mode;
    }
    function founderEdgeAuditFor(channel) {
        return findFounderEdgeAudit(VECTOR_STATE.founder_edge_audit, channel);
    }
    const stateDefaults = createStateDefaults({
        currentVersion: () => CURRENT_VERSION,
        now,
        inferModeForPhase,
    });
    const { defaultArtifactRegistry, defaultRouting, defaultProduct, defaultICP, defaultMarket, defaultDistribution, defaultObjectionMap, defaultGates, defaultPlatform, defaultSession, defaultState, } = stateDefaults;
    let VECTOR_STATE = defaultState();
    let GRAPH_MEMORY = { version: CURRENT_VERSION, updated_at: new Date(0).toISOString(), nodes: [], edges: [], sync_history: [] };
    const workflowHelpers = createWorkflowHelpers({
        now,
        getState: () => VECTOR_STATE,
        workflowPhases: WORKFLOW_PHASES,
        phasePolicy,
        phaseToMilestone: PHASE_TO_MILESTONE,
        getSyncCanonicalViews: () => {
            if (!syncCanonicalViewsRef) {
                throw new Error("syncCanonicalViews is not initialized yet.");
            }
            return syncCanonicalViewsRef;
        },
        researchChannelAdjustment,
        researchVenueAdjustment,
        founderEdgeAuditFor,
    });
    const { validatePhaseTransition, signalItem, scoreChannel, deriveWhiteSpace, mergeUniqueStrings, reconcileSessionState, assertPhasePrerequisites, scoreVenue, renderStrategyMap, } = workflowHelpers;
    const stateRuntime = createStateRuntime({
        currentVersion: () => CURRENT_VERSION,
        now,
        logger: () => RUNTIME?.logger,
        telemetry: () => RUNTIME?.telemetry,
        stateStore: {
            load: async () => RUNTIME.stateStore.load(),
            save: async (state) => RUNTIME.stateStore.save(state),
            saveBackup: async (state, previousPhase, nextPhase) => RUNTIME.stateStore.saveBackup?.(state, previousPhase, nextPhase),
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
        phaseToStage: (phase) => phaseToStage(phase),
        phaseToMilestone: (phase) => PHASE_TO_MILESTONE[phase],
        inferModeForPhase: (phase) => inferModeForPhase(phase),
        defaultState,
        defaultGraphMemory: () => ({
            version: CURRENT_VERSION,
            updated_at: now(),
            nodes: [],
            edges: [],
            sync_history: [],
        }),
        defaultRouting: (phase) => defaultRouting(phase),
        defaultProduct,
        defaultICP,
        defaultMarket,
        defaultDistribution,
        defaultObjectionMap,
        defaultGates,
        defaultPlatform,
        defaultSession,
        defaultArtifactRegistry,
        stageToCurrentPhaseConfidence: (phase) => stageToCurrentPhaseConfidence(phase),
        reconcileSessionState,
        vectorStateSchema: VectorStateSchema,
        vectorGraphMemorySchema: VectorGraphMemorySchema,
    });
    const { syncCanonicalViews, loadState, loadGraphMemory, saveState, saveGraphMemory, commitState, } = stateRuntime;
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
        phaseToStage: (phase) => phaseToStage(phase),
        defaultSession,
        defaultRouting: (phase) => defaultRouting(phase),
        inferModeForPhase: (phase) => inferModeForPhase(phase),
        assertPhasePrerequisites: (targetPhase, candidateState) => assertPhasePrerequisites(targetPhase, candidateState),
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
    function ensureToolPhase(toolName) {
        ensureToolPhaseGuard(toolName, VECTOR_STATE.phase, toolPolicy);
    }
    function requireShipReadyCopyReview() {
        return requireShipReadyCopyReviewGuard(VECTOR_STATE);
    }
    function roleHints() {
        return [
            "Install VECTOR as the runtime, not as a read-only doc set.",
            "Always preserve evidence provenance in downstream artifacts.",
            "Do not skip phase guards unless the server explicitly routes you into recovery.",
        ].join("\n");
    }
    function registerVectorTool(name, config, handler) {
        for (const [field, schema] of Object.entries(config.inputSchema)) {
            if (!schema || typeof schema !== "object" || !("_zod" in schema)) {
                throw new Error(`Tool '${name}' has invalid input schema for field '${field}'.`);
            }
        }
        TOOL_DEFINITIONS.push({ name, config, handler });
    }
    function capabilityModeText() {
        return `${CAPABILITY_STATE.toolsets.join(", ")} | safe_mode=${CAPABILITY_STATE.safeMode ? "on" : "off"}`;
    }
    // --- TOOLS ---
    registerAdminTools({
        registerVectorTool,
        artifactToText,
        getCapabilityState: () => ({ toolsets: CAPABILITY_STATE.toolsets, safeMode: CAPABILITY_STATE.safeMode }),
        allCapabilityToolsets,
        listToolsetTools: (toolset) => listToolsetTools(toolset),
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
    async function initializeVectorRuntime() {
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
    async function connectVectorRuntime(transport) {
        await SERVER.connect(transport);
    }
    function getVectorServer() {
        return SERVER;
    }
    function getVectorState() {
        return VECTOR_STATE;
    }
    function getVectorGraphMemory() {
        return GRAPH_MEMORY;
    }
    function getVectorCapabilityMode() {
        return {
            toolsets: [...CAPABILITY_STATE.toolsets],
            safeMode: CAPABILITY_STATE.safeMode,
        };
    }
    function vectorRoleHints() {
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
