export const WORKFLOW_PHASES = [
    "intake",
    "icp",
    "market",
    "channel",
    "thesis",
    "venue",
    "signal",
    "recovery",
];
export const WORKFLOW_MILESTONES = ["M0", "M1", "M2", "M3", "M4", "M5", "M6"];
export const WORKFLOW_STAGES = ["0→1", "1→10", "10→100"];
export const WORKFLOW_MODES = [
    "quick_start",
    "research_mode",
    "full_mode",
    "copy_mode",
    "audit_mode",
    "recovery_mode",
];
export const WORKFLOW_ARTIFACT_KEYS = [
    "intake_memo",
    "icp_card",
    "market_map",
    "channel_scorecard",
    "thesis_card",
    "venue_card",
    "venue_scorecard",
    "signal_ledger",
    "research_memo",
    "copy_pack",
    "copy_review",
    "decision_memo",
    "strategy_map",
    // [v2.0.0] New artifact types
    "founder_edge_audit_result",
    "objection_map",
];
export const WORKFLOW_CONTRACT = {
    version: "2.0.0", // [v2.0.0] bumped from 1.6.2
    source_of_truth: "vector/mcp_server/workflow_contract.ts",
    phases: {
        intake: {
            milestone: "M0",
            stage: "0→1",
            phase_confidence: 0.15,
            default_mode: "quick_start",
            allowed_next: ["icp", "recovery"],
            artifact_key: "intake_memo",
            prerequisites: [],
            gate_checklist: {
                required_conditions: [
                    "product_described_one_sentence",
                    "problem_named_specifically",
                    "persona_assumed",
                    "why_now_exists",
                    "constraint_noted",
                    "evidence_level_tagged",
                ],
                kill_switch_check: "intake cannot proceed if persona is 'everyone' or 'anyone'",
            },
        },
        icp: {
            milestone: "M1",
            stage: "0→1",
            phase_confidence: 0.3,
            default_mode: "quick_start",
            allowed_next: ["market", "recovery"],
            artifact_key: "icp_card",
            prerequisites: [
                {
                    kind: "allOf",
                    fields: ["product_description", "icp_hypothesis"],
                    message: "intake must capture product_description and icp_hypothesis",
                },
            ],
            gate_checklist: {
                required_conditions: [
                    "job_statement_one_sentence",
                    "four_forces_all_non_null", // [v2.0.0] push/pull/anxiety/habit required
                    "riskiest_assumption_named",
                    "evidence_tags_all_assigned",
                    "icp_card_not_generic",
                ],
                kill_switch_check: "icp cannot proceed if four_forces.anxiety is null",
            },
        },
        market: {
            milestone: "M2",
            stage: "1→10",
            phase_confidence: 0.45,
            default_mode: "research_mode",
            allowed_next: ["channel", "recovery"],
            artifact_key: "market_map",
            prerequisites: [
                {
                    kind: "allOf",
                    fields: ["target_user", "job_statement", "riskiest_assumption"],
                    message: "market phase requires target_user, job_statement, and riskiest_assumption",
                },
            ],
            gate_checklist: {
                required_conditions: [
                    "stage_confirmed",
                    "category_stance_selected", // [v2.0.0] entering/reframing/creating
                    "competitor_map_has_all_4_types", // [v2.0.0] direct+substitutes+workflow+attention
                    "gold_zone_channels_min_2",
                    "white_space_rubric_passed", // [v2.0.0] 4-criteria check
                ],
                kill_switch_check: "market cannot proceed if only argument is 'category is hot'",
            },
        },
        channel: {
            milestone: "M3",
            stage: "1→10",
            phase_confidence: 0.6,
            default_mode: "full_mode",
            allowed_next: ["thesis", "recovery"],
            artifact_key: "channel_scorecard",
            prerequisites: [
                {
                    kind: "anyOf",
                    fields: ["market_memo", "research_memo"],
                    message: "channel phase requires market_memo or research_memo",
                },
                {
                    kind: "allOf",
                    fields: ["founder_edge_audit"], // [v2.0.0] Founder Edge Audit mandatory
                    message: "channel phase requires founder_edge_audit before scoring",
                },
            ],
            gate_checklist: {
                required_conditions: [
                    "founder_edge_audit_run_per_channel", // [v2.0.0]
                    "stage_weighted_scoring_applied", // [v2.0.0] not flat 1-5
                    "min_2_channels_scored",
                    "primary_channel_score_gte_50",
                    "first_test_time_boxed",
                ],
                kill_switch_check: "channel cannot proceed if primary channel score < 50",
            },
        },
        thesis: {
            milestone: "M4",
            stage: "10→100",
            phase_confidence: 0.72,
            default_mode: "full_mode",
            allowed_next: ["venue", "recovery"],
            artifact_key: "thesis_card",
            prerequisites: [
                {
                    kind: "allOf",
                    fields: ["channel_selected", "channel_scores"],
                    message: "thesis phase requires a selected channel and channel scorecard",
                },
            ],
            gate_checklist: {
                required_conditions: [
                    "primary_channel_single_selection",
                    "growth_multiplier_type_specified", // [v2.0.0] A/B/C/D or "not yet"
                    "confidence_with_rationale",
                    "thesis_card_excludes_venue_fields", // [v2.0.0] boundary enforcement
                ],
                kill_switch_check: "thesis cannot proceed if primary_channel is still 'A or B'",
            },
        },
        venue: {
            milestone: "M4",
            stage: "10→100",
            phase_confidence: 0.76,
            default_mode: "full_mode",
            allowed_next: ["signal", "recovery"],
            artifact_key: "venue_card",
            prerequisites: [
                {
                    kind: "allOf",
                    fields: ["thesis_card", "channel_selected"],
                    message: "venue phase requires thesis_card and channel_selected",
                },
            ],
            gate_checklist: {
                required_conditions: [
                    "one_primary_cta",
                    "trust_signal_calibrated_to_icp_anxiety", // [v2.0.0]
                    "drift_check_specific_not_generic",
                    "venue_does_not_rewrite_thesis_channel", // [v2.0.0] boundary enforcement
                ],
                kill_switch_check: "venue cannot proceed if buyer trust rationale is missing",
            },
        },
        signal: {
            milestone: "M5",
            stage: "10→100",
            phase_confidence: 0.82,
            default_mode: "recovery_mode", // [v2.0.0] changed from copy_mode — signal is monitoring+recovery phase
            allowed_next: ["signal", "recovery"],
            artifact_key: "signal_ledger",
            prerequisites: [
                {
                    kind: "allOf",
                    fields: ["thesis_card", "venue_card", "venue_selected"],
                    message: "signal phase requires thesis_card, venue_card, and venue_selected",
                },
            ],
            gate_checklist: {
                required_conditions: [
                    "ledger_row_written_per_milestone",
                    "signal_class_assigned", // green/yellow/red
                    "drift_type_classified_if_drift", // [v2.0.0] 7-type taxonomy
                    "recovery_routing_defined_if_red", // [v2.0.0]
                    "confidence_update_recorded",
                ],
                kill_switch_check: "signal cannot scale without green signal",
            },
        },
        recovery: {
            milestone: "M6",
            stage: "10→100",
            phase_confidence: 0.5,
            default_mode: "recovery_mode",
            // [v2.0.0] Expanded — recovery can route to any phase based on drift type
            allowed_next: ["icp", "market", "channel", "thesis", "venue", "intake"],
            artifact_key: null,
            prerequisites: [],
            gate_checklist: {
                required_conditions: [
                    "drift_type_named", // [v2.0.0] must classify before routing
                    "smallest_correction_identified",
                    "return_phase_confirmed",
                ],
                kill_switch_check: "recovery cannot proceed without naming the drift type",
            },
        },
    },
    tools: {
        vector_intake: { entry_phases: ["intake", "recovery"], emits_artifact: "intake_memo", target_phase: "icp" },
        vector_icp_jtbd: { entry_phases: ["icp", "recovery"], emits_artifact: "icp_card", target_phase: "market" },
        vector_market_terrain: { entry_phases: ["market", "recovery"], emits_artifact: "market_map", target_phase: "channel" },
        vector_list_research_providers: { entry_phases: WORKFLOW_PHASES, emits_artifact: null, target_phase: null },
        vector_research_search: { entry_phases: ["market", "channel", "thesis", "recovery"], emits_artifact: null, target_phase: null },
        vector_source_capture: { entry_phases: ["market", "channel", "thesis", "recovery"], emits_artifact: null, target_phase: null },
        vector_competitor_map: { entry_phases: ["market", "channel", "thesis", "recovery"], emits_artifact: null, target_phase: null },
        vector_channel_evidence: { entry_phases: ["market", "channel", "thesis", "recovery"], emits_artifact: null, target_phase: null },
        vector_research_memo: { entry_phases: ["market", "channel", "thesis", "recovery"], emits_artifact: "research_memo", target_phase: null },
        vector_channel_score: { entry_phases: ["channel", "recovery"], emits_artifact: "channel_scorecard", target_phase: "thesis" },
        vector_venue_score: { entry_phases: ["thesis", "venue", "recovery"], emits_artifact: "venue_scorecard", target_phase: null },
        vector_thesis: { entry_phases: ["thesis", "recovery"], emits_artifact: "thesis_card", target_phase: "venue" },
        vector_venue: { entry_phases: ["venue", "recovery"], emits_artifact: "venue_card", target_phase: "signal" },
        vector_signal_review: { entry_phases: ["signal", "recovery"], emits_artifact: "signal_ledger", target_phase: null },
        // [v2.0.0] copy is restricted — only after venue+thesis locked and objection map run
        vector_sales_copy: { entry_phases: ["venue", "signal", "recovery"], emits_artifact: "copy_pack", target_phase: null },
        vector_copy_review: { entry_phases: ["venue", "signal", "recovery"], emits_artifact: "copy_review", target_phase: null },
        vector_route_context: { entry_phases: WORKFLOW_PHASES, emits_artifact: "decision_memo", target_phase: null },
        vector_strategy_map: { entry_phases: WORKFLOW_PHASES, emits_artifact: "strategy_map", target_phase: null },
        vector_graph_sync: { entry_phases: WORKFLOW_PHASES, emits_artifact: "decision_memo", target_phase: null },
        vector_graph_query: { entry_phases: WORKFLOW_PHASES, emits_artifact: null, target_phase: null },
        vector_sync_kb: { entry_phases: WORKFLOW_PHASES, emits_artifact: "decision_memo", target_phase: null },
        vector_update_state: { entry_phases: WORKFLOW_PHASES, emits_artifact: null, target_phase: null },
        vector_state_snapshot: { entry_phases: WORKFLOW_PHASES, emits_artifact: null, target_phase: null },
        vector_render_media: { entry_phases: ["venue", "signal", "recovery"], emits_artifact: null, target_phase: null },
        vector_undo: { entry_phases: WORKFLOW_PHASES, emits_artifact: null, target_phase: null },
        // [v2.0.0] New: Founder Edge Audit tool
        vector_founder_edge_audit: { entry_phases: ["market", "channel", "recovery"], emits_artifact: "founder_edge_audit_result", target_phase: null },
    },
    artifact_registry_by_action: {
        vector_intake: "intake_memo",
        vector_icp_jtbd: "icp_card",
        vector_market_terrain: "market_map",
        vector_channel_score: "channel_scorecard",
        vector_venue_score: "venue_scorecard",
        vector_thesis: "thesis_card",
        vector_venue: "venue_card",
        vector_signal_review: "signal_ledger",
        vector_sales_copy: "copy_pack",
        vector_copy_review: "copy_review",
        vector_route_context: "decision_memo",
        vector_strategy_map: "strategy_map",
        vector_research_memo: "research_memo",
        // [v2.0.0]
        vector_founder_edge_audit: "founder_edge_audit_result",
    },
};
export function phasePolicy(phase) {
    return WORKFLOW_CONTRACT.phases[phase];
}
export function toolPolicy(toolName) {
    const tools = WORKFLOW_CONTRACT.tools;
    return tools[toolName] ?? null;
}
export function artifactKeyForAction(action) {
    const registry = WORKFLOW_CONTRACT.artifact_registry_by_action;
    return registry[action] ?? null;
}
// [v2.0.0] Gate validation helper
export function gateChecklistForPhase(phase) {
    return WORKFLOW_CONTRACT.phases[phase].gate_checklist;
}
