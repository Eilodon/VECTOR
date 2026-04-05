export function createWorkflowHelpers(deps: {
  now: () => string;
  getState: () => any;
  workflowPhases: readonly string[];
  phasePolicy: (phase: any) => { allowed_next: readonly string[]; prerequisites: readonly { kind: "allOf" | "anyOf"; fields: readonly string[]; message: string }[] };
  phaseToMilestone: Record<string, string>;
  getSyncCanonicalViews: () => (state: any) => any;
  researchChannelAdjustment: (channel: string, researchMemo?: any) => { adjustment: number; notes: string[] };
  researchVenueAdjustment: (venue: string, researchMemo?: any) => { adjustment: number; notes: string[] };
  founderEdgeAuditFor: (channel: string) => any;
}) {
  function validatePhaseTransition(nextPhase?: string): void {
    const currentPhase = deps.getState().phase;
    if (!nextPhase || nextPhase === currentPhase) return;
    const allowed = deps.phasePolicy(currentPhase).allowed_next;
    if (!allowed.includes(nextPhase)) {
      throw new Error(
        `Illegal phase transition: ${currentPhase} -> ${nextPhase}. Allowed next phases: ${allowed.join(", ") || "none"}.`,
      );
    }
  }

  function signalItem(label: string, source = "manual", confidence = 0.7, notes = "") {
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      label,
      source,
      confidence,
      notes,
      created_at: deps.now(),
    };
  }

  function scoreChannel(channel: string, stageHint?: string, researchMemo?: any) {
    const normalized = channel.toLowerCase();
    const heuristics: Record<string, { score: number; confidence: number; reason: string; risk: string; next_test: string }> = {
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
    const research = deps.researchChannelAdjustment(channel, researchMemo);
    const founderAudit = deps.founderEdgeAuditFor(channel);
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

  function hasStateField(candidateState: any, field: string): boolean {
    const value = candidateState[field];
    if (value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return true;
    return true;
  }

  function gateHasRequiredFields(state: any, gate: string): boolean {
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
      default:
        return false;
    }
  }

  function reconcileSessionState(loaded: any) {
    const syncCanonicalViews = deps.getSyncCanonicalViews();
    const state = syncCanonicalViews(loaded);
    const notes: string[] = [];
    const gates = { ...state.gates };
    const gateNames = ["intake_cleared", "icp_cleared", "market_cleared", "channel_cleared", "thesis_cleared", "venue_cleared"];
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
    const currentIndex = deps.workflowPhases.indexOf(state.phase);
    const allowedIndex = deps.workflowPhases.indexOf(maxPhaseByGates);
    const nextActionFromRecovery = state.recovery_log.length
      ? state.recovery_log[state.recovery_log.length - 1]?.correction_applied ?? null
      : null;
    const nextState = syncCanonicalViews({
      ...state,
      phase: currentIndex > allowedIndex ? maxPhaseByGates : state.phase,
      milestone: deps.phaseToMilestone[currentIndex > allowedIndex ? maxPhaseByGates : state.phase],
      gates,
      next_action: nextActionFromRecovery ?? state.next_action,
    });
    if (currentIndex > allowedIndex) {
      notes.push(`Phase rolled back from '${state.phase}' to '${maxPhaseByGates}' during load reconciliation.`);
    }
    return { state: nextState, notes };
  }

  function phasePrerequisites(targetPhase: string, candidateState: any): string[] {
    return deps.phasePolicy(targetPhase).prerequisites
      .filter((rule) => {
        const matches = rule.kind === "allOf"
          ? rule.fields.every((field) => hasStateField(candidateState, field))
          : rule.fields.some((field) => hasStateField(candidateState, field));
        return !matches;
      })
      .map((rule) => rule.message);
  }

  function assertPhasePrerequisites(targetPhase: string, candidateState: any): void {
    const failures = phasePrerequisites(targetPhase, candidateState);
    if (failures.length) {
      throw new Error(`Phase prerequisites failed for '${targetPhase}': ${failures.join("; ")}`);
    }
  }

  function scoreVenue(venue: string, primaryChannel?: string, stageHint?: string, researchMemo?: any) {
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
    const research = deps.researchVenueAdjustment(venue, researchMemo);
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

  function renderStrategyMap(state: any): string {
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

  return {
    validatePhaseTransition,
    signalItem,
    scoreChannel,
    deriveWhiteSpace,
    mergeUniqueStrings,
    reconcileSessionState,
    assertPhasePrerequisites,
    scoreVenue,
    renderStrategyMap,
  };
}
