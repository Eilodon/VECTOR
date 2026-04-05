import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export function createToolRegistrar(deps) {
    function createServer() {
        return new McpServer({
            name: deps.serverName() ?? "vector-gtm-os",
            version: deps.currentVersion(),
        });
    }
    function registerRuntimeTools() {
        const server = createServer();
        deps.setServer(server);
        const capabilityState = deps.getCapabilityState();
        const enabledToolsets = new Set(capabilityState.toolsets);
        for (const definition of deps.getToolDefinitions()) {
            const policy = deps.capabilityPolicy(definition.name);
            if (!policy) {
                throw new Error(`Capability policy is missing for '${definition.name}'.`);
            }
            if (!enabledToolsets.has(policy.toolset)) {
                continue;
            }
            server.registerTool(definition.name, {
                ...definition.config,
                inputSchema: deps.withRequestSchema(definition.config.inputSchema),
            }, deps.withIdempotency(definition.name, async (args) => {
                if (capabilityState.safeMode && policy.safe_mode_blocked) {
                    throw new Error(`safe_mode blocks '${definition.name}' because it mutates admin state.`);
                }
                return definition.handler(args);
            }));
        }
    }
    return {
        registerRuntimeTools,
    };
}
