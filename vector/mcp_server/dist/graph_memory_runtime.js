export const MAX_GRAPH_PROVENANCE_ENTRIES = 25;
export function slugify(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80) || "unknown";
}
function timestamp(now) {
    return now ?? new Date().toISOString();
}
function mergeUniqueStrings(...collections) {
    return [...new Set(collections.flatMap((items) => items ?? [])
            .map((item) => item.trim())
            .filter((item) => Boolean(item)))];
}
function provenanceFingerprint(entry) {
    const evidenceIds = Array.isArray(entry.evidence_ids)
        ? [...entry.evidence_ids].map((item) => String(item)).sort()
        : [];
    const providerRunIds = Array.isArray(entry.provider_run_ids)
        ? [...entry.provider_run_ids].map((item) => String(item)).sort()
        : [];
    return JSON.stringify({
        source_kind: entry.source_kind ?? null,
        source_ref: entry.source_ref ?? null,
        phase: entry.phase ?? null,
        recorded_at: entry.recorded_at ?? null,
        evidence_ids: evidenceIds,
        provider_run_ids: providerRunIds,
    });
}
function mergeBoundedProvenance(existing, incoming, maxEntries = MAX_GRAPH_PROVENANCE_ENTRIES) {
    const merged = new Map();
    for (const entry of [...existing, ...incoming]) {
        merged.set(provenanceFingerprint(entry), entry);
    }
    return [...merged.values()].slice(-maxEntries);
}
function upsertGraphNode(graph, node, now) {
    const recordedAt = timestamp(now);
    const existingIndex = graph.nodes.findIndex((item) => item.id === node.id);
    if (existingIndex === -1) {
        graph.nodes.push({
            ...node,
            first_seen_at: recordedAt,
            last_seen_at: recordedAt,
        });
        return;
    }
    const existing = graph.nodes[existingIndex];
    if (!existing)
        return;
    graph.nodes[existingIndex] = {
        ...existing,
        ...node,
        provenance: mergeBoundedProvenance(existing.provenance, node.provenance),
        first_seen_at: existing.first_seen_at,
        last_seen_at: recordedAt,
    };
}
function upsertGraphEdge(graph, edge, now) {
    const recordedAt = timestamp(now);
    const existingIndex = graph.edges.findIndex((item) => item.id === edge.id);
    if (existingIndex === -1) {
        graph.edges.push({
            ...edge,
            first_seen_at: recordedAt,
            last_seen_at: recordedAt,
        });
        return;
    }
    const existing = graph.edges[existingIndex];
    if (!existing)
        return;
    graph.edges[existingIndex] = {
        ...existing,
        ...edge,
        provenance: mergeBoundedProvenance(existing.provenance, edge.provenance),
        first_seen_at: existing.first_seen_at,
        last_seen_at: recordedAt,
    };
}
function providerRunIdsForEvidenceIds(researchMemo, evidenceIds) {
    const lookup = new Set(evidenceIds);
    const ids = (researchMemo?.evidence_table ?? [])
        .filter((item) => lookup.has(item.id) && typeof item.provider_run_id === "string" && item.provider_run_id.trim())
        .map((item) => item.provider_run_id);
    return [...new Set(ids)];
}
function evidenceIdsForKinds(researchMemo, kinds) {
    return (researchMemo?.evidence_table ?? [])
        .filter((item) => kinds.includes(item.kind))
        .map((item) => item.id);
}
function snapshotProvenance(state, now, evidenceIds = [], providerRunIds = []) {
    return {
        source_kind: evidenceIds.length || providerRunIds.length ? "captured_evidence" : "snapshot_state",
        source_ref: `vector_state.json@${state.updated_at}`,
        phase: state.phase,
        recorded_at: timestamp(now),
        evidence_ids: [...new Set(evidenceIds)],
        provider_run_ids: [...new Set(providerRunIds)],
    };
}
export function syncGraphFromState(state, graphMemory, action, now) {
    const recordedAt = timestamp(now);
    const graph = {
        ...graphMemory,
        nodes: [...graphMemory.nodes],
        edges: [...graphMemory.edges],
        sync_history: [...graphMemory.sync_history],
    };
    const channelEvidenceIds = state.research_memo?.channel_observations.flatMap((item) => item.evidence_ids) ?? [];
    const venueEvidenceIds = state.research_memo?.venue_observations.flatMap((item) => item.evidence_ids) ?? [];
    const allTrustEvidenceIds = evidenceIdsForKinds(state.research_memo, ["trust_signal"]);
    const providerRunIds = providerRunIdsForEvidenceIds(state.research_memo, [
        ...channelEvidenceIds,
        ...venueEvidenceIds,
        ...allTrustEvidenceIds,
    ]);
    const icpLabel = state.target_user ?? state.icp?.who ?? state.icp_hypothesis ?? "Unknown ICP";
    const icpNodeId = `icp:${slugify(icpLabel)}`;
    upsertGraphNode(graph, {
        id: icpNodeId,
        entity_type: "icp_entity",
        label: icpLabel,
        summary: state.job_statement ?? state.icp?.problem ?? "",
        attributes: {
            hypothesis: state.icp_hypothesis,
            problem: state.job_statement ?? state.icp?.problem ?? null,
            drift_status: state.icp?.drift_status,
        },
        provenance: [snapshotProvenance(state, recordedAt, state.icp?.evidence ?? [], providerRunIds)],
    }, recordedAt);
    for (const competitor of state.market_memo?.competitors ?? []) {
        const nodeId = `competitor:${slugify(competitor)}`;
        const evidenceIds = evidenceIdsForKinds(state.research_memo, ["competitor"]);
        upsertGraphNode(graph, {
            id: nodeId,
            entity_type: "competitor_entity",
            label: competitor,
            summary: "Direct market competitor captured from market terrain or research memo.",
            attributes: { classification: "competitor" },
            provenance: [snapshotProvenance(state, recordedAt, evidenceIds, providerRunIdsForEvidenceIds(state.research_memo, evidenceIds))],
        }, recordedAt);
        upsertGraphEdge(graph, {
            id: `edge:${nodeId}:competes_for_attention:${icpNodeId}`,
            edge_type: "competes_for_attention",
            from: nodeId,
            to: icpNodeId,
            label: "Competes for ICP demand",
            attributes: { classification: "competitor" },
            provenance: [snapshotProvenance(state, recordedAt, evidenceIds, providerRunIdsForEvidenceIds(state.research_memo, evidenceIds))],
        }, recordedAt);
    }
    for (const substitute of state.market_memo?.substitutes ?? []) {
        const nodeId = `substitute:${slugify(substitute)}`;
        const evidenceIds = evidenceIdsForKinds(state.research_memo, ["substitute"]);
        upsertGraphNode(graph, {
            id: nodeId,
            entity_type: "substitute_entity",
            label: substitute,
            summary: "Substitute or workaround stored for longitudinal market memory.",
            attributes: { classification: "substitute" },
            provenance: [snapshotProvenance(state, recordedAt, evidenceIds, providerRunIdsForEvidenceIds(state.research_memo, evidenceIds))],
        }, recordedAt);
        upsertGraphEdge(graph, {
            id: `edge:${nodeId}:replaces_workflow:${icpNodeId}`,
            edge_type: "replaces_workflow",
            from: nodeId,
            to: icpNodeId,
            label: "Acts as substitute for the ICP workflow",
            attributes: {},
            provenance: [snapshotProvenance(state, recordedAt, evidenceIds, providerRunIdsForEvidenceIds(state.research_memo, evidenceIds))],
        }, recordedAt);
    }
    const channelNames = [...new Set([
            ...(state.channel_scores ?? []).map((item) => item.channel),
            ...(state.channel_selected ? [state.channel_selected] : []),
        ])];
    for (const channel of channelNames) {
        const observation = state.research_memo?.channel_observations.find((item) => item.channel.toLowerCase() === channel.toLowerCase());
        const evidenceIds = observation?.evidence_ids ?? [];
        const nodeId = `channel:${slugify(channel)}`;
        upsertGraphNode(graph, {
            id: nodeId,
            entity_type: "channel_entity",
            label: channel,
            summary: `Channel memory for ${channel}.`,
            attributes: {
                selected: state.channel_selected === channel,
                score: (state.channel_scores ?? []).find((item) => item.channel === channel)?.score ?? null,
            },
            provenance: [snapshotProvenance(state, recordedAt, evidenceIds, providerRunIdsForEvidenceIds(state.research_memo, evidenceIds))],
        }, recordedAt);
        upsertGraphEdge(graph, {
            id: `edge:${icpNodeId}:targets_channel:${nodeId}`,
            edge_type: "targets_channel",
            from: icpNodeId,
            to: nodeId,
            label: "ICP is routed into this channel",
            attributes: { selected: state.channel_selected === channel },
            provenance: [snapshotProvenance(state, recordedAt, evidenceIds, providerRunIdsForEvidenceIds(state.research_memo, evidenceIds))],
        }, recordedAt);
    }
    const venueNames = [...new Set([
            ...(state.venue_selected ? [state.venue_selected] : []),
            ...(state.venue_card?.sales_venue ? [state.venue_card.sales_venue] : []),
        ])];
    for (const venue of venueNames) {
        const observation = state.research_memo?.venue_observations.find((item) => item.venue.toLowerCase() === venue.toLowerCase());
        const evidenceIds = observation?.evidence_ids ?? [];
        const nodeId = `venue:${slugify(venue)}`;
        upsertGraphNode(graph, {
            id: nodeId,
            entity_type: "venue_entity",
            label: venue,
            summary: `Venue memory for ${venue}.`,
            attributes: {
                selected: state.venue_selected === venue,
                trust_signal_needed: state.venue_card?.sales_venue === venue ? state.venue_card?.trust_signal_needed : null,
            },
            provenance: [snapshotProvenance(state, recordedAt, evidenceIds, providerRunIdsForEvidenceIds(state.research_memo, evidenceIds))],
        }, recordedAt);
        if (state.channel_selected) {
            const channelNodeId = `channel:${slugify(state.channel_selected)}`;
            upsertGraphEdge(graph, {
                id: `edge:${channelNodeId}:converts_at:${nodeId}`,
                edge_type: "converts_at",
                from: channelNodeId,
                to: nodeId,
                label: "Selected channel converts through venue",
                attributes: { selected: state.venue_selected === venue },
                provenance: [snapshotProvenance(state, recordedAt, evidenceIds, providerRunIdsForEvidenceIds(state.research_memo, evidenceIds))],
            }, recordedAt);
        }
    }
    if (state.thesis_card) {
        const thesisId = `thesis_revision:${slugify(state.updated_at)}`;
        const evidenceIds = state.thesis_card.evidence_used ?? [];
        upsertGraphNode(graph, {
            id: thesisId,
            entity_type: "thesis_revision",
            label: `${state.thesis_card.primary_channel} thesis @ ${state.updated_at}`,
            summary: state.thesis_card.angle,
            attributes: {
                primary_channel: state.thesis_card.primary_channel,
                growth_multiplier: state.thesis_card.growth_multiplier,
                unlock_condition: state.thesis_card.unlock_condition,
            },
            provenance: [snapshotProvenance(state, recordedAt, evidenceIds, providerRunIdsForEvidenceIds(state.research_memo, evidenceIds))],
        }, recordedAt);
        const channelNodeId = `channel:${slugify(state.thesis_card.primary_channel)}`;
        upsertGraphEdge(graph, {
            id: `edge:${thesisId}:records_revision:${channelNodeId}`,
            edge_type: "records_revision",
            from: thesisId,
            to: channelNodeId,
            label: "Thesis revision records chosen channel",
            attributes: {},
            provenance: [snapshotProvenance(state, recordedAt, evidenceIds, providerRunIdsForEvidenceIds(state.research_memo, evidenceIds))],
        }, recordedAt);
    }
    const trustSignals = mergeUniqueStrings(state.research_memo?.trust_signals, state.venue_card?.trust_signal_needed ? [state.venue_card.trust_signal_needed] : []);
    const trustEvidenceIds = evidenceIdsForKinds(state.research_memo, ["trust_signal"]);
    for (const trustSignal of trustSignals) {
        const trustNodeId = `trust_signal:${slugify(trustSignal)}`;
        upsertGraphNode(graph, {
            id: trustNodeId,
            entity_type: "trust_signal_expectation",
            label: trustSignal,
            summary: "Expected trust artifact or proof requirement.",
            attributes: {},
            provenance: [snapshotProvenance(state, recordedAt, trustEvidenceIds, providerRunIdsForEvidenceIds(state.research_memo, trustEvidenceIds))],
        }, recordedAt);
        if (state.venue_selected) {
            const venueNodeId = `venue:${slugify(state.venue_selected)}`;
            upsertGraphEdge(graph, {
                id: `edge:${venueNodeId}:expects_trust_signal:${trustNodeId}`,
                edge_type: "expects_trust_signal",
                from: venueNodeId,
                to: trustNodeId,
                label: "Venue expects this trust signal",
                attributes: {},
                provenance: [snapshotProvenance(state, recordedAt, trustEvidenceIds, providerRunIdsForEvidenceIds(state.research_memo, trustEvidenceIds))],
            }, recordedAt);
        }
    }
    for (const signal of [...(state.signals?.green ?? []), ...(state.signals?.yellow ?? []), ...(state.signals?.red ?? [])]) {
        const nodeId = `signal:${signal.id}`;
        upsertGraphNode(graph, {
            id: nodeId,
            entity_type: "signal_observation",
            label: signal.label,
            summary: signal.notes,
            attributes: {
                confidence: signal.confidence,
                source: signal.source,
            },
            provenance: [snapshotProvenance(state, recordedAt, [], [])],
        }, recordedAt);
        if (state.thesis_card) {
            const thesisId = `thesis_revision:${slugify(state.updated_at)}`;
            upsertGraphEdge(graph, {
                id: `edge:${thesisId}:observed_in_signal:${nodeId}`,
                edge_type: "observed_in_signal",
                from: thesisId,
                to: nodeId,
                label: "Signal observed against thesis revision",
                attributes: {},
                provenance: [snapshotProvenance(state, recordedAt, [], [])],
            }, recordedAt);
        }
    }
    for (const experiment of [
        ...(state.experiment_ledger?.active ?? []),
        ...(state.experiment_ledger?.archived ?? []),
    ]) {
        const nodeId = `experiment:${slugify(`${experiment.when}:${experiment.action}:${experiment.channel}:${experiment.venue}`)}`;
        upsertGraphNode(graph, {
            id: nodeId,
            entity_type: "experiment",
            label: experiment.action,
            summary: experiment.note,
            attributes: {
                channel: experiment.channel,
                venue: experiment.venue,
                sample_size: experiment.sample_size,
                decision_impact: experiment.decision_impact,
            },
            provenance: [snapshotProvenance(state, recordedAt, [], [])],
        }, recordedAt);
        if (experiment.channel) {
            upsertGraphEdge(graph, {
                id: `edge:${nodeId}:tested_in_experiment:channel:${slugify(experiment.channel)}`,
                edge_type: "tested_in_experiment",
                from: nodeId,
                to: `channel:${slugify(experiment.channel)}`,
                label: "Experiment tested this channel",
                attributes: {},
                provenance: [snapshotProvenance(state, recordedAt, [], [])],
            }, recordedAt);
        }
        if (experiment.venue) {
            upsertGraphEdge(graph, {
                id: `edge:${nodeId}:tested_in_experiment:venue:${slugify(experiment.venue)}`,
                edge_type: "tested_in_experiment",
                from: nodeId,
                to: `venue:${slugify(experiment.venue)}`,
                label: "Experiment tested this venue",
                attributes: {},
                provenance: [snapshotProvenance(state, recordedAt, [], [])],
            }, recordedAt);
        }
    }
    graph.sync_history = [
        ...graph.sync_history,
        {
            id: `graph_sync:${Date.now()}`,
            action,
            phase: state.phase,
            source_snapshot_version: state.version,
            node_count: graph.nodes.length,
            edge_count: graph.edges.length,
            recorded_at: recordedAt,
        },
    ].slice(-100);
    graph.updated_at = recordedAt;
    return graph;
}
export function queryGraph(graph, query) {
    const queryLimit = query.limit ?? 10;
    const searchLower = query.search?.toLowerCase() ?? null;
    const matchedNodes = graph.nodes
        .filter((node) => !query.node_id || node.id === query.node_id)
        .filter((node) => !query.entity_type || node.entity_type === query.entity_type)
        .filter((node) => !searchLower || [node.id, node.label, node.summary].join(" ").toLowerCase().includes(searchLower))
        .slice(0, queryLimit);
    const matchedIds = new Set(matchedNodes.map((node) => node.id));
    const relatedEdges = graph.edges.filter((edge) => matchedIds.has(edge.from) || matchedIds.has(edge.to)).slice(0, queryLimit * 2);
    return { nodes: matchedNodes, edges: relatedEdges };
}
