export function registerResearchTools(deps) {
    const state = () => deps.getState();
    deps.registerVectorTool("vector_list_research_providers", {
        description: "List the research providers and interfaces available to the current VECTOR runtime.",
        inputSchema: {},
    }, async () => {
        deps.ensureToolPhase("vector_list_research_providers");
        const providers = deps.listSearchProviders();
        return {
            content: [{ type: "text", text: deps.artifactToText({
                        title: "Research Providers",
                        summary: `${providers.length} research provider(s) are available for provider-backed evidence acquisition.`,
                        decisions: providers.map((provider) => `${provider.id} (${provider.readiness}/${provider.availability}) whitelist=${provider.source_whitelist.join(", ") || "open"}`),
                        next_actions: ["Use vector_research_search with one provider to capture fresh evidence before scoring."],
                        state_delta: { research_provider_count: providers.length },
                        payload: { providers },
                    }) }],
        };
    });
    deps.registerVectorTool("vector_research_search", {
        description: "Run a provider-backed search, normalize raw payloads into evidence, and derive research observations.",
        inputSchema: {
            query: deps.zod.string().describe("Research question or search query."),
            provider: deps.zod.string().optional().describe("Provider id. Defaults to the best configured search provider."),
            source_whitelist: deps.zod.array(deps.zod.string()).optional().describe("Optional domain whitelist to constrain the provider."),
            max_results: deps.zod.number().int().positive().max(10).optional().describe("Budget cap for search results."),
        },
    }, async ({ query, provider, source_whitelist, max_results }) => {
        deps.ensureToolPhase("vector_research_search");
        const cleaned = deps.sanitizeRecursive({ query, provider, source_whitelist, max_results });
        const searchProvider = deps.getSearchProvider(cleaned.provider ?? deps.defaultSearchProviderId());
        const searchResponse = await searchProvider.search({
            query: cleaned.query,
            source_whitelist: cleaned.source_whitelist ?? [],
            max_results: cleaned.max_results ?? searchProvider.default_max_results,
        });
        const providerRun = deps.researchProviderRunSchema.parse({
            id: `${searchResponse.provider}:${Date.now()}`,
            provider: searchResponse.provider,
            interface: searchResponse.interface,
            query: searchResponse.query,
            result_count: searchResponse.result_count,
            budget_used: searchResponse.budget_used,
            raw_payload_ref: searchResponse.raw_payload_ref,
            source_whitelist: searchResponse.source_whitelist,
            collected_at: deps.now(),
        });
        const existing = state().research_memo ?? deps.defaultResearchMemo(cleaned.query);
        const nextResearchMemo = deps.researchMemoSchema.parse(deps.mergeResearchMemoFromProvider(existing, cleaned.query, providerRun, searchResponse.results, deps.now()));
        const affectedChannels = [...new Set(nextResearchMemo.channel_observations
                .filter((item) => item.provider_run_id === providerRun.id)
                .map((item) => item.channel))];
        const previewScores = affectedChannels.map((channel) => deps.scoreChannel(channel, state().stage ?? undefined, nextResearchMemo));
        const nextState = {
            ...state(),
            research_memo: nextResearchMemo,
            next_action: previewScores[0]?.next_test ?? "Map the strongest provider-backed observation into the next GTM step.",
        };
        return deps.emit("vector_research_search", {
            title: "Provider Research Search",
            summary: `Provider ${searchResponse.provider} returned ${searchResponse.result_count} result(s) for: ${cleaned.query}`,
            decisions: [
                `Provider run id: ${providerRun.id}`,
                `Evidence items appended: ${searchResponse.results.length}`,
                `Channel observations derived: ${nextResearchMemo.channel_observations.filter((item) => item.provider_run_id === providerRun.id).length}`,
                `Venue observations derived: ${nextResearchMemo.venue_observations.filter((item) => item.provider_run_id === providerRun.id).length}`,
            ],
            next_actions: previewScores.length
                ? previewScores.map((score) => `Preview ${score.channel}: ${score.score}/100`)
                : ["Run vector_channel_score to compare channels after provider-backed evidence capture."],
            state_delta: { research_memo: nextResearchMemo },
            payload: {
                provider_run: providerRun,
                raw_results: searchResponse.results,
                preview_scores: previewScores,
            },
        }, nextState);
    });
    deps.registerVectorTool("vector_source_capture", {
        description: "Capture auditable research sources with provenance and freshness metadata before synthesis.",
        inputSchema: {
            question: deps.zod.string().describe("The research question these sources support."),
            sources: deps.zod.array(deps.zod.object({
                id: deps.zod.string(),
                source: deps.zod.string(),
                source_url: deps.zod.string().url().nullable().optional(),
                source_type: deps.sourceTypeSchema,
                kind: deps.evidenceKindSchema,
                claim: deps.zod.string(),
                observed_fact: deps.zod.boolean().optional(),
                relevance: deps.zod.string().optional(),
                strength: deps.evidenceStrengthSchema,
                collected_at: deps.zod.string().optional(),
                stale_after_days: deps.zod.number().int().positive().optional(),
                notes: deps.zod.string().optional(),
            })).min(1).describe("Evidence sources to append into the research memo."),
        },
    }, async ({ question, sources }) => {
        deps.ensureToolPhase("vector_source_capture");
        const cleaned = deps.sanitizeRecursive({ question, sources });
        const normalizedSources = cleaned.sources.map((item) => deps.evidenceItemSchema.parse({
            ...item,
            source_url: item.source_url ?? null,
            observed_fact: item.observed_fact ?? true,
            relevance: item.relevance ?? "",
            collected_at: item.collected_at ?? deps.now(),
            stale_after_days: item.stale_after_days ?? deps.staleAfterDaysFor(item.source_type),
            notes: item.notes ?? "",
        }));
        const existing = state().research_memo ?? deps.defaultResearchMemo(cleaned.question);
        const nextResearchMemo = deps.researchMemoSchema.parse({
            ...existing,
            question: cleaned.question,
            evidence_table: deps.mergeBoundedEvidence(existing.evidence_table, normalizedSources, deps.maxResearchEvidenceItems),
            updated_at: deps.now(),
        });
        const nextState = {
            ...state(),
            research_memo: nextResearchMemo,
            next_action: "Map competitors and channel evidence before final scoring.",
        };
        return deps.emit("vector_source_capture", {
            title: "Source Capture",
            summary: `Captured ${normalizedSources.length} auditable sources for: ${cleaned.question}`,
            decisions: [
                `Total research evidence items: ${nextResearchMemo.evidence_table.length}`,
                `Latest source types: ${deps.mergeUniqueStrings(normalizedSources.map((item) => item.source_type)).join(", ")}`,
            ],
            next_actions: [
                "Use competitor mapping to classify the captured evidence.",
                "Attach the strongest evidence ids to channel or venue observations.",
            ],
            state_delta: { research_memo: nextResearchMemo },
            payload: { question: cleaned.question, appended_sources: normalizedSources },
        }, nextState);
    });
    deps.registerVectorTool("vector_competitor_map", {
        description: "Classify direct competitors, substitutes, workflow competitors, and attention competitors using captured evidence.",
        inputSchema: {
            competitors: deps.zod.array(deps.zod.string()).optional().describe("Direct competitors."),
            substitutes: deps.zod.array(deps.zod.string()).optional().describe("Substitutes or workarounds."),
            workflow_competitors: deps.zod.array(deps.zod.string()).optional().describe("Internal workflows or DIY alternatives."),
            attention_competitors: deps.zod.array(deps.zod.string()).optional().describe("Channels or tools competing for attention."),
            pricing_observations: deps.zod.array(deps.zod.string()).optional().describe("Pricing or packaging notes."),
            trust_signals: deps.zod.array(deps.zod.string()).optional().describe("Trust signals buyers expect."),
            customer_language: deps.zod.array(deps.zod.string()).optional().describe("Repeated buyer language."),
            unknowns: deps.zod.array(deps.zod.string()).optional().describe("Still-unresolved unknowns."),
        },
    }, async (args) => {
        deps.ensureToolPhase("vector_competitor_map");
        const cleaned = deps.sanitizeRecursive(args);
        const existingMemo = state().research_memo;
        const existing = existingMemo ?? deps.defaultResearchMemo("Market structure");
        const nextResearchMemo = deps.researchMemoSchema.parse({
            ...existing,
            competitors: deps.mergeUniqueStrings(existing.competitors, cleaned.competitors),
            substitutes: deps.mergeUniqueStrings(existing.substitutes, cleaned.substitutes),
            workflow_competitors: deps.mergeUniqueStrings(existing.workflow_competitors, cleaned.workflow_competitors),
            attention_competitors: deps.mergeUniqueStrings(existing.attention_competitors, cleaned.attention_competitors),
            pricing_observations: deps.mergeUniqueStrings(existing.pricing_observations, cleaned.pricing_observations),
            trust_signals: deps.mergeUniqueStrings(existing.trust_signals, cleaned.trust_signals),
            customer_language: deps.mergeUniqueStrings(existing.customer_language, cleaned.customer_language),
            unknowns: deps.mergeUniqueStrings(existing.unknowns, cleaned.unknowns),
            updated_at: deps.now(),
        });
        const marketMemo = {
            competitors: nextResearchMemo.competitors,
            substitutes: nextResearchMemo.substitutes,
            workflow_competitors: nextResearchMemo.workflow_competitors,
            attention_competitors: nextResearchMemo.attention_competitors,
            white_space: deps.deriveWhiteSpace(nextResearchMemo.competitors, nextResearchMemo.substitutes, nextResearchMemo.workflow_competitors, nextResearchMemo.attention_competitors),
            unresolved_unknowns: nextResearchMemo.unknowns,
        };
        const nextState = {
            ...state(),
            market_memo: marketMemo,
            research_memo: nextResearchMemo,
            next_action: "Attach channel evidence before promoting a winning motion.",
        };
        return deps.emit("vector_competitor_map", {
            title: "Competitor Map",
            summary: "Competitor structure has been reconciled into the research memo and market memo.",
            decisions: [
                `Direct competitors: ${nextResearchMemo.competitors.length}`,
                `Substitutes: ${nextResearchMemo.substitutes.length}`,
                `Workflow competitors: ${nextResearchMemo.workflow_competitors.length}`,
                `Attention competitors: ${nextResearchMemo.attention_competitors.length}`,
            ],
            next_actions: [
                "Link the strongest evidence ids to channel observations.",
                "Use unresolved unknowns as blockers before scaling the thesis.",
            ],
            state_delta: { market_memo: marketMemo, research_memo: nextResearchMemo },
            payload: nextResearchMemo,
        }, nextState);
    });
    deps.registerVectorTool("vector_channel_evidence", {
        description: "Store evidence-backed channel observations that drive evidence-first scoring.",
        inputSchema: {
            channel: deps.zod.string().describe("The channel being evaluated."),
            icp_presence: deps.researchDimensionSchema.describe("Observed buyer presence in this channel."),
            trust_match: deps.researchDimensionSchema.describe("Observed trust match for this channel."),
            speed_to_signal: deps.researchDimensionSchema.describe("Observed speed to first signal."),
            cost_to_test: deps.researchDimensionSchema.describe("Observed cost or friction to test."),
            founder_advantage: deps.researchDimensionSchema.describe("Observed founder edge in this channel."),
            evidence_ids: deps.zod.array(deps.zod.string()).min(1).describe("Evidence ids supporting this observation."),
            benchmark_key: deps.zod.string().optional().describe("Optional benchmark library key; defaults to channel."),
            notes: deps.zod.string().optional().describe("Short analyst notes."),
        },
    }, async (args) => {
        deps.ensureToolPhase("vector_channel_evidence");
        const cleaned = deps.sanitizeRecursive(args);
        const existingMemo = state().research_memo;
        const existing = existingMemo ?? deps.defaultResearchMemo("Channel evidence");
        const missingEvidence = cleaned.evidence_ids.filter((id) => !existing.evidence_table.some((item) => item.id === id));
        if (missingEvidence.length) {
            throw new Error(`Channel evidence references missing evidence ids: ${missingEvidence.join(", ")}`);
        }
        const observation = deps.researchChannelObservationSchema.parse({
            ...cleaned,
            benchmark_key: cleaned.benchmark_key ?? cleaned.channel,
            notes: cleaned.notes ?? "",
        });
        const nextResearchMemo = deps.researchMemoSchema.parse({
            ...existing,
            channel_observations: deps.upsertChannelObservation(existing.channel_observations, observation),
            updated_at: deps.now(),
        });
        const preview = deps.scoreChannel(cleaned.channel, state().stage ?? undefined, nextResearchMemo);
        const nextState = {
            ...state(),
            research_memo: nextResearchMemo,
            next_action: preview.next_test,
        };
        return deps.emit("vector_channel_evidence", {
            title: "Channel Evidence",
            summary: `Stored evidence-backed observation for ${cleaned.channel}.`,
            decisions: [
                `Evidence ids linked: ${cleaned.evidence_ids.length}`,
                `Preview score: ${preview.score}/100`,
                `Benchmark key: ${observation.benchmark_key ?? cleaned.channel}`,
            ],
            next_actions: [
                preview.next_test,
                "Compare this channel against peers only after enough fresh evidence exists.",
            ],
            state_delta: { research_memo: nextResearchMemo },
            payload: { observation, preview },
        }, nextState);
    });
    deps.registerVectorTool("vector_research_memo", {
        description: "Capture structured research evidence and convert it into a reusable research memo for later channel and venue decisions.",
        inputSchema: {
            question: deps.zod.string().describe("The research question being answered."),
            evidence_table: deps.zod.array(deps.evidenceItemSchema).min(1).describe("Observed evidence items with provenance and strength."),
            competitors: deps.zod.array(deps.zod.string()).optional().describe("Named direct competitors."),
            substitutes: deps.zod.array(deps.zod.string()).optional().describe("Named substitutes or workarounds."),
            workflow_competitors: deps.zod.array(deps.zod.string()).optional().describe("Internal workflows competing with the product."),
            attention_competitors: deps.zod.array(deps.zod.string()).optional().describe("Channels or tools stealing buyer attention."),
            channel_observations: deps.zod.array(deps.researchChannelObservationSchema).optional().describe("Observed research-derived channel adjustments."),
            venue_observations: deps.zod.array(deps.researchVenueObservationSchema).optional().describe("Observed research-derived venue adjustments."),
            trust_signals: deps.zod.array(deps.zod.string()).optional().describe("Trust signals buyers expect."),
            pricing_observations: deps.zod.array(deps.zod.string()).optional().describe("Observed pricing or packaging notes."),
            customer_language: deps.zod.array(deps.zod.string()).optional().describe("Repeated customer language or phrases."),
            synthesis: deps.zod.string().describe("What the evidence most likely means."),
            recommendation: deps.zod.string().describe("The current recommendation from the research pass."),
            risks: deps.zod.array(deps.zod.string()).optional().describe("Key risks discovered in research."),
            unknowns: deps.zod.array(deps.zod.string()).optional().describe("Unresolved unknowns still blocking confidence."),
            next_experiment: deps.zod.string().describe("The smallest next experiment justified by the evidence."),
        },
    }, async (args) => {
        deps.ensureToolPhase("vector_research_memo");
        const cleaned = deps.sanitizeRecursive(args);
        const normalizedEvidenceTable = (cleaned.evidence_table ?? []).map((item) => deps.evidenceItemSchema.parse({
            ...item,
            stale_after_days: item.stale_after_days ?? deps.staleAfterDaysFor(item.source_type),
        }));
        const researchMemo = deps.researchMemoSchema.parse({
            ...cleaned,
            evidence_table: normalizedEvidenceTable,
            competitors: cleaned.competitors ?? [],
            substitutes: cleaned.substitutes ?? [],
            workflow_competitors: cleaned.workflow_competitors ?? [],
            attention_competitors: cleaned.attention_competitors ?? [],
            channel_observations: cleaned.channel_observations ?? [],
            venue_observations: cleaned.venue_observations ?? [],
            trust_signals: cleaned.trust_signals ?? [],
            pricing_observations: cleaned.pricing_observations ?? [],
            customer_language: cleaned.customer_language ?? [],
            risks: cleaned.risks ?? [],
            unknowns: cleaned.unknowns ?? [],
            updated_at: deps.now(),
        });
        const marketMemo = {
            competitors: researchMemo.competitors,
            substitutes: researchMemo.substitutes,
            workflow_competitors: researchMemo.workflow_competitors,
            attention_competitors: researchMemo.attention_competitors,
            white_space: deps.deriveWhiteSpace(researchMemo.competitors, researchMemo.substitutes, researchMemo.workflow_competitors, researchMemo.attention_competitors),
            unresolved_unknowns: researchMemo.unknowns,
        };
        const nextPhase = state().phase === "market" ? "channel" : state().phase;
        const nextState = {
            ...state(),
            phase: nextPhase,
            market_memo: marketMemo,
            research_memo: researchMemo,
            next_action: researchMemo.next_experiment,
        };
        return deps.emit("vector_research_memo", {
            title: "Research Memo",
            summary: `Research memo captured for question: ${researchMemo.question}`,
            decisions: [
                `Evidence items captured: ${researchMemo.evidence_table.length}`,
                `Channel observations: ${researchMemo.channel_observations.length}`,
                `Venue observations: ${researchMemo.venue_observations.length}`,
                `Recommendation: ${researchMemo.recommendation}`,
            ],
            next_actions: [
                researchMemo.next_experiment,
                "Feed the structured observations into channel and venue scoring before changing the thesis.",
            ],
            state_delta: {
                phase: nextPhase,
                market_memo: marketMemo,
                research_memo: researchMemo,
            },
            payload: researchMemo,
        }, nextState);
    });
}
