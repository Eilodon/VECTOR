export function registerCopyTools(deps) {
    const state = () => deps.getState();
    deps.registerVectorTool("vector_sales_copy", {
        description: "Package the validated thesis into launch-ready sales copy, DM copy, or landing copy.",
        inputSchema: {
            desired_conversion_step: deps.zod.string().optional().describe("Primary conversion step the copy should drive."),
            angle: deps.zod.string().describe("The core sales angle."),
            headline: deps.zod.string().describe("Primary headline."),
            subheadline: deps.zod.string().describe("Supporting subheadline."),
            body: deps.zod.string().describe("Main sales body."),
            cta: deps.zod.string().describe("Primary call to action."),
            objections: deps.zod.array(deps.zod.string()).optional().describe("Likely objections to answer."),
            followup_ladder: deps.zod.array(deps.zod.string()).optional().describe("Follow-up sequence or ladder."),
        },
    }, async ({ desired_conversion_step, angle, headline, subheadline, body, cta, objections, followup_ladder }) => {
        deps.ensureToolPhase("vector_sales_copy");
        if (!state().thesis_card || !state().venue_card) {
            throw new Error("Sales copy requires both thesis_card and venue_card. Lock the venue gate first.");
        }
        if (!state().icp.forces.anxiety?.trim() || !state().icp.forces.habit?.trim()) {
            throw new Error("Sales copy requires ICP 4 Forces, especially anxiety and habit, before running objection protocol.");
        }
        const cleaned = deps.sanitizeRecursive({ desired_conversion_step, angle, headline, subheadline, body, cta, objections, followup_ladder });
        const { sales_copy, objection_map } = deps.buildSalesCopyPack(state(), cleaned);
        const nextState = {
            ...state(),
            sales_copy,
            objection_map,
            copy_review: null,
            next_action: "Run vector_copy_review before shipping or rendering assets from this copy pack.",
        };
        return deps.emit("vector_sales_copy", {
            title: "Sales Copy Pack",
            summary: "The validated thesis has been packaged into a usable sales copy artifact.",
            decisions: [
                `Angle: ${sales_copy.angle}`,
                `CTA: ${sales_copy.cta}`,
                `Objections covered: ${sales_copy.objections.length}`,
                `Primary objection: ${objection_map.primary_objection}`,
            ],
            next_actions: [
                "Run vector_copy_review before shipping this copy.",
                "Only render or deploy assets after copy_review returns ship_ready=true.",
            ],
            state_delta: { sales_copy, objection_map, copy_review: null },
            payload: sales_copy,
        }, nextState);
    });
    deps.registerVectorTool("vector_copy_review", {
        description: "Review the current sales copy against thesis, objection, trust, and venue fit before shipping.",
        inputSchema: {},
    }, async () => {
        deps.ensureToolPhase("vector_copy_review");
        if (!state().sales_copy) {
            throw new Error("Copy review requires an existing sales_copy artifact. Run vector_sales_copy first.");
        }
        const copy_review = deps.reviewSalesCopyPack(state(), deps.now());
        const nextState = {
            ...state(),
            copy_review,
            next_action: copy_review.ship_ready
                ? `Ship ${copy_review.first_test_variant} first and collect signal in the selected venue.`
                : copy_review.recommendations[0] ?? "Revise the copy pack before shipping.",
        };
        return deps.emit("vector_copy_review", {
            title: "Copy Review",
            summary: copy_review.ship_ready
                ? `Copy is ship-ready with score ${copy_review.overall_score}/100.`
                : `Copy review found quality gaps with score ${copy_review.overall_score}/100.`,
            decisions: [
                `Ship ready: ${copy_review.ship_ready}`,
                `First test variant: ${copy_review.first_test_variant}`,
                `Failed checks: ${copy_review.failed_checks.length}`,
            ],
            next_actions: copy_review.recommendations,
            state_delta: { copy_review },
            payload: copy_review,
        }, nextState);
    });
    deps.registerVectorTool("vector_render_media", {
        description: "Return a structured media spec that downstream renderers can consume.",
        inputSchema: deps.mediaSpecShape,
    }, async (args) => {
        deps.ensureToolPhase("vector_render_media");
        const cleaned = deps.sanitizeRecursive(args);
        const review = deps.requireShipReadyCopyReview();
        return {
            content: [{
                    type: "text",
                    text: deps.artifactToText({
                        title: "Media Spec",
                        summary: `A structured spec for ${cleaned.artifact_type} has been prepared for downstream rendering.`,
                        decisions: [
                            `Artifact type: ${cleaned.artifact_type}`,
                            `Copy review score: ${review.overall_score}/100`,
                            `Approved first variant: ${review.first_test_variant}`,
                            `Style keys: ${Object.keys(cleaned.style_spec ?? {}).join(", ") || "none"}`,
                        ],
                        next_actions: ["Pass this spec to a dedicated image/video renderer.", "Keep the output as a design contract rather than a final asset."],
                        state_delta: { media_spec: cleaned },
                        payload: cleaned,
                    }),
                }],
        };
    });
}
