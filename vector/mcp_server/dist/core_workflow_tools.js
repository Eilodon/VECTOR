export function registerWorkflowTools(deps) {
    const state = () => deps.getState();
    deps.registerVectorTool("vector_intake", {
        description: "Collect the minimum viable input for VECTOR and initialize the execution context.",
        inputSchema: {
            product_description: deps.zod.string().describe("A one-sentence description of the product."),
            icp_hypothesis: deps.zod.string().describe("Initial ICP hypothesis."),
            is_live: deps.zod.boolean().describe("Whether the product is already live."),
            product_name: deps.zod.string().optional().describe("Optional product name."),
            product_price: deps.zod.string().optional().describe("Optional price or pricing signal."),
            product_category: deps.zod.string().optional().describe("Optional product category."),
            builder_background: deps.zod.string().optional().describe("Founder background, distribution history, and audience presence."),
            persona: deps.personaSchema.optional().describe("Optional routing persona."),
            intent: deps.zod.string().optional().describe("Optional routing intent."),
            platform: deps.zod.string().optional().describe("Optional platform name."),
            mode: deps.modeSchema.optional().describe("Optional routing mode."),
            stage: deps.stageSchema.optional().describe("Optional product stage."),
        },
    }, async ({ product_description, icp_hypothesis, is_live, product_name, product_price, product_category, builder_background, persona, intent, platform, mode, stage }) => {
        const cleaned = deps.sanitizeRecursive({ product_description, icp_hypothesis, is_live, product_name, product_price, product_category, builder_background, persona, intent, platform, mode, stage });
        const nextPhase = "icp";
        const nextState = {
            ...state(),
            phase: nextPhase,
            milestone: deps.phaseToMilestone[nextPhase],
            stage: cleaned.stage ?? deps.phaseToStage(nextPhase),
            product_description: cleaned.product_description,
            product: {
                ...(state().product ?? deps.defaultProduct()),
                name: cleaned.product_name ?? cleaned.product_description,
                summary: cleaned.product_description,
                price: cleaned.product_price ?? state().product?.price ?? null,
                live_status: cleaned.is_live ? "live" : "prelaunch",
                category: cleaned.product_category ?? state().product?.category ?? null,
            },
            icp_hypothesis: cleaned.icp_hypothesis,
            builder_background: cleaned.builder_background ?? null,
            icp_confirmed: false,
            next_action: cleaned.is_live ? "Run ICP/JTBD validation on the current audience or target segment." : "Clarify the first target segment before launch.",
            icp_drift: "unknown",
            routing: {
                ...(state().routing ?? deps.defaultRouting(nextPhase)),
                persona: cleaned.persona ?? state().routing?.persona ?? "unknown",
                intent: cleaned.intent ?? state().routing?.intent ?? null,
                platform: cleaned.platform ?? state().routing?.platform ?? null,
                mode: cleaned.mode ?? state().routing?.mode ?? deps.inferModeForPhase(nextPhase),
                last_router_reason: "captured during intake",
            },
            session: {
                ...(state().session ?? deps.defaultSession()),
                kb_synced: false,
                last_sync: null,
                schema_version: deps.getCurrentVersion(),
            },
            market_memo: null,
            research_memo: null,
            channel_selected: null,
            venue_selected: null,
            thesis_card: null,
            venue_card: null,
            sales_copy: null,
        };
        return deps.emit("vector_intake", {
            title: "VECTOR Intake Card",
            summary: `Intake captured for ${cleaned.product_description}. VECTOR has been routed into the ICP phase.`,
            decisions: [
                `Product: ${cleaned.product_description}`,
                `Initial ICP hypothesis: ${cleaned.icp_hypothesis}`,
                `Live status: ${cleaned.is_live ? "live" : "not live"}`,
                cleaned.product_price ? `Price signal: ${cleaned.product_price}` : "Price signal: not provided",
            ],
            next_actions: [
                "Refine the ICP into a single target user with a concrete job statement.",
                "Record the riskiest assumption before moving to market analysis.",
            ],
            state_delta: {
                phase: nextPhase,
                milestone: deps.phaseToMilestone[nextPhase],
                stage: cleaned.stage ?? deps.phaseToStage(nextPhase),
                product_description: cleaned.product_description,
                icp_hypothesis: cleaned.icp_hypothesis,
                builder_background: cleaned.builder_background ?? null,
                routing: {
                    persona: cleaned.persona ?? "unknown",
                    mode: cleaned.mode ?? deps.inferModeForPhase(nextPhase),
                    platform: cleaned.platform ?? null,
                    intent: cleaned.intent ?? null,
                    last_router_reason: "captured during intake",
                },
            },
            payload: cleaned,
        }, nextState);
    });
    deps.registerVectorTool("vector_icp_jtbd", {
        description: "Convert the intake into an ICP + JTBD card with a concrete risk statement.",
        inputSchema: {
            target_user: deps.zod.string().describe("The single target user segment."),
            job_statement: deps.zod.string().describe("The job the user is trying to get done."),
            riskiest_assumption: deps.zod.string().describe("The riskiest assumption that must be validated first."),
            evidence: deps.zod.array(deps.zod.string()).optional().describe("Optional evidence notes or source bullets."),
            watering_holes: deps.zod.array(deps.zod.string()).optional().describe("Where the ICP already congregates or listens."),
            wtp_signal: deps.zod.string().optional().describe("Observed willingness-to-pay signal."),
            trigger_moment: deps.zod.string().optional().describe("What event makes the ICP act now."),
            desired_outcome: deps.zod.string().optional().describe("The concrete outcome the ICP wants."),
            push: deps.zod.string().optional().describe("4 Forces: pain or urgency pushing the ICP away from the status quo."),
            pull: deps.zod.string().optional().describe("4 Forces: desired outcome pulling the ICP toward change."),
            anxiety: deps.zod.string().optional().describe("4 Forces: fear, risk, or uncertainty blocking the switch."),
            habit: deps.zod.string().optional().describe("4 Forces: inertia or current workaround keeping the ICP in place."),
            evidence_tags: deps.zod.object({
                who: deps.evidenceTagSchema.optional(),
                problem: deps.evidenceTagSchema.optional(),
                trigger_moment: deps.evidenceTagSchema.optional(),
                wtp_signal: deps.evidenceTagSchema.optional(),
                forces: deps.evidenceTagSchema.optional(),
            }).optional().describe("Optional evidence tags for the ICP card claims."),
            confidence: deps.confidenceLevelSchema.optional().describe("Overall confidence level for the ICP card."),
            top_unknown: deps.zod.string().optional().describe("The single biggest unknown left in the ICP card."),
            next_experiment: deps.zod.string().optional().describe("The next smallest experiment to reduce uncertainty."),
        },
    }, async ({ target_user, job_statement, riskiest_assumption, evidence, watering_holes, wtp_signal, trigger_moment, desired_outcome, push, pull, anxiety, habit, evidence_tags, confidence, top_unknown, next_experiment }) => {
        deps.ensureToolPhase("vector_icp_jtbd");
        const cleaned = deps.sanitizeRecursive({ target_user, job_statement, riskiest_assumption, evidence, watering_holes, wtp_signal, trigger_moment, desired_outcome, push, pull, anxiety, habit, evidence_tags, confidence, top_unknown, next_experiment });
        const nextPhase = "market";
        const nextState = {
            ...state(),
            phase: nextPhase,
            milestone: deps.phaseToMilestone[nextPhase],
            stage: deps.phaseToStage(nextPhase),
            target_user: cleaned.target_user,
            job_statement: cleaned.job_statement,
            riskiest_assumption: cleaned.riskiest_assumption,
            icp_confirmed: true,
            icp_drift: "observed",
            icp: {
                ...(state().icp ?? deps.defaultICP()),
                hypothesis: state().icp?.hypothesis ?? state().icp_hypothesis ?? null,
                confirmed: true,
                who: cleaned.target_user,
                problem: cleaned.job_statement,
                trigger_moment: cleaned.trigger_moment ?? state().icp?.trigger_moment ?? null,
                desired_outcome: cleaned.desired_outcome ?? state().icp?.desired_outcome ?? null,
                watering_holes: cleaned.watering_holes ?? state().icp?.watering_holes ?? [],
                wtp_signal: cleaned.wtp_signal ?? state().icp?.wtp_signal ?? null,
                evidence: cleaned.evidence ?? state().icp?.evidence ?? [],
                drift_status: "observed",
                evidence_tags: {
                    ...(state().icp?.evidence_tags ?? deps.defaultICP().evidence_tags),
                    ...(cleaned.evidence_tags ?? {}),
                },
                confidence: cleaned.confidence ?? state().icp?.confidence ?? "unknown",
                top_unknown: cleaned.top_unknown ?? state().icp?.top_unknown ?? null,
                next_experiment: cleaned.next_experiment ?? state().icp?.next_experiment ?? null,
                forces: {
                    ...(state().icp?.forces ?? deps.defaultICP().forces),
                    push: cleaned.push ?? state().icp?.forces.push ?? null,
                    pull: cleaned.pull ?? state().icp?.forces.pull ?? null,
                    anxiety: cleaned.anxiety ?? state().icp?.forces.anxiety ?? null,
                    habit: cleaned.habit ?? state().icp?.forces.habit ?? null,
                },
            },
            risk: {
                riskiest_assumption: cleaned.riskiest_assumption,
                top_failure_mode: state().risk?.top_failure_mode ?? null,
                drift_status: "observed",
            },
            research_memo: null,
            next_action: "Map the market terrain and separate competitors from substitutes.",
        };
        return deps.emit("vector_icp_jtbd", {
            title: "ICP + JTBD Card",
            summary: `The target user has been clarified as ${cleaned.target_user}. The system now carries a concrete job statement and a riskiest assumption.`,
            decisions: [
                `Target user: ${cleaned.target_user}`,
                `Job statement: ${cleaned.job_statement}`,
                `Riskiest assumption: ${cleaned.riskiest_assumption}`,
                `4 Forces mapped: ${[cleaned.push, cleaned.pull, cleaned.anxiety, cleaned.habit].every(Boolean) ? "yes" : "partial"}`,
            ],
            next_actions: [
                "Collect direct market evidence around competitors, substitutes, and workarounds.",
                "Validate whether the ICP is actively experiencing the stated job and pain.",
            ],
            state_delta: {
                phase: nextPhase,
                milestone: deps.phaseToMilestone[nextPhase],
                stage: deps.phaseToStage(nextPhase),
                target_user: cleaned.target_user,
                job_statement: cleaned.job_statement,
                riskiest_assumption: cleaned.riskiest_assumption,
                icp_confirmed: true,
                watering_holes: cleaned.watering_holes ?? [],
                wtp_signal: cleaned.wtp_signal ?? null,
                trigger_moment: cleaned.trigger_moment ?? null,
                desired_outcome: cleaned.desired_outcome ?? null,
                forces: {
                    push: cleaned.push ?? null,
                    pull: cleaned.pull ?? null,
                    anxiety: cleaned.anxiety ?? null,
                    habit: cleaned.habit ?? null,
                },
            },
            payload: {
                ...cleaned,
                evidence: cleaned.evidence ?? [],
                watering_holes: cleaned.watering_holes ?? [],
                wtp_signal: cleaned.wtp_signal ?? null,
                trigger_moment: cleaned.trigger_moment ?? null,
                desired_outcome: cleaned.desired_outcome ?? null,
            },
        }, nextState);
    });
    deps.registerVectorTool("vector_market_terrain", {
        description: "Map the market terrain across direct competitors, substitutes, workflow competitors, and attention competitors.",
        inputSchema: {
            stage_confirmed: deps.zod.string().optional().describe("Confirmed operating stage, such as 0→1, 1→10, or 10→100."),
            market_category: deps.zod.string().optional().describe("How buyers currently think about this market or category."),
            category_stance: deps.zod.string().optional().describe("Category stance: entering, reframing, or creating."),
            competitors: deps.zod.array(deps.zod.string()).optional().describe("Direct competitors."),
            substitutes: deps.zod.array(deps.zod.string()).optional().describe("Substitutes or manual workarounds."),
            workflow_competitors: deps.zod.array(deps.zod.string()).optional().describe("Internal workflows, spreadsheets, or DIY systems."),
            attention_competitors: deps.zod.array(deps.zod.string()).optional().describe("People, tools, or channels competing for the same ICP attention."),
            gold_zone_channels: deps.zod.array(deps.zod.string()).optional().describe("Channels with high ICP presence and manageable competitor density."),
            red_ocean: deps.zod.array(deps.zod.string()).optional().describe("Channels to avoid at the current stage."),
            white_space_notes: deps.zod.string().optional().describe("Why whitespace exists in the current market terrain."),
            why_now_pressure: deps.zod.string().optional().describe("Market shift or urgency increasing buyer intent now."),
            next_research_question: deps.zod.string().optional().describe("The next market question that would most improve channel choice."),
            notes: deps.zod.array(deps.zod.string()).optional().describe("Optional market notes."),
        },
    }, async ({ stage_confirmed, market_category, category_stance, competitors, substitutes, workflow_competitors, attention_competitors, gold_zone_channels, red_ocean, white_space_notes, why_now_pressure, next_research_question, notes }) => {
        deps.ensureToolPhase("vector_market_terrain");
        const cleaned = deps.sanitizeRecursive({ stage_confirmed, market_category, category_stance, competitors, substitutes, workflow_competitors, attention_competitors, gold_zone_channels, red_ocean, white_space_notes, why_now_pressure, next_research_question, notes });
        const marketMemo = {
            competitors: cleaned.competitors ?? [],
            substitutes: cleaned.substitutes ?? [],
            workflow_competitors: cleaned.workflow_competitors ?? [],
            attention_competitors: cleaned.attention_competitors ?? [],
            white_space: deps.deriveWhiteSpace(cleaned.competitors ?? [], cleaned.substitutes ?? [], cleaned.workflow_competitors ?? [], cleaned.attention_competitors ?? []),
            unresolved_unknowns: [
                cleaned.competitors?.length ? "" : "Need named competitors.",
                cleaned.substitutes?.length ? "" : "Need substitute/workaround map.",
                cleaned.workflow_competitors?.length ? "" : "Need internal workflow competitor map.",
                cleaned.attention_competitors?.length ? "" : "Need attention competitor map.",
            ].filter(Boolean),
        };
        const nextPhase = state().founder_edge_audit.length ? "channel" : "market";
        const nextState = {
            ...state(),
            phase: nextPhase,
            milestone: deps.phaseToMilestone[nextPhase],
            stage: state().stage ?? deps.phaseToStage(nextPhase),
            market_memo: marketMemo,
            market: {
                ...(state().market ?? deps.defaultMarket()),
                stage_confirmed: cleaned.stage_confirmed ?? state().market?.stage_confirmed ?? state().stage ?? null,
                market_category: cleaned.market_category ?? state().market?.market_category ?? null,
                category_stance: cleaned.category_stance ?? state().market?.category_stance ?? null,
                competitor_map: {
                    direct: cleaned.competitors ?? [],
                    substitutes: cleaned.substitutes ?? [],
                    workflow_competitors: cleaned.workflow_competitors ?? [],
                    attention_competitors: cleaned.attention_competitors ?? [],
                },
                gold_zone_channels: cleaned.gold_zone_channels ?? state().market?.gold_zone_channels ?? [],
                red_ocean: cleaned.red_ocean ?? state().market?.red_ocean ?? [],
                white_space_notes: cleaned.white_space_notes ?? state().market?.white_space_notes ?? (marketMemo.white_space.join(" | ") || null),
                why_now_pressure: cleaned.why_now_pressure ?? state().market?.why_now_pressure ?? null,
                next_research_question: cleaned.next_research_question ?? state().market?.next_research_question ?? null,
                last_updated: deps.now(),
            },
            next_action: nextPhase === "channel"
                ? "Rank channels by speed, trust, repetition, and founder advantage."
                : "Run Founder Edge Audit on candidate channels before entering channel scoring.",
        };
        return deps.emit("vector_market_terrain", {
            title: "Market Terrain Memo",
            summary: "Market terrain has been separated into direct competitors, substitutes, workflow competitors, and attention competitors.",
            decisions: [
                `Direct competitors captured: ${marketMemo.competitors.length}`,
                `Substitutes captured: ${marketMemo.substitutes.length}`,
                `Workflow competitors captured: ${marketMemo.workflow_competitors.length}`,
                `Attention competitors captured: ${marketMemo.attention_competitors.length}`,
                `Category stance: ${cleaned.category_stance ?? "not set"}`,
                `Phase after market mapping: ${nextPhase}`,
            ],
            next_actions: [
                "Use the white-space list to decide which angle the product can own.",
                nextPhase === "channel"
                    ? "Feed the strongest white space into the channel scoring step."
                    : "Run vector_founder_edge_audit on the candidate channels before channel scoring.",
            ],
            state_delta: {
                phase: nextPhase,
                milestone: deps.phaseToMilestone[nextPhase],
                stage: state().stage ?? deps.phaseToStage(nextPhase),
                market_memo: marketMemo,
                market: {
                    stage_confirmed: cleaned.stage_confirmed ?? state().stage ?? null,
                    market_category: cleaned.market_category ?? null,
                    category_stance: cleaned.category_stance ?? null,
                    gold_zone_channels: cleaned.gold_zone_channels ?? [],
                    red_ocean: cleaned.red_ocean ?? [],
                    white_space_notes: cleaned.white_space_notes ?? (marketMemo.white_space.join(" | ") || null),
                    why_now_pressure: cleaned.why_now_pressure ?? null,
                    next_research_question: cleaned.next_research_question ?? null,
                },
            },
            payload: {
                ...marketMemo,
                stage_confirmed: cleaned.stage_confirmed ?? null,
                market_category: cleaned.market_category ?? null,
                category_stance: cleaned.category_stance ?? null,
                gold_zone_channels: cleaned.gold_zone_channels ?? [],
                red_ocean: cleaned.red_ocean ?? [],
                white_space_notes: cleaned.white_space_notes ?? (marketMemo.white_space.join(" | ") || null),
                why_now_pressure: cleaned.why_now_pressure ?? null,
                next_research_question: cleaned.next_research_question ?? null,
                notes: cleaned.notes ?? [],
            },
        }, nextState);
    });
    deps.registerVectorTool("vector_founder_edge_audit", {
        description: "Run Founder Edge Audit for candidate channels before channel scoring.",
        inputSchema: {
            channels: deps.zod.array(deps.zod.string().min(1)).min(1).describe("Channels to audit."),
            assessments: deps.zod.array(deps.zod.object({
                channel: deps.zod.string().min(1),
                network_presence: deps.zod.boolean().optional(),
                track_record: deps.zod.boolean().optional(),
                credibility_recognizable: deps.zod.boolean().optional(),
                speed_advantage: deps.zod.boolean().optional(),
                warm_door_opener: deps.zod.boolean().optional(),
                notes: deps.zod.string().optional(),
            })).optional().describe("Optional per-channel binary assessments. Missing values fall back to prior state or false."),
        },
    }, async ({ channels, assessments }) => {
        deps.ensureToolPhase("vector_founder_edge_audit");
        const cleaned = deps.sanitizeRecursive({ channels, assessments });
        const assessmentLookup = new Map((cleaned.assessments ?? []).map((item) => [item.channel.toLowerCase(), item]));
        let nextAudits = [...state().founder_edge_audit];
        const results = cleaned.channels.map((channel) => {
            const existing = deps.founderEdgeAuditFor(channel);
            const provided = assessmentLookup.get(channel.toLowerCase());
            const entryWithoutScore = {
                channel,
                network_presence: provided?.network_presence ?? existing?.network_presence ?? false,
                track_record: provided?.track_record ?? existing?.track_record ?? false,
                credibility_recognizable: provided?.credibility_recognizable ?? existing?.credibility_recognizable ?? false,
                speed_advantage: provided?.speed_advantage ?? existing?.speed_advantage ?? false,
                warm_door_opener: provided?.warm_door_opener ?? existing?.warm_door_opener ?? false,
                notes: provided?.notes ?? existing?.notes ?? "",
            };
            const parsed = deps.founderEdgeAuditEntrySchema.parse({
                ...entryWithoutScore,
                score: deps.computeFounderEdgeScore(entryWithoutScore),
            });
            nextAudits = deps.upsertFounderEdgeAudit(nextAudits, parsed);
            return parsed;
        });
        const strongest = [...results].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] ?? null;
        const nextPhase = state().phase === "market" ? "channel" : state().phase;
        const nextState = {
            ...state(),
            phase: nextPhase,
            milestone: deps.phaseToMilestone[nextPhase],
            founder_edge_audit: nextAudits,
            next_action: "Run vector_channel_score with the audited channels and stage-weighted scoring.",
        };
        return deps.emit("vector_founder_edge_audit", {
            title: "Founder Edge Audit",
            summary: strongest
                ? `${results.length} channel(s) audited. Strongest measured builder advantage: ${strongest.channel} (${strongest.score}/5).`
                : "No channels were audited.",
            decisions: results.map((item) => `${item.channel}: ${item.score}/5 builder advantage`),
            next_actions: [
                "Use these measured builder-advantage scores before ranking channels.",
                "Re-run the audit whenever a new candidate channel is introduced.",
            ],
            state_delta: {
                phase: nextPhase,
                milestone: deps.phaseToMilestone[nextPhase],
                founder_edge_audit: results,
            },
            payload: { audits: results },
        }, nextState);
    });
    deps.registerVectorTool("vector_channel_score", {
        description: "Score candidate distribution channels and select the best starting motion.",
        inputSchema: {
            channels: deps.zod.array(deps.zod.string().min(1)).min(1).describe("Candidate channels to evaluate."),
            stage_hint: deps.zod.string().optional().describe("Optional stage hint such as prelaunch, live, or post-launch."),
            constraints: deps.zod.array(deps.zod.string()).optional().describe("Optional constraints like time, budget, or audience size."),
        },
    }, async ({ channels, stage_hint, constraints }) => {
        deps.ensureToolPhase("vector_channel_score");
        const cleaned = deps.sanitizeRecursive({ channels, stage_hint, constraints });
        const scored = cleaned.channels.map((channel) => deps.scoreChannel(channel, cleaned.stage_hint, state().research_memo));
        const ranked = [...scored].sort((a, b) => b.score - a.score);
        const selected = ranked[0] ?? null;
        const nextPhase = "thesis";
        const nextState = {
            ...state(),
            phase: nextPhase,
            milestone: deps.phaseToMilestone[nextPhase],
            channel_selected: selected?.channel ?? null,
            channel_scores: ranked,
            next_action: selected ? `Build a thesis around ${selected.channel} before entering the venue gate.` : "No channel selected; return to recovery.",
        };
        return deps.emit("vector_channel_score", {
            title: "Channel Scorecard",
            summary: selected
                ? `The top channel is ${selected.channel} with a score of ${selected.score}/100.`
                : "No channel could be selected from the provided list.",
            decisions: ranked.map((item) => `${item.channel}: ${item.score}/100 — ${item.reason}`),
            next_actions: selected
                ? [
                    `Use ${selected.channel} as the primary motion for the first traction loop.`,
                    `Run the next test: ${selected.next_test}`,
                ]
                : ["Gather more candidate channels and rerun the scorecard."],
            state_delta: {
                phase: nextPhase,
                milestone: deps.phaseToMilestone[nextPhase],
                channel_selected: selected?.channel ?? null,
                channel_scores: ranked,
            },
            payload: { scored: ranked, constraints: cleaned.constraints ?? [], selected },
        }, nextState);
    });
    deps.registerVectorTool("vector_venue_score", {
        description: "Score candidate sales venues and select the best conversion surface.",
        inputSchema: {
            venues: deps.zod.array(deps.zod.string().min(1)).min(1).describe("Candidate venues to evaluate, such as Substack, Ghost, Shopify, or Gumroad."),
            primary_channel: deps.zod.string().optional().describe("Optional primary channel used as context for venue fit."),
            stage_hint: deps.zod.string().optional().describe("Optional stage hint such as prelaunch or live."),
            constraints: deps.zod.array(deps.zod.string()).optional().describe("Optional venue constraints like checkout, ownership, or speed."),
        },
    }, async ({ venues, primary_channel, stage_hint, constraints }) => {
        deps.ensureToolPhase("vector_venue_score");
        const cleaned = deps.sanitizeRecursive({ venues, primary_channel, stage_hint, constraints });
        const scored = cleaned.venues.map((venue) => deps.scoreVenue(venue, cleaned.primary_channel, cleaned.stage_hint, state().research_memo));
        const ranked = [...scored].sort((a, b) => b.score - a.score);
        const selected = ranked[0] ?? null;
        const nextState = {
            ...state(),
            venue_selected: selected?.venue ?? state().venue_selected,
            distribution: {
                ...(state().distribution ?? deps.defaultDistribution()),
                venue_selected: selected?.venue ?? state().distribution?.venue_selected ?? null,
                alternatives: ranked.map((item) => item.venue),
            },
            next_action: selected ? `Use ${selected.venue} as the primary sales venue and validate trust before launch.` : state().next_action,
            session: {
                ...(state().session ?? deps.defaultSession()),
                kb_synced: false,
                last_sync: null,
                schema_version: deps.getCurrentVersion(),
            },
        };
        return deps.emit("vector_venue_score", {
            title: "Venue Scorecard",
            summary: selected
                ? `The top venue is ${selected.venue} with a score of ${selected.score}/100.`
                : "No venue could be selected from the provided list.",
            decisions: ranked.map((item) => `${item.venue}: ${item.score}/100 — ${item.reason}`),
            next_actions: selected
                ? [
                    `Use ${selected.venue} as the conversion surface.`,
                    `Run the next test: ${selected.next_test}`,
                ]
                : ["Gather more venue candidates and rerun the scorecard."],
            state_delta: {
                venue_selected: selected?.venue ?? null,
                distribution: {
                    venue_selected: selected?.venue ?? null,
                    alternatives: ranked.map((item) => item.venue),
                },
            },
            payload: { scored: ranked, selected, constraints: cleaned.constraints ?? [], primary_channel: cleaned.primary_channel ?? null },
        }, nextState);
    });
    deps.registerVectorTool("vector_route_context", {
        description: "Set routing metadata such as persona, mode, platform, and intent without changing phase.",
        inputSchema: {
            persona: deps.personaSchema.describe("Routing persona.").optional(),
            mode: deps.modeSchema.optional().describe("Routing mode."),
            platform: deps.zod.string().optional().describe("Platform name."),
            intent: deps.zod.string().optional().describe("User intent or task intent."),
            reason: deps.zod.string().optional().describe("Why this route was chosen."),
        },
    }, async ({ persona, mode, platform, intent, reason }) => {
        const cleaned = deps.sanitizeRecursive({ persona, mode, platform, intent, reason });
        const nextState = {
            ...state(),
            routing: {
                ...(state().routing ?? deps.defaultRouting(state().phase)),
                persona: cleaned.persona ?? state().routing?.persona ?? "unknown",
                mode: cleaned.mode ?? state().routing?.mode ?? deps.inferModeForPhase(state().phase),
                platform: cleaned.platform ?? state().routing?.platform ?? null,
                intent: cleaned.intent ?? state().routing?.intent ?? null,
                last_router_reason: cleaned.reason ?? state().routing?.last_router_reason ?? null,
            },
            session: {
                ...(state().session ?? deps.defaultSession()),
                kb_synced: false,
                last_sync: null,
                schema_version: deps.getCurrentVersion(),
            },
        };
        return deps.emit("vector_route_context", {
            title: "Routing Context",
            summary: `Routing metadata has been updated to ${cleaned.mode ?? deps.inferModeForPhase(state().phase)}.`,
            decisions: [
                `Persona: ${cleaned.persona ?? state().routing?.persona ?? "unknown"}`,
                `Mode: ${cleaned.mode ?? state().routing?.mode ?? deps.inferModeForPhase(state().phase)}`,
                `Intent: ${cleaned.intent ?? state().routing?.intent ?? "not set"}`,
            ],
            next_actions: ["Keep the routing context aligned with the current task.", "Sync KB after the next stable decision."],
            state_delta: { routing: nextState.routing },
            payload: nextState.routing,
        }, nextState);
    });
    deps.registerVectorTool("vector_strategy_map", {
        description: "Render a lightweight Mermaid strategy map from the current VECTOR state.",
        inputSchema: {
            title: deps.zod.string().optional().describe("Optional title for the map."),
        },
    }, async ({ title }) => {
        const map = deps.renderStrategyMap(state());
        const nextState = {
            ...state(),
            artifact_registry: {
                ...(state().artifact_registry ?? deps.defaultArtifactRegistry()),
                strategy_map: {
                    title: title ?? "Strategy Map",
                    summary: "Mermaid strategy map rendered from the current state.",
                    artifact_type: "strategy_map",
                    phase: state().phase,
                    updated_at: deps.now(),
                    version: deps.getCurrentVersion(),
                },
            },
        };
        return deps.emit("vector_strategy_map", {
            title: title ?? "Strategy Map",
            summary: "A Mermaid strategy map has been rendered from the current state.",
            decisions: [
                `Phase: ${state().phase}`,
                `Channel: ${state().channel_selected ?? state().thesis_card?.primary_channel ?? "not set"}`,
                `Venue: ${state().venue_selected ?? state().venue_card?.sales_venue ?? "not set"}`,
            ],
            next_actions: ["Paste the Mermaid block into a renderer.", "Use the map as a visual check on the strategy chain."],
            state_delta: { mermaid: map },
            payload: { mermaid: map },
        }, nextState);
    });
    deps.registerVectorTool("vector_sync_kb", {
        description: "Mark the current runtime state as synchronized back to the knowledge base.",
        inputSchema: {
            note: deps.zod.string().optional().describe("Optional sync note."),
        },
    }, async ({ note }) => {
        const cleaned = deps.sanitizeRecursive({ note });
        if (deps.runtime().readKbContent) {
            try {
                const kbData = await deps.runtime().readKbContent();
                if (kbData) {
                    const phaseMatch = kbData.match(/phase:\s*([a-z_]+)/i);
                    if (phaseMatch && phaseMatch[1]) {
                        const kbPhase = phaseMatch[1].trim().toLowerCase();
                        if (kbPhase !== state().phase) {
                            throw new Error(`State Drift Detected [ADR-002]: KNOWLEDGE_BASE.md indicates phase '${kbPhase}', but MCP Server is in phase '${state().phase}'. Please use the appropriate vector_* tools to advance the state, instead of modifying the Markdown file manually.`);
                        }
                    }
                }
            }
            catch (e) {
                if (e instanceof Error && e.message.includes("State Drift Detected")) {
                    throw e;
                }
            }
        }
        const nextState = {
            ...state(),
            session: {
                ...(state().session ?? deps.defaultSession()),
                kb_synced: true,
                last_sync: deps.now(),
                confidence_delta: state().session?.confidence_delta ?? null,
                schema_version: deps.getCurrentVersion(),
            },
            artifact_registry: {
                ...(state().artifact_registry ?? deps.defaultArtifactRegistry()),
                decision_memo: {
                    title: "KB Sync",
                    summary: cleaned.note ?? "State synchronized back to the knowledge base.",
                    artifact_type: "decision_memo",
                    phase: state().phase,
                    updated_at: deps.now(),
                    version: deps.getCurrentVersion(),
                },
            },
        };
        return deps.emit("vector_sync_kb", {
            title: "KB Sync",
            summary: cleaned.note ?? "State synchronized back to the knowledge base.",
            decisions: ["session.kb_synced set to true", `Last sync: ${nextState.session.last_sync}`],
            next_actions: ["Continue from the synced snapshot.", "Re-run sync after the next major decision."],
            state_delta: { session: nextState.session },
            payload: { note: cleaned.note ?? null },
        }, nextState);
    });
    deps.registerVectorTool("vector_thesis", {
        description: "Commit the chosen channel into a thesis card with evidence, reversibility, and unlock conditions.",
        inputSchema: {
            product: deps.zod.string().optional().describe("Optional product name or shorthand."),
            primary_channel: deps.zod.string().describe("The selected primary channel."),
            why_this_channel: deps.zod.string().describe("Why this channel is the right bet now."),
            angle: deps.zod.string().describe("The primary angle or message frame."),
            unfair_advantage: deps.zod.string().optional().describe("Why the founder has an edge here."),
            growth_multiplier: deps.zod.string().describe("Why this thesis could compound after validation."),
            unlock_condition: deps.zod.string().describe("What must be true before the multiplier opens."),
            reversibility: deps.zod.string().optional().describe("How the thesis can be reversed if signal fails."),
            evidence_used: deps.zod.array(deps.zod.string()).optional().describe("Evidence that justifies the thesis."),
            alternatives_rejected: deps.zod.array(deps.zod.string()).optional().describe("Alternatives that were explicitly rejected."),
            confidence: deps.zod.number().min(0).max(1).optional().describe("Confidence in the thesis."),
        },
    }, async (args) => {
        deps.ensureToolPhase("vector_thesis");
        const cleaned = deps.sanitizeRecursive(args);
        const thesis_card = {
            product: cleaned.product ?? state().product_description ?? "",
            primary_channel: cleaned.primary_channel,
            why_this_channel: cleaned.why_this_channel,
            angle: cleaned.angle,
            unfair_advantage: cleaned.unfair_advantage ?? "",
            growth_multiplier: cleaned.growth_multiplier,
            unlock_condition: cleaned.unlock_condition,
            reversibility: cleaned.reversibility ?? "",
            evidence_used: cleaned.evidence_used ?? [],
            alternatives_rejected: cleaned.alternatives_rejected ?? [],
            confidence: cleaned.confidence ?? 0.5,
        };
        const nextPhase = "venue";
        const nextState = {
            ...state(),
            phase: nextPhase,
            milestone: deps.phaseToMilestone[nextPhase],
            channel_selected: thesis_card.primary_channel,
            thesis_card,
            venue_selected: null,
            venue_card: null,
            sales_copy: null,
            copy_review: null,
            next_action: "Run the venue gate separately. Do not move to signal or copy until the venue card is complete.",
        };
        return deps.emit("vector_thesis", {
            title: "Thesis Card",
            summary: `The thesis is now committed around ${thesis_card.primary_channel}.`,
            decisions: [
                `Primary channel: ${thesis_card.primary_channel}`,
                `Growth multiplier: ${thesis_card.growth_multiplier}`,
                `Unlock condition: ${thesis_card.unlock_condition}`,
            ],
            next_actions: [
                "Use the separate venue gate to define where money changes hands.",
                "Do not move to signal or copy until the venue card is complete.",
            ],
            state_delta: {
                phase: nextPhase,
                milestone: deps.phaseToMilestone[nextPhase],
                channel_selected: thesis_card.primary_channel,
                thesis_card,
            },
            payload: thesis_card,
        }, nextState);
    });
    deps.registerVectorTool("vector_venue", {
        description: "Define the separate venue gate: where the offer converts and how the product is packaged.",
        inputSchema: {
            sales_venue: deps.zod.string().describe("Where the offer should convert."),
            entry_offer: deps.zod.string().describe("Low-friction entry offer."),
            core_offer: deps.zod.string().describe("Core offer or product."),
            upsell_offer: deps.zod.string().optional().describe("Upsell or expansion offer."),
            trust_signal_needed: deps.zod.string().describe("The trust signal required before launch."),
            venue_risk: deps.zod.string().describe("The main structural risk of the venue."),
            icp_drift_check: deps.zod.string().describe("How to check whether the ICP still matches."),
            primary_cta: deps.zod.string().optional().describe("Primary conversion CTA."),
        },
    }, async (args) => {
        deps.ensureToolPhase("vector_venue");
        if (!state().thesis_card) {
            throw new Error("Venue gate requires an existing thesis card. Run vector_thesis first.");
        }
        const cleaned = deps.sanitizeRecursive(args);
        const venue_card = {
            sales_venue: cleaned.sales_venue,
            entry_offer: cleaned.entry_offer,
            core_offer: cleaned.core_offer,
            upsell_offer: cleaned.upsell_offer ?? "",
            trust_signal_needed: cleaned.trust_signal_needed,
            venue_risk: cleaned.venue_risk,
            icp_drift_check: cleaned.icp_drift_check,
            primary_cta: cleaned.primary_cta ?? "",
        };
        const nextPhase = "signal";
        const nextState = {
            ...state(),
            phase: nextPhase,
            milestone: deps.phaseToMilestone[nextPhase],
            venue_selected: venue_card.sales_venue,
            venue_card,
            sales_copy: null,
            copy_review: null,
            next_action: "Review real-world signal against the thesis and package the winning angle into sales copy.",
        };
        return deps.emit("vector_venue", {
            title: "Venue Card",
            summary: `The venue gate is now explicit: ${venue_card.sales_venue}.`,
            decisions: [
                `Sales venue: ${venue_card.sales_venue}`,
                `Trust signal needed: ${venue_card.trust_signal_needed}`,
                `Venue risk: ${venue_card.venue_risk}`,
            ],
            next_actions: [
                "Validate that the trust signal exists before launch.",
                "Move into signal review only after the thesis and venue are both documented.",
            ],
            state_delta: {
                phase: nextPhase,
                milestone: deps.phaseToMilestone[nextPhase],
                venue_selected: venue_card.sales_venue,
                venue_card,
            },
            payload: venue_card,
        }, nextState);
    });
    deps.registerVectorTool("vector_signal_review", {
        description: "Review live signal, classify it into green/yellow/red, and decide the next move.",
        inputSchema: {
            green: deps.zod.array(deps.zod.string()).optional().default([]).describe("Positive signals observed."),
            yellow: deps.zod.array(deps.zod.string()).optional().default([]).describe("Ambiguous signals observed."),
            red: deps.zod.array(deps.zod.string()).optional().default([]).describe("Negative signals observed."),
            sample_size: deps.zod.number().int().nonnegative().optional().describe("How many observations were reviewed."),
            notes: deps.zod.array(deps.zod.string()).optional().describe("Analyst notes."),
        },
    }, async ({ green, yellow, red, sample_size, notes }) => {
        deps.ensureToolPhase("vector_signal_review");
        const cleaned = deps.sanitizeRecursive({ green, yellow, red, sample_size, notes });
        const positives = (cleaned.green ?? []).map((item) => deps.signalItem(item, "review", 0.8, "green"));
        const ambers = (cleaned.yellow ?? []).map((item) => deps.signalItem(item, "review", 0.6, "yellow"));
        const negatives = (cleaned.red ?? []).map((item) => deps.signalItem(item, "review", 0.3, "red"));
        const redCount = negatives.length;
        const greenCount = positives.length;
        const nextPhase = redCount > greenCount ? "recovery" : "signal";
        const ledgerEntry = {
            when: deps.now(),
            action: "signal_review",
            note: cleaned.notes?.join(" | ") ?? "",
            phase: state().phase,
            milestone: deps.phaseToMilestone[nextPhase],
            channel: state().channel_selected ?? state().thesis_card?.primary_channel ?? "",
            venue: state().venue_selected ?? state().venue_card?.sales_venue ?? "",
            sample_size: cleaned.sample_size ?? (positives.length + ambers.length + negatives.length),
            green_count: positives.length,
            yellow_count: ambers.length,
            red_count: negatives.length,
            drift_status: redCount > greenCount ? "observed" : state().risk.drift_status,
            decision_impact: redCount > greenCount ? "recovery_recommended" : "continue_signal_loop",
            next_action: redCount > greenCount
                ? "Inspect the weakest assumption before another scaling attempt."
                : "Continue signal collection and tighten the winning pattern.",
        };
        deps.experimentEntrySchema.parse(ledgerEntry);
        const nextState = {
            ...state(),
            phase: nextPhase,
            milestone: deps.phaseToMilestone[nextPhase],
            signals: {
                green: [...state().signals.green, ...positives].slice(-100),
                yellow: [...state().signals.yellow, ...ambers].slice(-100),
                red: [...state().signals.red, ...negatives].slice(-100),
            },
            icp_drift: redCount > greenCount ? "observed" : state().icp_drift,
            trauma_log: redCount > greenCount
                ? [
                    ...state().trauma_log,
                    {
                        when: deps.now(),
                        what: "Signal review detected more negative than positive evidence.",
                        why_failed: "Recovery route recommended because the current thesis is underperforming.",
                        phase: state().phase,
                    },
                ].slice(-50)
                : state().trauma_log,
            experiment_ledger: {
                ...(state().experiment_ledger ?? { active: [], archived: [] }),
                active: [...(state().experiment_ledger?.active ?? []), ledgerEntry].slice(-100),
                archived: state().experiment_ledger?.archived ?? [],
            },
            next_action: redCount > greenCount
                ? "Route into recovery: inspect ICP, channel fit, and venue friction before another scaling attempt."
                : "Continue signal collection and tighten the winning pattern.",
        };
        return deps.emit("vector_signal_review", {
            title: "Signal Review Memo",
            summary: redCount > greenCount
                ? "The signal distribution is weak enough to justify a recovery step."
                : "The signal distribution is net positive; continue tightening the motion.",
            decisions: [
                `Sample size: ${cleaned.sample_size ?? (positives.length + ambers.length + negatives.length)}`,
                `Green: ${positives.length}`,
                `Yellow: ${ambers.length}`,
                `Red: ${negatives.length}`,
                `Next phase: ${nextPhase}`,
            ],
            next_actions: redCount > greenCount
                ? [
                    "Return to recovery and inspect the weakest assumption first.",
                    "Do not scale the motion before the recovery loop produces a stronger signal.",
                ]
                : [
                    "Double down on the strongest conversion path.",
                    "Preserve the winning message and keep collecting evidence.",
                ],
            state_delta: {
                phase: nextPhase,
                milestone: deps.phaseToMilestone[nextPhase],
                icp_drift: redCount > greenCount ? "observed" : state().icp_drift,
                experiment_ledger_added: ledgerEntry,
                signals_added: {
                    green: positives.length,
                    yellow: ambers.length,
                    red: negatives.length,
                },
            },
            payload: { green: positives, yellow: ambers, red: negatives, notes: cleaned.notes ?? [] },
        }, nextState);
    });
}
