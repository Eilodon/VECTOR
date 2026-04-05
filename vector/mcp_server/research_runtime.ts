export type SourceType =
  | "official_docs"
  | "github"
  | "search_result"
  | "browser_capture"
  | "crm_note"
  | "internal_note"
  | "community_post"
  | "social_signal"
  | "benchmark"
  | "other";

export type EvidenceStrength = "weak" | "medium" | "strong";

export type EvidenceItemLike = {
  id: string;
  source: string;
  source_url?: string | null;
  provider?: string | null;
  provider_run_id?: string | null;
  raw_payload_ref?: string | null;
  source_type: SourceType;
  kind: string;
  claim: string;
  observed_fact?: boolean;
  relevance?: string;
  strength: EvidenceStrength;
  collected_at: string;
  stale_after_days?: number;
  notes?: string;
};

export type ResearchChannelObservationLike = {
  channel: string;
  confidence: number;
  observation_mode: "observed" | "inferred";
  source_provider?: string | null;
  provider_run_id?: string | null;
  icp_presence: number;
  trust_match: number;
  speed_to_signal: number;
  cost_to_test: number;
  founder_advantage: number;
  evidence_ids: string[];
  benchmark_key?: string | null;
  notes?: string;
};

export type ResearchVenueObservationLike = {
  venue: string;
  confidence: number;
  observation_mode: "observed" | "inferred";
  source_provider?: string | null;
  provider_run_id?: string | null;
  trust_requirement_fit: number;
  checkout_fit: number;
  speed_to_launch: number;
  audience_match: number;
  evidence_ids: string[];
  notes?: string;
};

export type ResearchProviderRunLike = {
  id: string;
  provider: string;
  interface: "search" | "crawl" | "extract" | "browser_session" | "deep_research_job";
  query: string;
  result_count: number;
  budget_used: number;
  raw_payload_ref: string;
  source_whitelist: string[];
  collected_at: string;
};

export type ResearchMemoLike = {
  question: string;
  provider_runs: ResearchProviderRunLike[];
  evidence_table: EvidenceItemLike[];
  competitors: string[];
  substitutes: string[];
  workflow_competitors: string[];
  attention_competitors: string[];
  channel_observations: ResearchChannelObservationLike[];
  venue_observations: ResearchVenueObservationLike[];
  trust_signals: string[];
  pricing_observations: string[];
  customer_language: string[];
  synthesis: string;
  recommendation: string;
  risks: string[];
  unknowns: string[];
  next_experiment: string;
  updated_at: string;
};

export type RawSourcePayloadLike = {
  id: string;
  title: string;
  url: string;
  source: string;
  source_type: SourceType;
  kind: string;
  claim: string;
  observed_fact: boolean;
  strength: EvidenceStrength;
  relevance: string;
  notes: string;
  collected_at: string;
  channel_signals: Array<{
    channel: string;
    icp_presence: number;
    trust_match: number;
    speed_to_signal: number;
    cost_to_test: number;
    founder_advantage: number;
    confidence: number;
    observation_mode: "observed" | "inferred";
    notes: string;
  }>;
  venue_signals: Array<{
    venue: string;
    trust_requirement_fit: number;
    checkout_fit: number;
    speed_to_launch: number;
    audience_match: number;
    confidence: number;
    observation_mode: "observed" | "inferred";
    notes: string;
  }>;
  trust_signals: string[];
  pricing_observations: string[];
  customer_language: string[];
};

export const SOURCE_FRESHNESS_DAYS: Record<SourceType, number> = {
  official_docs: 180,
  github: 90,
  search_result: 30,
  browser_capture: 30,
  crm_note: 30,
  internal_note: 45,
  community_post: 14,
  social_signal: 7,
  benchmark: 180,
  other: 30,
};

export const MAX_RESEARCH_EVIDENCE_ITEMS = 500;

export const CHANNEL_BENCHMARK_LIBRARY: Record<string, { minimum_attempts: number; healthy_signal: string; caution_zone: string; failure_zone: string }> = {
  "cold email": {
    minimum_attempts: 20,
    healthy_signal: "5-15% qualified replies after genuine personalization.",
    caution_zone: "1-4% replies or weak response quality.",
    failure_zone: "0 meaningful replies after 30+ genuine attempts.",
  },
  linkedin: {
    minimum_attempts: 20,
    healthy_signal: "Replies, follow-up questions, or warm intros from ICP matches.",
    caution_zone: "Connection accepts without real conversation.",
    failure_zone: "No meaningful conversations after repeated outreach.",
  },
  community: {
    minimum_attempts: 10,
    healthy_signal: "Real replies, follow-up questions, or profile clicks from ICP-like people.",
    caution_zone: "Emoji or likes without conversation.",
    failure_zone: "No ICP presence after repeated contribution loops.",
  },
  marketplace: {
    minimum_attempts: 1,
    healthy_signal: "Qualified discovery and purchase intent.",
    caution_zone: "Traffic without activation.",
    failure_zone: "Browse-only visits with no buyer intent.",
  },
  content: {
    minimum_attempts: 5,
    healthy_signal: "Saves, replies, forwards, or DMs from ICP-like people.",
    caution_zone: "Engagement without conversation.",
    failure_zone: "No ICP presence after repeated posting.",
  },
  partnerships: {
    minimum_attempts: 5,
    healthy_signal: "Warm intros, co-marketing interest, or direct asks.",
    caution_zone: "Polite interest without a next step.",
    failure_zone: "No trust transfer.",
  },
};

const SEARCH_CHANNEL_HINTS = [
  {
    channel: "cold email",
    tokens: ["cold email", "email outreach", "outbound email", "personalized outreach", "outbound"],
    dimensions: { icp_presence: 2, trust_match: 0, speed_to_signal: 2, cost_to_test: 1, founder_advantage: 1 },
    note: "Search result references direct outbound or email-based reach.",
  },
  {
    channel: "community",
    tokens: ["community", "forum", "slack group", "discord", "reddit", "operator group"],
    dimensions: { icp_presence: 2, trust_match: 2, speed_to_signal: 0, cost_to_test: 1, founder_advantage: 0 },
    note: "Search result references communities or group-based trust loops.",
  },
  {
    channel: "linkedin",
    tokens: ["linkedin", "dm", "social selling", "connection request"],
    dimensions: { icp_presence: 1, trust_match: 1, speed_to_signal: 1, cost_to_test: 1, founder_advantage: 1 },
    note: "Search result references LinkedIn or DM-driven outreach.",
  },
  {
    channel: "content",
    tokens: ["content", "newsletter", "blog", "youtube", "post", "thought leadership"],
    dimensions: { icp_presence: 1, trust_match: 1, speed_to_signal: -1, cost_to_test: 0, founder_advantage: 1 },
    note: "Search result references publishing or audience-building loops.",
  },
  {
    channel: "partnerships",
    tokens: ["partner", "partnership", "affiliate", "co-marketing", "referral partner"],
    dimensions: { icp_presence: 1, trust_match: 2, speed_to_signal: 0, cost_to_test: 0, founder_advantage: 1 },
    note: "Search result references borrowed-distribution or partner trust transfer.",
  },
  {
    channel: "marketplace",
    tokens: ["marketplace", "directory", "app store", "listing"],
    dimensions: { icp_presence: 1, trust_match: 0, speed_to_signal: 1, cost_to_test: 1, founder_advantage: 0 },
    note: "Search result references marketplace or directory-based acquisition.",
  },
] as const;

const SEARCH_VENUE_HINTS = [
  {
    venue: "landing page",
    tokens: ["landing page", "homepage", "site", "book the teardown", "book now"],
    dimensions: { trust_requirement_fit: 1, checkout_fit: 1, speed_to_launch: 2, audience_match: 1 },
    note: "Search result references a simple page-based conversion surface.",
  },
  {
    venue: "demo call",
    tokens: ["book a call", "demo", "discovery call", "sales call"],
    dimensions: { trust_requirement_fit: 1, checkout_fit: 0, speed_to_launch: 1, audience_match: 1 },
    note: "Search result references call-based conversion.",
  },
  {
    venue: "teardown",
    tokens: ["teardown", "audit", "assessment"],
    dimensions: { trust_requirement_fit: 2, checkout_fit: 1, speed_to_launch: 1, audience_match: 2 },
    note: "Search result references diagnostic or teardown-style offers.",
  },
] as const;

const TRUST_SIGNAL_HINTS = [
  { tokens: ["case study", "testimonial", "social proof"], label: "Case study or testimonial proof" },
  { tokens: ["benchmark", "teardown", "audit", "breakdown"], label: "Teardown or benchmark proof asset" },
  { tokens: ["founder story", "operator credibility", "expertise"], label: "Founder/operator credibility proof" },
] as const;

function normalizeText(...parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function includesAny(haystack: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => haystack.includes(token));
}

function boundedConfidence(base: number): number {
  return Math.max(0.35, Math.min(0.9, Math.round(base * 100) / 100));
}

function heuristicConfidence(haystack: string, query: string, tokens: readonly string[]): number {
  const queryMatched = includesAny(query, tokens);
  const textMatched = includesAny(haystack, tokens);
  return boundedConfidence(0.48 + (queryMatched ? 0.12 : 0) + (textMatched ? 0.16 : 0));
}

function inferSearchSourceType(url: string): SourceType {
  const host = new URL(url).host.toLowerCase();
  if (host.includes("github.com")) return "github";
  if (host.startsWith("docs.") || host.includes("docs")) return "official_docs";
  if (host.includes("reddit.com") || host.includes("community") || host.includes("forum")) return "community_post";
  if (host.includes("linkedin.com") || host.includes("x.com") || host.includes("twitter.com") || host.includes("youtube.com")) return "social_signal";
  return "search_result";
}

function extractPricingObservations(snippet: string): string[] {
  const matches = snippet.match(/(?:\$|usd\s*)\d[\d,.]*(?:\/[a-z]+)?|free|trial|pricing|price/gi) ?? [];
  if (!matches.length) return [];
  return [`Pricing signal from result: ${matches.join(", ")}`];
}

function extractCustomerLanguage(snippet: string): string[] {
  const normalized = snippet.trim();
  if (!normalized) return [];
  if (!/(need|want|struggl|pain|problem|looking for|trying to|without)/i.test(normalized)) {
    return [];
  }
  return [normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized];
}

function primaryEntityLabel(title: string): string {
  return title
    .split(" - ")[0]
    ?.split(" | ")[0]
    ?.split(": ")[0]
    ?.trim()
    || title.trim();
}

export function buildHeuristicSearchPayload(params: {
  providerId: string;
  query: string;
  index: number;
  title?: string | null;
  url?: string | null;
  snippet?: string | null;
  publishedAt?: string | null;
}): RawSourcePayloadLike | null {
  const url = params.url?.trim();
  if (!url) {
    return null;
  }

  const title = params.title?.trim() || `Search result ${params.index + 1}`;
  const snippet = params.snippet?.trim() || "Search result without snippet.";
  const queryLower = params.query.toLowerCase();
  const haystack = normalizeText(title, snippet, url);
  const sourceType = inferSearchSourceType(url);

  const channel_signals = SEARCH_CHANNEL_HINTS
    .filter((hint) => includesAny(haystack, hint.tokens) || includesAny(queryLower, hint.tokens))
    .map((hint) => ({
      channel: hint.channel,
      ...hint.dimensions,
      confidence: heuristicConfidence(haystack, queryLower, hint.tokens),
      observation_mode: "inferred" as const,
      notes: hint.note,
    }));

  const venue_signals = SEARCH_VENUE_HINTS
    .filter((hint) => includesAny(haystack, hint.tokens) || includesAny(queryLower, hint.tokens))
    .map((hint) => ({
      venue: hint.venue,
      ...hint.dimensions,
      confidence: heuristicConfidence(haystack, queryLower, hint.tokens),
      observation_mode: "inferred" as const,
      notes: hint.note,
    }));

  const trust_signals = [...new Set(
    TRUST_SIGNAL_HINTS
      .filter((hint) => includesAny(haystack, hint.tokens))
      .map((hint) => hint.label),
  )];

  const pricing_observations = extractPricingObservations(snippet);
  const customer_language = extractCustomerLanguage(snippet);

  const lowerTitle = title.toLowerCase();
  const competitorCue = /\b(vs|alternative|competitor|rival)\b/i.test(`${title} ${snippet}`);
  const substituteCue = /\b(spreadsheet|excel|airtable|notion|manual workflow|diy)\b/i.test(`${title} ${snippet}`);
  const attentionCue = /\b(linkedin creator|youtube channel|newsletter|podcast)\b/i.test(`${title} ${snippet}`);
  const workflowCue = /\b(workflow|ops routine|crm cleanup|manual process|playbook)\b/i.test(`${title} ${snippet}`);

  const kind: RawSourcePayloadLike["kind"] = competitorCue
    ? "competitor"
    : substituteCue
      ? "substitute"
      : workflowCue
        ? "workflow_competitor"
        : attentionCue
          ? "attention_competitor"
          : channel_signals.length
            ? "channel_presence"
            : venue_signals.length
              ? "venue_fit"
              : trust_signals.length
                ? "trust_signal"
                : customer_language.length
                  ? "customer_language"
                  : pricing_observations.length
                    ? "pricing"
                    : "other";

  const relevanceParts = [
    `External search result returned for query: ${params.query}`,
    channel_signals.length ? `channels=${channel_signals.map((item) => item.channel).join(", ")}` : null,
    venue_signals.length ? `venues=${venue_signals.map((item) => item.venue).join(", ")}` : null,
  ].filter(Boolean);

  return {
    id: `${params.providerId}:${Buffer.from(`${params.query}:${params.index}:${url}`).toString("base64url")}`,
    title,
    url,
    source: new URL(url).host,
    source_type: sourceType,
    kind,
    claim: snippet,
    observed_fact: false,
    strength: channel_signals.length || venue_signals.length || trust_signals.length ? "medium" : "weak",
    relevance: relevanceParts.join(" | "),
    notes: `Heuristic extraction from production search result '${primaryEntityLabel(title)}'.`,
    collected_at: params.publishedAt?.trim() || new Date().toISOString(),
    channel_signals,
    venue_signals,
    trust_signals,
    pricing_observations,
    customer_language,
  };
}

function strengthWeight(strength: EvidenceStrength): number {
  switch (strength) {
    case "strong": return 3;
    case "medium": return 2;
    case "weak": return 1;
  }
}

function ageInDays(timestamp: string): number {
  const ageMs = Date.now() - new Date(timestamp).getTime();
  if (!Number.isFinite(ageMs)) return 9999;
  return Math.max(0, Math.floor(ageMs / 86_400_000));
}

function resolveEvidence(researchMemo: ResearchMemoLike | null | undefined, evidenceIds: string[]): EvidenceItemLike[] {
  return evidenceIds
    .map((id) => researchMemo?.evidence_table.find((item) => item.id === id))
    .filter((item): item is EvidenceItemLike => Boolean(item));
}

function mergeUniqueStrings(...collections: Array<string[] | undefined>): string[] {
  return [...new Set(collections.flatMap((items) => items ?? []).map((item) => item.trim()).filter(Boolean))];
}

export function mergeBoundedEvidence(
  existing: EvidenceItemLike[],
  incoming: EvidenceItemLike[],
  maxEntries = MAX_RESEARCH_EVIDENCE_ITEMS,
): EvidenceItemLike[] {
  const merged = new Map<string, EvidenceItemLike>();
  for (const item of [...existing, ...incoming]) {
    merged.set(item.id, item);
  }
  return [...merged.values()].slice(-maxEntries);
}

function benchmarkNote(channel: string): string | null {
  const benchmark = CHANNEL_BENCHMARK_LIBRARY[channel.toLowerCase()];
  if (!benchmark) return null;
  return `Benchmark: ${benchmark.minimum_attempts} attempts; healthy=${benchmark.healthy_signal}; caution=${benchmark.caution_zone}; failure=${benchmark.failure_zone}`;
}

function weightedAverage(values: Array<{ value: number; weight: number }>): number {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) {
    return 0;
  }
  const weighted = values.reduce((sum, item) => sum + (item.value * item.weight), 0) / totalWeight;
  return Math.max(-2, Math.min(2, Math.round(weighted)));
}

export function upsertChannelObservation(
  observations: ResearchChannelObservationLike[],
  observation: ResearchChannelObservationLike,
): ResearchChannelObservationLike[] {
  const next = observations.filter((item) => item.channel.toLowerCase() !== observation.channel.toLowerCase());
  next.push(observation);
  return next;
}

export function upsertVenueObservation(
  observations: ResearchVenueObservationLike[],
  observation: ResearchVenueObservationLike,
): ResearchVenueObservationLike[] {
  const next = observations.filter((item) => item.venue.toLowerCase() !== observation.venue.toLowerCase());
  next.push(observation);
  return next;
}

function normalizeProviderEvidence(
  payloads: RawSourcePayloadLike[],
  provider: string,
  providerRunId: string,
  rawPayloadRef: string,
): EvidenceItemLike[] {
  return payloads.map((item) => ({
    id: item.id,
    source: item.source,
    source_url: item.url,
    provider,
    provider_run_id: providerRunId,
    raw_payload_ref: rawPayloadRef,
    source_type: item.source_type,
    kind: item.kind,
    claim: item.claim,
    observed_fact: item.observed_fact,
    relevance: item.relevance,
    strength: item.strength,
    collected_at: item.collected_at,
    stale_after_days: staleAfterDaysFor(item.source_type),
    notes: item.notes,
  }));
}

function collectEntityLabels(payloads: RawSourcePayloadLike[], kind: RawSourcePayloadLike["kind"]): string[] {
  return mergeUniqueStrings(
    payloads
      .filter((item) => item.kind === kind)
      .map((item) => primaryEntityLabel(item.title)),
  );
}

function deriveProviderChannelObservations(
  payloads: RawSourcePayloadLike[],
  provider: string,
  providerRunId: string,
): ResearchChannelObservationLike[] {
  const buckets = new Map<string, Array<{ payload: RawSourcePayloadLike; signal: RawSourcePayloadLike["channel_signals"][number] }>>();
  for (const payload of payloads) {
    for (const signal of payload.channel_signals) {
      const key = signal.channel.toLowerCase();
      const existing = buckets.get(key) ?? [];
      existing.push({ payload, signal });
      buckets.set(key, existing);
    }
  }
  return [...buckets.entries()].map(([key, entries]) => {
    const evidenceIds = entries.map((entry) => entry.payload.id);
    const notes = mergeUniqueStrings(entries.map((entry) => entry.signal.notes), entries.map((entry) => entry.payload.title));
    const confidence = entries.reduce((sum, entry) => sum + entry.signal.confidence, 0) / entries.length;
    const observationMode = entries.some((entry) => entry.signal.observation_mode === "observed") ? "observed" : "inferred";
    return {
      channel: entries[0]?.signal.channel ?? key,
      confidence,
      observation_mode: observationMode,
      source_provider: provider,
      provider_run_id: providerRunId,
      icp_presence: weightedAverage(entries.map((entry) => ({
        value: entry.signal.icp_presence,
        weight: entry.signal.confidence * strengthWeight(entry.payload.strength),
      }))),
      trust_match: weightedAverage(entries.map((entry) => ({
        value: entry.signal.trust_match,
        weight: entry.signal.confidence * strengthWeight(entry.payload.strength),
      }))),
      speed_to_signal: weightedAverage(entries.map((entry) => ({
        value: entry.signal.speed_to_signal,
        weight: entry.signal.confidence * strengthWeight(entry.payload.strength),
      }))),
      cost_to_test: weightedAverage(entries.map((entry) => ({
        value: entry.signal.cost_to_test,
        weight: entry.signal.confidence * strengthWeight(entry.payload.strength),
      }))),
      founder_advantage: weightedAverage(entries.map((entry) => ({
        value: entry.signal.founder_advantage,
        weight: entry.signal.confidence * strengthWeight(entry.payload.strength),
      }))),
      evidence_ids: [...new Set(evidenceIds)],
      benchmark_key: entries[0]?.signal.channel ?? key,
      notes: notes.join(" | "),
    };
  });
}

function deriveProviderVenueObservations(
  payloads: RawSourcePayloadLike[],
  provider: string,
  providerRunId: string,
): ResearchVenueObservationLike[] {
  const buckets = new Map<string, Array<{ payload: RawSourcePayloadLike; signal: RawSourcePayloadLike["venue_signals"][number] }>>();
  for (const payload of payloads) {
    for (const signal of payload.venue_signals) {
      const key = signal.venue.toLowerCase();
      const existing = buckets.get(key) ?? [];
      existing.push({ payload, signal });
      buckets.set(key, existing);
    }
  }
  return [...buckets.entries()].map(([key, entries]) => {
    const evidenceIds = entries.map((entry) => entry.payload.id);
    const notes = mergeUniqueStrings(entries.map((entry) => entry.signal.notes), entries.map((entry) => entry.payload.title));
    const confidence = entries.reduce((sum, entry) => sum + entry.signal.confidence, 0) / entries.length;
    const observationMode = entries.some((entry) => entry.signal.observation_mode === "observed") ? "observed" : "inferred";
    return {
      venue: entries[0]?.signal.venue ?? key,
      confidence,
      observation_mode: observationMode,
      source_provider: provider,
      provider_run_id: providerRunId,
      trust_requirement_fit: weightedAverage(entries.map((entry) => ({
        value: entry.signal.trust_requirement_fit,
        weight: entry.signal.confidence * strengthWeight(entry.payload.strength),
      }))),
      checkout_fit: weightedAverage(entries.map((entry) => ({
        value: entry.signal.checkout_fit,
        weight: entry.signal.confidence * strengthWeight(entry.payload.strength),
      }))),
      speed_to_launch: weightedAverage(entries.map((entry) => ({
        value: entry.signal.speed_to_launch,
        weight: entry.signal.confidence * strengthWeight(entry.payload.strength),
      }))),
      audience_match: weightedAverage(entries.map((entry) => ({
        value: entry.signal.audience_match,
        weight: entry.signal.confidence * strengthWeight(entry.payload.strength),
      }))),
      evidence_ids: [...new Set(evidenceIds)],
      notes: notes.join(" | "),
    };
  });
}

export function staleAfterDaysFor(sourceType: SourceType): number {
  return SOURCE_FRESHNESS_DAYS[sourceType] ?? SOURCE_FRESHNESS_DAYS.other;
}

export function evidenceFreshnessSummary(evidence: EvidenceItemLike[]): { strength: number; stalePenalty: number; freshCount: number; staleCount: number; notes: string[] } {
  let strength = 0;
  let stalePenalty = 0;
  let freshCount = 0;
  let staleCount = 0;
  const notes: string[] = [];
  for (const item of evidence) {
    const age = ageInDays(item.collected_at);
    const staleAfter = item.stale_after_days ?? staleAfterDaysFor(item.source_type);
    strength += strengthWeight(item.strength);
    if (age > staleAfter) {
      staleCount += 1;
      stalePenalty += 4;
      notes.push(`Stale evidence: ${item.id} (${item.source_type}, ${age}d old > ${staleAfter}d)`);
    } else {
      freshCount += 1;
      notes.push(`Fresh evidence: ${item.id} (${item.source_type}, ${age}d old)`);
    }
  }
  return { strength, stalePenalty, freshCount, staleCount, notes };
}

export function researchChannelAdjustment(channel: string, researchMemo?: ResearchMemoLike | null): { adjustment: number; notes: string[] } {
  const observation = researchMemo?.channel_observations.find((item) => item.channel.toLowerCase() === channel.toLowerCase());
  if (!observation) {
    return { adjustment: 0, notes: [] };
  }
  const evidence = resolveEvidence(researchMemo, observation.evidence_ids);
  const freshness = evidenceFreshnessSummary(evidence);
  const dimensionScore = observation.icp_presence + observation.trust_match + observation.speed_to_signal + observation.cost_to_test + observation.founder_advantage;
  const evidenceDrivenScore = 50 + (dimensionScore * 5) + Math.min(10, freshness.strength * 2) - freshness.stalePenalty;
  const adjustment = Math.max(-24, Math.min(24, Math.round((evidenceDrivenScore - 50) * 0.8)));
  const benchmark = benchmarkNote(observation.benchmark_key ?? channel);
  return {
    adjustment,
    notes: [
      `Evidence-weighted adjustment: ${adjustment >= 0 ? "+" : ""}${adjustment}`,
      `Observed ICP presence: ${observation.icp_presence}`,
      `Observed trust match: ${observation.trust_match}`,
      `Observed speed to signal: ${observation.speed_to_signal}`,
      `Observed cost to test: ${observation.cost_to_test}`,
      `Observed founder advantage: ${observation.founder_advantage}`,
      `Fresh evidence count: ${freshness.freshCount}`,
      `Stale evidence count: ${freshness.staleCount}`,
      ...(benchmark ? [benchmark] : []),
      ...freshness.notes,
    ],
  };
}

export function researchVenueAdjustment(venue: string, researchMemo?: ResearchMemoLike | null): { adjustment: number; notes: string[] } {
  const observation = researchMemo?.venue_observations.find((item) => item.venue.toLowerCase() === venue.toLowerCase());
  if (!observation) {
    return { adjustment: 0, notes: [] };
  }
  const evidence = resolveEvidence(researchMemo, observation.evidence_ids);
  const freshness = evidenceFreshnessSummary(evidence);
  const dimensionScore = observation.trust_requirement_fit + observation.checkout_fit + observation.speed_to_launch + observation.audience_match;
  const evidenceDrivenScore = 50 + (dimensionScore * 6) + Math.min(8, freshness.strength * 2) - freshness.stalePenalty;
  const adjustment = Math.max(-20, Math.min(20, Math.round((evidenceDrivenScore - 50) * 0.8)));
  return {
    adjustment,
    notes: [
      `Evidence-weighted adjustment: ${adjustment >= 0 ? "+" : ""}${adjustment}`,
      `Observed trust requirement fit: ${observation.trust_requirement_fit}`,
      `Observed checkout fit: ${observation.checkout_fit}`,
      `Observed speed to launch: ${observation.speed_to_launch}`,
      `Observed audience match: ${observation.audience_match}`,
      `Fresh evidence count: ${freshness.freshCount}`,
      `Stale evidence count: ${freshness.staleCount}`,
      ...freshness.notes,
    ],
  };
}

export function mergeResearchMemoFromProvider(
  existing: ResearchMemoLike,
  query: string,
  providerRun: ResearchProviderRunLike,
  payloads: RawSourcePayloadLike[],
  updatedAt: string,
): ResearchMemoLike {
  const normalizedEvidence = normalizeProviderEvidence(payloads, providerRun.provider, providerRun.id, providerRun.raw_payload_ref);
  const providerChannels = deriveProviderChannelObservations(payloads, providerRun.provider, providerRun.id);
  const providerVenues = deriveProviderVenueObservations(payloads, providerRun.provider, providerRun.id);
  let channelObservations = existing.channel_observations;
  for (const observation of providerChannels) {
    channelObservations = upsertChannelObservation(channelObservations, observation);
  }
  let venueObservations = existing.venue_observations;
  for (const observation of providerVenues) {
    venueObservations = upsertVenueObservation(venueObservations, observation);
  }
  return {
    ...existing,
    question: query,
    provider_runs: [...existing.provider_runs, providerRun],
    evidence_table: mergeBoundedEvidence(existing.evidence_table, normalizedEvidence),
    competitors: mergeUniqueStrings(existing.competitors, collectEntityLabels(payloads, "competitor")),
    substitutes: mergeUniqueStrings(existing.substitutes, collectEntityLabels(payloads, "substitute")),
    workflow_competitors: mergeUniqueStrings(existing.workflow_competitors, collectEntityLabels(payloads, "workflow_competitor")),
    attention_competitors: mergeUniqueStrings(existing.attention_competitors, collectEntityLabels(payloads, "attention_competitor")),
    channel_observations: channelObservations,
    venue_observations: venueObservations,
    trust_signals: mergeUniqueStrings(existing.trust_signals, payloads.flatMap((item) => item.trust_signals)),
    pricing_observations: mergeUniqueStrings(existing.pricing_observations, payloads.flatMap((item) => item.pricing_observations)),
    customer_language: mergeUniqueStrings(existing.customer_language, payloads.flatMap((item) => item.customer_language)),
    updated_at: updatedAt,
  };
}
