import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VectorError } from "./core_error_codes.js";

type ToolStructuredContent = {
  title?: string;
  summary?: string;
  decisions?: string[];
  next_actions?: string[];
  state_delta?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

type ToolResponse = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: ToolStructuredContent;
  isError?: true;
};

function normalizeToolResult(toolName: string, result: ToolResponse): ToolResponse {
  if (result.isError || result.structuredContent) {
    return result;
  }
  const text = result.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n\n");
  const firstLine = text.split("\n").find((line) => line.trim().length > 0) ?? "";
  const title = firstLine.startsWith("# ") ? firstLine.slice(2).trim() : toolName;
  const summary = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith("#")) ?? (text.trim() || `${toolName} completed.`);

  return {
    ...result,
    structuredContent: {
      title,
      summary,
      decisions: [],
      next_actions: [],
      state_delta: {},
      payload: { text },
    },
  };
}

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
        },
        deps.withIdempotency(definition.name, async (args: any) => {
          if (capabilityState.safeMode && policy.safe_mode_blocked) {
            throw new VectorError(
              "SAFE_MODE_BLOCKED",
              `safe_mode blocks '${definition.name}' because it mutates admin state.`,
              { tool: definition.name }
            );
          }
          return normalizeToolResult(definition.name, await definition.handler(args));
        }),
      );
    }
  }

  return {
    registerRuntimeTools,
  };
}
