import {
  RawSourcePayloadSchema,
  SearchProviderDescriptorSchema,
  SearchProviderResponseSchema,
  type ResearchProviderRegistry,
  type SearchProvider,
  type SearchProviderDescriptor,
  type SearchProviderRequest,
} from "./research_provider_contract.js";
import { buildHeuristicSearchPayload } from "./research_runtime.js";

const FIXTURE_PROVIDER_ID = "fixture_search";
const TAVILY_PROVIDER_ID = "tavily_search";
const EXA_PROVIDER_ID = "exa_search";
const FIXTURE_WHITELIST = ["docs.vector.gt", "github.com", "community.example", "benchmark.vector.gt"];
const PROVIDER_TIMEOUT_MS = 12_000;

const FIXTURE_DOCUMENTS = [
  {
    id: "fixture-cold-email-1",
    title: "Founder outbound teardown benchmarks",
    url: "https://benchmark.vector.gt/founder-outbound-benchmarks",
    source: "VECTOR Benchmark Library",
    source_type: "benchmark",
    kind: "channel_presence",
    claim: "Cold email still reaches solo SaaS founders quickly when the message is personalized around a live bottleneck.",
    observed_fact: true,
    strength: "strong",
    relevance: "Fast signal path for founder-led GTM.",
    notes: "Benchmark showed qualified replies in small but targeted cohorts.",
    collected_at: "2026-03-20T08:00:00.000Z",
    channel_signals: [
      {
        channel: "cold email",
        icp_presence: 2,
        trust_match: 1,
        speed_to_signal: 2,
        cost_to_test: 1,
        founder_advantage: 2,
        confidence: 0.84,
        observation_mode: "observed",
        notes: "Reply quality stayed highest for founder-personalized outreach.",
      },
    ],
    venue_signals: [],
    trust_signals: ["One teardown-style proof asset"],
    pricing_observations: [],
    customer_language: ["Need the first repeatable outbound loop"],
  },
  {
    id: "fixture-cold-email-2",
    title: "Community discussion: solo founders buying outbound help",
    url: "https://community.example/solo-founders-outbound-thread",
    source: "Community Thread",
    source_type: "community_post",
    kind: "customer_language",
    claim: "Founders ask for low-friction teardown offers before committing to a full implementation sprint.",
    observed_fact: true,
    strength: "medium",
    relevance: "Shows buyer language and entry-offer expectations.",
    notes: "Thread clustered around teardown, audit, and proof-first language.",
    collected_at: "2026-03-22T09:30:00.000Z",
    channel_signals: [
      {
        channel: "cold email",
        icp_presence: 1,
        trust_match: 1,
        speed_to_signal: 1,
        cost_to_test: 1,
        founder_advantage: 1,
        confidence: 0.76,
        observation_mode: "observed",
        notes: "Cold outreach was repeatedly mentioned as the first motion under discussion.",
      },
    ],
    venue_signals: [
      {
        venue: "landing page",
        trust_requirement_fit: 1,
        checkout_fit: 1,
        speed_to_launch: 2,
        audience_match: 1,
        confidence: 0.71,
        observation_mode: "inferred",
        notes: "The discussion implies a simple landing page plus teardown CTA fits the trust requirement.",
      },
    ],
    trust_signals: ["Case-study style teardown"],
    pricing_observations: ["Entry offer expected before higher-ticket implementation"],
    customer_language: ["Show me what is broken before I buy the sprint"],
  },
  {
    id: "fixture-community-1",
    title: "Operator communities and traction loops",
    url: "https://docs.vector.gt/operator-community-loops",
    source: "VECTOR Research Notes",
    source_type: "official_docs",
    kind: "channel_presence",
    claim: "Founder communities help with trust but often move slower than direct outreach for first revenue.",
    observed_fact: true,
    strength: "medium",
    relevance: "Useful contrast against cold email speed.",
    notes: "Good trust channel, slower than direct outbound for immediate feedback.",
    collected_at: "2026-03-21T11:00:00.000Z",
    channel_signals: [
      {
        channel: "community",
        icp_presence: 2,
        trust_match: 2,
        speed_to_signal: -1,
        cost_to_test: 1,
        founder_advantage: 0,
        confidence: 0.78,
        observation_mode: "observed",
        notes: "Communities are strong for trust, weaker for immediate signal speed.",
      },
    ],
    venue_signals: [],
    trust_signals: ["Visible operator credibility"],
    pricing_observations: [],
    customer_language: ["Need warm proof before hiring help"],
  },
] as const;

function normalizeWhitelist(sourceWhitelist: string[], providerWhitelist: string[]): string[] {
  if (!sourceWhitelist.length) {
    return providerWhitelist;
  }
  if (!providerWhitelist.length) {
    return sourceWhitelist;
  }
  return sourceWhitelist.filter((item) => providerWhitelist.includes(item));
}

function scoreDocumentAgainstQuery(document: (typeof FIXTURE_DOCUMENTS)[number], query: string): number {
  const haystack = [
    document.title,
    document.claim,
    document.relevance,
    document.notes,
    ...document.customer_language,
    ...document.channel_signals.map((item) => item.channel),
    ...document.venue_signals.map((item) => item.venue),
  ].join(" ").toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Research provider requires env var '${name}'.`);
  }
  return value;
}

function providerDescriptor(provider: SearchProvider): SearchProviderDescriptor {
  return SearchProviderDescriptorSchema.parse({
    id: provider.id,
    label: provider.label,
    interface: "search",
    description: provider.description,
    readiness: provider.readiness,
    availability: provider.isConfigured() ? "configured" : "requires_env",
    required_env: provider.required_env,
    source_whitelist: provider.source_whitelist,
    default_max_results: provider.default_max_results,
  });
}

function mapSearchResultToPayload(params: {
  providerId: string;
  query: string;
  index: number;
  title?: string | null;
  url?: string | null;
  snippet?: string | null;
  publishedAt?: string | null;
}) {
  const payload = buildHeuristicSearchPayload(params);
  return payload ? RawSourcePayloadSchema.parse(payload) : null;
}

async function fetchJson(url: string, init: RequestInit, providerLabel: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`${providerLabel} search failed (${response.status}).`);
    }
    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${providerLabel} search timed out after ${PROVIDER_TIMEOUT_MS}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const fixtureSearchProvider: SearchProvider = {
  id: FIXTURE_PROVIDER_ID,
  label: "Fixture Search Provider",
  description: "Deterministic in-repo provider used for tests, offline development, and baseline evidence flows.",
  readiness: "fixture",
  required_env: [],
  source_whitelist: FIXTURE_WHITELIST,
  default_max_results: 5,
  isConfigured() {
    return true;
  },
  async search(input: SearchProviderRequest) {
    const whitelist = normalizeWhitelist(input.source_whitelist, FIXTURE_WHITELIST);
    const allowedDocuments = FIXTURE_DOCUMENTS.filter((item) => whitelist.includes(new URL(item.url).host));
    const ranked = [...allowedDocuments]
      .map((item) => ({ item, score: scoreDocumentAgainstQuery(item, input.query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(input.max_results, 10))
      .map((item) => RawSourcePayloadSchema.parse(item.item));

    return SearchProviderResponseSchema.parse({
      provider: FIXTURE_PROVIDER_ID,
      interface: "search",
      query: input.query,
      result_count: ranked.length,
      budget_used: ranked.length,
      raw_payload_ref: `${FIXTURE_PROVIDER_ID}:${Buffer.from(input.query).toString("base64url")}`,
      source_whitelist: whitelist,
      results: ranked,
    });
  },
};

const tavilySearchProvider: SearchProvider = {
  id: TAVILY_PROVIDER_ID,
  label: "Tavily Search",
  description: "Production web search provider backed by the Tavily Search API.",
  readiness: "production",
  required_env: ["TAVILY_API_KEY"],
  source_whitelist: [],
  default_max_results: 5,
  isConfigured() {
    return Boolean(process.env.TAVILY_API_KEY?.trim());
  },
  async search(input: SearchProviderRequest) {
    const apiKey = requireEnv("TAVILY_API_KEY");
    const data = await fetchJson("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: input.query,
        max_results: input.max_results,
        search_depth: "basic",
        include_answer: false,
        include_raw_content: false,
        ...(input.source_whitelist.length ? { include_domains: input.source_whitelist } : {}),
      }),
    }, "Tavily") as { results?: Array<{ title?: string; url?: string; content?: string; published_date?: string }> };
    const results = (data.results ?? [])
      .map((item, index) => mapSearchResultToPayload({
        providerId: TAVILY_PROVIDER_ID,
        query: input.query,
        index,
        title: item.title ?? null,
        url: item.url ?? null,
        snippet: item.content ?? null,
        publishedAt: item.published_date ?? null,
      }))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, input.max_results);

    return SearchProviderResponseSchema.parse({
      provider: TAVILY_PROVIDER_ID,
      interface: "search",
      query: input.query,
      result_count: results.length,
      budget_used: results.length,
      raw_payload_ref: `${TAVILY_PROVIDER_ID}:${Buffer.from(input.query).toString("base64url")}`,
      source_whitelist: input.source_whitelist,
      results,
    });
  },
};

const exaSearchProvider: SearchProvider = {
  id: EXA_PROVIDER_ID,
  label: "Exa Search",
  description: "Production semantic search provider backed by the Exa API.",
  readiness: "production",
  required_env: ["EXA_API_KEY"],
  source_whitelist: [],
  default_max_results: 5,
  isConfigured() {
    return Boolean(process.env.EXA_API_KEY?.trim());
  },
  async search(input: SearchProviderRequest) {
    const apiKey = requireEnv("EXA_API_KEY");
    const data = await fetchJson("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        query: input.query,
        numResults: input.max_results,
        contents: {
          text: true,
        },
        ...(input.source_whitelist.length ? { includeDomains: input.source_whitelist } : {}),
      }),
    }, "Exa") as { results?: Array<{ title?: string; url?: string; text?: string; publishedDate?: string }> };
    const results = (data.results ?? [])
      .map((item, index) => mapSearchResultToPayload({
        providerId: EXA_PROVIDER_ID,
        query: input.query,
        index,
        title: item.title ?? null,
        url: item.url ?? null,
        snippet: item.text ?? null,
        publishedAt: item.publishedDate ?? null,
      }))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, input.max_results);

    return SearchProviderResponseSchema.parse({
      provider: EXA_PROVIDER_ID,
      interface: "search",
      query: input.query,
      result_count: results.length,
      budget_used: results.length,
      raw_payload_ref: `${EXA_PROVIDER_ID}:${Buffer.from(input.query).toString("base64url")}`,
      source_whitelist: input.source_whitelist,
      results,
    });
  },
};

const registry: ResearchProviderRegistry = {
  search: {
    [FIXTURE_PROVIDER_ID]: fixtureSearchProvider,
    [TAVILY_PROVIDER_ID]: tavilySearchProvider,
    [EXA_PROVIDER_ID]: exaSearchProvider,
  },
};

export function getResearchProviderRegistry(): ResearchProviderRegistry {
  return registry;
}

export function listSearchProviders(): SearchProviderDescriptor[] {
  return Object.values(registry.search).map((provider) => providerDescriptor(provider));
}

export function getSearchProvider(providerId: string): SearchProvider {
  const provider = registry.search[providerId];
  if (!provider) {
    throw new Error(`Unknown search provider '${providerId}'.`);
  }
  if (!provider.isConfigured()) {
    const requirements = provider.required_env.length ? ` Missing env: ${provider.required_env.join(", ")}.` : "";
    throw new Error(`Search provider '${providerId}' is not configured.${requirements}`);
  }
  return provider;
}

export function defaultSearchProviderId(): string {
  const preferred = [TAVILY_PROVIDER_ID, EXA_PROVIDER_ID].find((providerId) => registry.search[providerId]?.isConfigured());
  return preferred ?? FIXTURE_PROVIDER_ID;
}
