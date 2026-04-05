export function registerAdminTools(deps: {
  registerVectorTool: (name: string, config: { description: string; inputSchema: Record<string, any> }, handler: (args: any) => Promise<any>) => void;
  artifactToText: (artifact: any) => string;
  getCapabilityState: () => { toolsets: string[]; safeMode: boolean };
  allCapabilityToolsets: () => string[];
  listToolsetTools: (toolset: string) => string[];
  capabilityPolicy: (toolName: string) => { mutates_state?: boolean; safe_mode_blocked?: boolean } | null | undefined;
  capabilityModeText: () => string;
  zod: any;
  phaseSchema: any;
  milestoneSchema: any;
  stageSchema: any;
  personaSchema: any;
  modeSchema: any;
  productStateSchema: any;
  icpStateSchema: any;
  distributionStateSchema: any;
  confidenceLevelSchema: any;
  driftStatusSchema: any;
  getState: () => any;
  setState: (state: any) => void;
  runtime: () => any;
  syncCanonicalViews: (state: any) => any;
  saveState: (state: any) => Promise<void>;
  sanitizeRecursive: (value: unknown, depth?: number) => unknown;
  validatePhaseTransition: (phase: any) => void;
  phaseToStage: (phase: any) => any;
  phaseToMilestone: Record<string, any>;
  assertPhasePrerequisites: (phase: any, candidateState: any) => void;
  emit: (action: string, artifact: any, statePatch: Record<string, unknown>) => Promise<any>;
}) {
  deps.registerVectorTool(
    "vector_list_toolsets",
    {
      description: "List the capability toolsets declared by VECTOR and which ones are enabled in this runtime.",
      inputSchema: {},
    },
    async () => {
      const capabilityState = deps.getCapabilityState();
      const enabled = new Set(capabilityState.toolsets);
      const toolsets = deps.allCapabilityToolsets().map((toolset) => ({
        toolset,
        enabled: enabled.has(toolset),
        tool_count: deps.listToolsetTools(toolset).length,
      }));
      return {
        content: [{ type: "text", text: deps.artifactToText({
          title: "VECTOR Capability Toolsets",
          summary: `Capability-scoped runtime is active: ${deps.capabilityModeText()}.`,
          decisions: toolsets.map((item) => `${item.toolset}: ${item.enabled ? "enabled" : "disabled"} (${item.tool_count} tools)`),
          next_actions: ["Use vector_list_toolset_tools to inspect the tools inside one toolset."],
          state_delta: {
            capability_mode: {
              enabled_toolsets: capabilityState.toolsets,
              safe_mode: capabilityState.safeMode,
            },
          },
          payload: { toolsets, enabled_toolsets: capabilityState.toolsets, safe_mode: capabilityState.safeMode },
        }) }],
      };
    },
  );

  deps.registerVectorTool(
    "vector_list_toolset_tools",
    {
      description: "List the tools that belong to a VECTOR capability toolset.",
      inputSchema: {
        toolset: deps.zod.enum(deps.allCapabilityToolsets() as [string, ...string[]]).describe("Capability toolset to inspect."),
      },
    },
    async ({ toolset }: any) => {
      const tools = deps.listToolsetTools(toolset).map((name) => {
        const policy = deps.capabilityPolicy(name);
        return {
          name,
          mutates_state: policy?.mutates_state ?? false,
          safe_mode_blocked: policy?.safe_mode_blocked ?? false,
        };
      });
      const enabled = deps.getCapabilityState().toolsets.includes(toolset);
      return {
        content: [{ type: "text", text: deps.artifactToText({
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

  deps.registerVectorTool(
    "vector_undo",
    {
      description: "Revert the state to the latest automatic backup (savepoint).",
      inputSchema: {
        reason: deps.zod.string().describe("Why you are reverting the state."),
      },
    },
    async ({ reason }: any) => {
      try {
        const restored = await deps.runtime().stateStore.restoreLatestBackup?.();
        if (!restored) {
          return { content: [{ type: "text", text: "No backups available to undo." }] };
        }
        const nextState = deps.syncCanonicalViews(restored.state);
        deps.setState(nextState);
        await deps.saveState(nextState);
        return { content: [{ type: "text", text: `Successfully reverted state to backup ${restored.label}. Reason: ${reason}` }] };
      } catch (e) {
        return { content: [{ type: "text", text: `Failed to undo: ${e}` }] };
      }
    },
  );

  deps.registerVectorTool(
    "vector_update_state",
    {
      description: "Apply a validated patch to VECTOR state while preserving phase discipline.",
      inputSchema: {
        metadata: deps.zod.object({
          language: deps.zod.string().optional(),
          notes_language: deps.zod.string().optional(),
          version: deps.zod.string().optional(),
        }).optional(),
        phase: deps.phaseSchema.optional(),
        milestone: deps.milestoneSchema.optional(),
        stage: deps.stageSchema.optional(),
        icp_confirmed: deps.zod.boolean().optional(),
        routing: deps.zod.object({
          persona: deps.personaSchema.optional(),
          mode: deps.modeSchema.optional(),
          platform: deps.zod.string().nullable().optional(),
          intent: deps.zod.string().nullable().optional(),
          last_router_reason: deps.zod.string().nullable().optional(),
        }).optional(),
        product: deps.productStateSchema.partial().optional(),
        icp: deps.icpStateSchema.partial().optional(),
        distribution: deps.distributionStateSchema.partial().optional(),
        confidence: deps.zod.object({
          current_phase: deps.zod.number().nullable().optional(),
          overall: deps.confidenceLevelSchema.optional(),
        }).optional(),
        risk: deps.zod.object({
          riskiest_assumption: deps.zod.string().nullable().optional(),
          top_failure_mode: deps.zod.string().nullable().optional(),
          drift_status: deps.driftStatusSchema.optional(),
        }).optional(),
        channel_selected: deps.zod.string().nullable().optional(),
        venue_selected: deps.zod.string().nullable().optional(),
        riskiest_assumption: deps.zod.string().nullable().optional(),
        icp_drift: deps.zod.string().optional(),
        next_action: deps.zod.string().nullable().optional(),
      },
    },
    async (patch: any) => {
      const cleaned = deps.sanitizeRecursive(patch) as Record<string, unknown>;
      deps.validatePhaseTransition(cleaned.phase);
      const current = deps.getState();
      const nextState = {
        ...current,
        ...cleaned,
        metadata: cleaned.metadata ?? current.metadata,
        stage: cleaned.stage ?? (cleaned.phase ? deps.phaseToStage(cleaned.phase) : current.stage),
        milestone: cleaned.phase ? deps.phaseToMilestone[String(cleaned.phase)] : (cleaned.milestone ?? current.milestone),
      };
      deps.assertPhasePrerequisites(nextState.phase, deps.syncCanonicalViews(nextState));
      return deps.emit(
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
        nextState,
      );
    },
  );

  deps.registerVectorTool(
    "vector_state_snapshot",
    {
      description: "Return the current VECTOR state snapshot for downstream inspection or debugging.",
      inputSchema: {},
    },
    async () => {
      const snapshot = deps.getState();
      return {
        content: [{ type: "text", text: deps.artifactToText({
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
    },
  );
}
