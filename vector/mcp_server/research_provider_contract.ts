import { z } from "zod";

export const RESEARCH_PROVIDER_INTERFACES = [
  "search",
  "crawl",
  "extract",
  "browser_session",
  "deep_research_job",
] as const;

export const ResearchProviderInterfaceSchema = z.enum(RESEARCH_PROVIDER_INTERFACES);
export const ObservationModeSchema = z.enum(["observed", "inferred"]).default("observed");
export const ProviderReadinessSchema = z.enum(["fixture", "production"]);
export const ProviderAvailabilitySchema = z.enum(["configured", "requires_env"]);

export const RawSourcePayloadSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  source: z.string(),
  source_type: z.enum([
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
  ]),
  kind: z.enum([
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
  ]),
  claim: z.string(),
  observed_fact: z.boolean().default(true),
  strength: z.enum(["weak", "medium", "strong"]).default("medium"),
  relevance: z.string().default(""),
  notes: z.string().default(""),
  collected_at: z.string(),
  channel_signals: z.array(z.object({
    channel: z.string(),
    icp_presence: z.number().int().min(-2).max(2),
    trust_match: z.number().int().min(-2).max(2),
    speed_to_signal: z.number().int().min(-2).max(2),
    cost_to_test: z.number().int().min(-2).max(2),
    founder_advantage: z.number().int().min(-2).max(2),
    confidence: z.number().min(0).max(1).default(0.7),
    observation_mode: ObservationModeSchema,
    notes: z.string().default(""),
  })).default([]),
  venue_signals: z.array(z.object({
    venue: z.string(),
    trust_requirement_fit: z.number().int().min(-2).max(2),
    checkout_fit: z.number().int().min(-2).max(2),
    speed_to_launch: z.number().int().min(-2).max(2),
    audience_match: z.number().int().min(-2).max(2),
    confidence: z.number().min(0).max(1).default(0.7),
    observation_mode: ObservationModeSchema,
    notes: z.string().default(""),
  })).default([]),
  trust_signals: z.array(z.string()).default([]),
  pricing_observations: z.array(z.string()).default([]),
  customer_language: z.array(z.string()).default([]),
});

export const SearchProviderRequestSchema = z.object({
  query: z.string(),
  source_whitelist: z.array(z.string()).default([]),
  max_results: z.number().int().positive().max(10).default(5),
});

export const SearchProviderResponseSchema = z.object({
  provider: z.string(),
  interface: z.literal("search"),
  query: z.string(),
  result_count: z.number().int().nonnegative(),
  budget_used: z.number().nonnegative(),
  raw_payload_ref: z.string(),
  source_whitelist: z.array(z.string()).default([]),
  results: z.array(RawSourcePayloadSchema),
});

export const SearchProviderDescriptorSchema = z.object({
  id: z.string(),
  label: z.string(),
  interface: z.literal("search"),
  description: z.string(),
  readiness: ProviderReadinessSchema,
  availability: ProviderAvailabilitySchema,
  required_env: z.array(z.string()).default([]),
  source_whitelist: z.array(z.string()).default([]),
  default_max_results: z.number().int().positive(),
});

export type ResearchProviderInterface = z.infer<typeof ResearchProviderInterfaceSchema>;
export type RawSourcePayload = z.infer<typeof RawSourcePayloadSchema>;
export type SearchProviderRequest = z.infer<typeof SearchProviderRequestSchema>;
export type SearchProviderResponse = z.infer<typeof SearchProviderResponseSchema>;
export type SearchProviderDescriptor = z.infer<typeof SearchProviderDescriptorSchema>;

export interface SearchProvider {
  id: string;
  label: string;
  description: string;
  readiness: z.infer<typeof ProviderReadinessSchema>;
  required_env: string[];
  source_whitelist: string[];
  default_max_results: number;
  isConfigured(): boolean;
  search(input: SearchProviderRequest): Promise<SearchProviderResponse>;
}

export interface ResearchProviderRegistry {
  search: Record<string, SearchProvider>;
}
