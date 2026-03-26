export type CopyStateLike = {
  thesis_card?: {
    primary_channel?: string | null;
    angle?: string | null;
    why_this_channel?: string | null;
    unlock_condition?: string | null;
  } | null;
  venue_card?: {
    sales_venue?: string | null;
    trust_signal_needed?: string | null;
    primary_cta?: string | null;
  } | null;
  objection_map: {
    primary_objection?: string | null;
    secondary_objection?: string | null;
    objection_type?: string | null;
    copy_job?: string | null;
    placement?: string | null;
  };
  icp: {
    forces: {
      anxiety?: string | null;
      habit?: string | null;
    };
  };
  sales_copy?: any;
};

export type SalesCopyInput = {
  desired_conversion_step?: string;
  angle: string;
  headline: string;
  subheadline: string;
  body: string;
  cta: string;
  objections?: string[];
  followup_ladder?: string[];
};

export type CopyReview = {
  reviewed_at: string;
  overall_score: number;
  ship_ready: boolean;
  first_test_variant: string;
  dimensions: Array<{ name: string; score: number; rationale: string }>;
  failed_checks: string[];
  recommendations: string[];
};

export const COPY_VARIANT_FAMILIES = [
  "curiosity-led",
  "pain-led",
  "outcome-led",
  "trust-led",
  "urgency-led",
];

export const COPY_QA_CHECKLIST = [
  "Promise is believable and non-inflated.",
  "Venue wording sounds native.",
  "CTA matches current buyer stage.",
  "Only one primary action exists.",
  "Copy stays inside locked thesis.",
  "Primary objection is explicitly handled.",
  "Trust signal appears before CTA when required.",
];

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function normalize(text: string | null | undefined): string {
  return (text ?? "").toLowerCase();
}

function keywordHits(haystack: string, needle: string | null | undefined): number {
  const tokens = normalize(needle)
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length >= 4);
  if (!tokens.length) return 0;
  return tokens.reduce((count, token) => count + (haystack.includes(token) ? 1 : 0), 0);
}

function boundedScore(value: number): number {
  return Math.max(1, Math.min(5, Math.round(value)));
}

export function buildSalesCopyPack(state: CopyStateLike, input: SalesCopyInput) {
  const dominantObjection = state.objection_map.primary_objection?.trim()
    ? state.objection_map.primary_objection
    : input.objections?.[0]
      ?? state.icp.forces.anxiety
      ?? state.icp.forces.habit
      ?? "Unclear buyer objection";
  const objectionType = state.objection_map.objection_type?.trim()
    ? state.objection_map.objection_type
    : state.icp.forces.anxiety?.trim() && state.icp.forces.habit?.trim()
      ? "both"
      : state.icp.forces.anxiety?.trim()
        ? "anxiety"
        : "habit";
  const copyJob = state.objection_map.copy_job?.trim()
    ? state.objection_map.copy_job
    : objectionType === "habit"
      ? "Magnify the cost of staying with the current workaround and make switching feel smaller."
      : objectionType === "both"
        ? "Reduce perceived risk while making the current status quo feel costly."
        : "Reduce risk, increase trust, and make the next step feel reversible.";
  const placement = state.objection_map.placement?.trim()
    ? state.objection_map.placement
    : "before_cta";
  const objection_map = {
    primary_objection: dominantObjection,
    objection_type: objectionType,
    copy_job: copyJob,
    placement,
    secondary_objection: state.objection_map.secondary_objection ?? input.objections?.[1] ?? null,
  };
  const message_matrix = COPY_VARIANT_FAMILIES.map((variant) => ({
    variant,
    hook: input.headline,
    opener: input.subheadline,
    body: input.body,
    objection_pre_handle: dominantObjection,
    trust_signal_note: state.venue_card?.trust_signal_needed ?? "",
    cta: input.cta,
  }));
  return {
    sales_copy: {
      angle: input.angle,
      headline: input.headline,
      subheadline: input.subheadline,
      body: input.body,
      cta: input.cta,
      objections: input.objections ?? [],
      followup_ladder: input.followup_ladder ?? [],
      desired_conversion_step: input.desired_conversion_step ?? state.venue_card?.primary_cta ?? input.cta,
      message_matrix,
      variant_families: COPY_VARIANT_FAMILIES,
      proof_notes: [
        `Trust signal required: ${state.venue_card?.trust_signal_needed ?? ""}`,
        `Primary objection: ${dominantObjection}`,
      ],
      cta_options: [input.cta, input.desired_conversion_step ?? state.venue_card?.primary_cta ?? input.cta],
      test_plan: [
        "Test the trust-led variant first if buyers show risk sensitivity.",
        "Compare reply quality or CTA clicks against the pain-led variant.",
      ],
      qa_checklist: COPY_QA_CHECKLIST,
      objection_map,
    },
    objection_map,
  };
}

export function reviewSalesCopyPack(state: CopyStateLike, reviewedAt: string): CopyReview {
  const salesCopy = state.sales_copy;
  if (!salesCopy) {
    throw new Error("Copy review requires an existing sales_copy artifact. Run vector_sales_copy first.");
  }
  const haystack = [
    salesCopy.headline,
    salesCopy.subheadline,
    salesCopy.body,
    ...(salesCopy.followup_ladder ?? []),
    ...(salesCopy.proof_notes ?? []),
  ].join(" ").toLowerCase();

  const thesisAlignmentHits = keywordHits(haystack, state.thesis_card?.angle) + keywordHits(haystack, state.thesis_card?.why_this_channel);
  const objectionHits = keywordHits(haystack, state.objection_map.primary_objection) + keywordHits(haystack, state.objection_map.secondary_objection);
  const trustSignalHits = keywordHits(haystack, state.venue_card?.trust_signal_needed);
  const desiredStepMatches = normalize(salesCopy.desired_conversion_step) === normalize(state.venue_card?.primary_cta)
    || normalize(salesCopy.cta) === normalize(state.venue_card?.primary_cta);
  const ctaOptions = unique(salesCopy.cta_options ?? [salesCopy.cta, salesCopy.desired_conversion_step]);
  const singleAction = ctaOptions.length <= 2 && unique([salesCopy.cta, salesCopy.desired_conversion_step]).length === 1;

  const dimensions = [
    {
      name: "thesis_alignment",
      score: boundedScore(2 + (thesisAlignmentHits >= 2 ? 3 : thesisAlignmentHits)),
      rationale: thesisAlignmentHits >= 2
        ? "Copy echoes the locked thesis and channel rationale."
        : "Copy only weakly reflects the locked thesis angle.",
    },
    {
      name: "objection_coverage",
      score: boundedScore(2 + (objectionHits >= 2 ? 3 : objectionHits)),
      rationale: objectionHits >= 2
        ? "Primary objection is explicitly surfaced in the copy."
        : "Primary objection is not clearly handled in body or follow-up.",
    },
    {
      name: "trust_signal_calibration",
      score: boundedScore(2 + (trustSignalHits >= 1 ? 3 : 0)),
      rationale: trustSignalHits >= 1
        ? "Required trust signal is visible before the conversion ask."
        : "Trust signal requirement is present in state but weakly expressed in the copy.",
    },
    {
      name: "cta_match",
      score: desiredStepMatches ? 5 : 2,
      rationale: desiredStepMatches
        ? "CTA matches the venue's primary conversion step."
        : "CTA drifts from the locked venue step.",
    },
    {
      name: "single_action_clarity",
      score: singleAction ? 5 : 3,
      rationale: singleAction
        ? "Copy keeps one primary action."
        : "Copy exposes more than one primary action path.",
    },
    {
      name: "venue_register_fit",
      score: boundedScore(3 + (normalize(state.venue_card?.sales_venue).includes("landing") ? 1 : 0) + (salesCopy.body?.length >= 120 ? 1 : 0)),
      rationale: "Review checks whether the message feels compatible with the selected venue and buyer stage.",
    },
  ];

  const failedChecks = dimensions
    .filter((dimension) => dimension.score < 4)
    .map((dimension) => `${dimension.name} < 4`);
  const recommendations = [
    ...(!thesisAlignmentHits ? ["Repeat the thesis angle more explicitly in the headline or opener."] : []),
    ...(objectionHits < 2 ? ["Name and neutralize the primary objection earlier in the body."] : []),
    ...(!trustSignalHits ? ["Move the trust signal closer to the CTA and make it concrete."] : []),
    ...(!desiredStepMatches ? ["Align desired conversion step and CTA with the locked venue."] : []),
    ...(!singleAction ? ["Reduce CTA options to one clear next step."] : []),
  ];

  const objectionType = normalize(state.objection_map.objection_type);
  const firstTestVariant = objectionType.includes("habit")
    ? "pain-led"
    : objectionType.includes("anxiety")
      ? "trust-led"
      : objectionType.includes("both")
        ? "trust-led"
        : "outcome-led";
  const overallScore = Math.round((dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / (dimensions.length * 5)) * 100);

  return {
    reviewed_at: reviewedAt,
    overall_score: overallScore,
    ship_ready: overallScore >= 80 && failedChecks.length === 0,
    first_test_variant: firstTestVariant,
    dimensions,
    failed_checks: failedChecks,
    recommendations: recommendations.length ? recommendations : ["Copy is ready for a first controlled test inside the selected venue."],
  };
}
