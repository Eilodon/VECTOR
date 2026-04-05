export function registerGraphTools(deps) {
    deps.registerVectorTool("vector_graph_sync", {
        description: "Sync the current authoritative snapshot into advisory graph memory with provenance-linked nodes and edges.",
        inputSchema: {
            reason: deps.zod.string().optional().describe("Optional reason for this graph sync."),
        },
    }, async ({ reason }) => {
        const graph = deps.vectorGraphMemorySchema.parse(deps.syncGraphFromState(deps.getState(), deps.getGraphMemory(), reason ? `vector_graph_sync:${reason}` : "vector_graph_sync", deps.now()));
        await deps.saveGraphMemory(graph);
        return {
            content: [{ type: "text", text: deps.artifactToText({
                        title: "Graph Memory Sync",
                        summary: "Snapshot state has been projected into advisory graph memory.",
                        decisions: [
                            `Graph nodes: ${graph.nodes.length}`,
                            `Graph edges: ${graph.edges.length}`,
                            `Snapshot phase remains authoritative: ${deps.getState().phase}`,
                        ],
                        next_actions: [
                            "Use vector_graph_query to inspect longitudinal memory with provenance.",
                            "Keep workflow decisions anchored in vector_state.json, not graph memory.",
                        ],
                        state_delta: {
                            graph_updated_at: graph.updated_at,
                            graph_node_count: graph.nodes.length,
                            graph_edge_count: graph.edges.length,
                        },
                        payload: {
                            reason: reason ?? null,
                            latest_sync: graph.sync_history.at(-1) ?? null,
                        },
                    }) }],
        };
    });
    deps.registerVectorTool("vector_graph_query", {
        description: "Query advisory graph memory by node id, entity type, or free-text search. Returns provenance-linked nodes and edges.",
        inputSchema: {
            node_id: deps.zod.string().optional().describe("Exact graph node id."),
            entity_type: deps.graphEntityTypeSchema.optional().describe("Optional graph entity type filter."),
            search: deps.zod.string().optional().describe("Free-text search against id, label, and summary."),
            limit: deps.zod.number().int().positive().max(25).optional().describe("Maximum nodes to return."),
        },
    }, async ({ node_id, entity_type, search, limit }) => {
        const cleaned = deps.sanitizeRecursive({ node_id, entity_type, search, limit });
        const { nodes: matchedNodes, edges: relatedEdges } = deps.queryGraph(deps.getGraphMemory(), cleaned);
        return {
            content: [{ type: "text", text: deps.artifactToText({
                        title: "Graph Memory Query",
                        summary: `Returned ${matchedNodes.length} node(s) and ${relatedEdges.length} related edge(s) from advisory graph memory.`,
                        decisions: matchedNodes.map((node) => `${node.id} | ${node.entity_type} | provenance=${node.provenance.length}`),
                        next_actions: [
                            "Use node provenance to trace every graph fact back to snapshot state or captured evidence.",
                            "Do not treat graph query output as a workflow phase override.",
                        ],
                        state_delta: {
                            matched_node_count: matchedNodes.length,
                            matched_edge_count: relatedEdges.length,
                        },
                        payload: {
                            query: cleaned,
                            nodes: matchedNodes,
                            edges: relatedEdges,
                        },
                    }) }],
        };
    });
}
