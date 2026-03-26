export const CAPABILITY_TOOLSETS = {
    core: [
        "vector_intake",
        "vector_icp_jtbd",
        "vector_market_terrain",
        "vector_founder_edge_audit",
        "vector_channel_score",
        "vector_thesis",
        "vector_venue",
        "vector_signal_review",
        "vector_state_snapshot",
        "vector_list_toolsets",
        "vector_list_toolset_tools",
    ],
    research: [
        "vector_list_research_providers",
        "vector_research_search",
        "vector_source_capture",
        "vector_competitor_map",
        "vector_channel_evidence",
        "vector_research_memo",
    ],
    strategy: [
        "vector_venue_score",
        "vector_route_context",
        "vector_strategy_map",
        "vector_graph_sync",
        "vector_graph_query",
        "vector_sync_kb",
    ],
    copy: [
        "vector_sales_copy",
        "vector_copy_review",
        "vector_render_media",
    ],
    admin: [
        "vector_update_state",
        "vector_undo",
    ],
};
const MUTATING_TOOLS = new Set([
    "vector_intake",
    "vector_icp_jtbd",
    "vector_market_terrain",
    "vector_founder_edge_audit",
    "vector_source_capture",
    "vector_research_search",
    "vector_competitor_map",
    "vector_channel_evidence",
    "vector_research_memo",
    "vector_channel_score",
    "vector_venue_score",
    "vector_route_context",
    "vector_strategy_map",
    "vector_graph_sync",
    "vector_sync_kb",
    "vector_thesis",
    "vector_venue",
    "vector_signal_review",
    "vector_sales_copy",
    "vector_copy_review",
    "vector_update_state",
    "vector_undo",
]);
const SAFE_MODE_BLOCKED_TOOLS = new Set([
    "vector_update_state",
    "vector_undo",
]);
const TOOLSET_NAMES = Object.keys(CAPABILITY_TOOLSETS);
const TOOL_POLICIES = new Map();
for (const toolset of TOOLSET_NAMES) {
    for (const toolName of CAPABILITY_TOOLSETS[toolset]) {
        TOOL_POLICIES.set(toolName, {
            toolset,
            mutates_state: MUTATING_TOOLS.has(toolName),
            safe_mode_blocked: SAFE_MODE_BLOCKED_TOOLS.has(toolName),
        });
    }
}
export function allCapabilityToolsets() {
    return [...TOOLSET_NAMES];
}
export function capabilityPolicy(toolName) {
    return TOOL_POLICIES.get(toolName) ?? null;
}
export function listToolsetTools(toolset) {
    return [...CAPABILITY_TOOLSETS[toolset]];
}
export function resolveToolsets(requested) {
    if (!requested?.length) {
        return allCapabilityToolsets();
    }
    const normalized = requested
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item);
    const invalid = normalized.filter((item) => !TOOLSET_NAMES.includes(item));
    if (invalid.length) {
        throw new Error(`Unknown capability toolsets: ${invalid.join(", ")}.`);
    }
    return [...new Set(normalized)];
}
