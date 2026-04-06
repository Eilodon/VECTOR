import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VectorError } from "./core_error_codes.js";

export function createToolRegistrar(deps: {
  currentVersion: () => string;
  serverName: () => string | undefined;
  getCapabilityState: () => { toolsets: string[]; safeMode: boolean };
  getToolDefinitions: () => Array<{
    name: string;
    config: { description: string; inputSchema: any; outputSchema?: any };
    handler: (args: any) => Promise<any>;
  }>;
  capabilityPolicy: (toolName: string) => { toolset: string; safe_mode_blocked?: boolean } | null | undefined;
  withRequestSchema: (shape: any) => any;
  withIdempotency: (action: string, handler: (args: any) => Promise<any>) => (args: any) => Promise<any>;
  setServer: (server: McpServer) => void;
}) {
  function createServer(): McpServer {
    return new McpServer({
      name: deps.serverName() ?? "vector-gtm-os",
      version: deps.currentVersion(),
    });
  }

  function registerRuntimeTools(): void {
    const server = createServer();
    deps.setServer(server);
    const capabilityState = deps.getCapabilityState();
    const enabledToolsets = new Set(capabilityState.toolsets);
    for (const definition of deps.getToolDefinitions()) {
      const policy = deps.capabilityPolicy(definition.name);
      if (!policy) {
        throw new VectorError(
          "CAPABILITY_POLICY_MISSING",
          `Capability policy is missing for '${definition.name}'.`,
          { tool: definition.name }
        );
      }
      if (!enabledToolsets.has(policy.toolset)) {
        continue;
      }
      server.registerTool(
        definition.name,
        {
          ...definition.config,
          inputSchema: deps.withRequestSchema(definition.config.inputSchema),
          outputSchema: definition.config.outputSchema ?? {
            type: "object",
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              decisions: { type: "array", items: { type: "string" } },
              next_actions: { type: "array", items: { type: "string" } },
              state_delta: { type: "object" },
              payload: { type: "object" },
            },
          },
        },
        deps.withIdempotency(definition.name, async (args: any) => {
          if (capabilityState.safeMode && policy.safe_mode_blocked) {
            throw new VectorError(
              "SAFE_MODE_BLOCKED",
              `safe_mode blocks '${definition.name}' because it mutates admin state.`,
              { tool: definition.name }
            );
          }
          return definition.handler(args);
        }),
      );
    }
  }

  return {
    registerRuntimeTools,
  };
}
