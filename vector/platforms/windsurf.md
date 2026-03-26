# Windsurf Adapter

Status: `documented`

## Best surface

Windsurf is highly effective for skill-driven, multi-step workflows in Cascade, now significantly enhanced by the structured and secure tool calls provided by the VECTOR MCP Server.

## Skill locations

While Windsurf traditionally uses `SKILL.md` files, with MCP integration, the core GTM logic is centralized in the MCP Server. Windsurf will now primarily interact with the MCP Server as a tool provider.

## Recommended setup

-   **Deploy VECTOR MCP Server:** Run the `vector/mcp_server` as a background process or a dedicated service, ensuring it's accessible by Windsurf.
-   **Configure Windsurf to call MCP Tools:** Configure Windsurf to discover and interact with the tools exposed by the VECTOR MCP Server. This might involve defining custom tool integrations or modifying existing skill definitions to delegate to MCP tool calls.
-   **Persistent KB:** The `KNOWLEDGE_BASE.md` should be managed by the MCP Server as the shared state file in the workspace.

## VECTOR mapping

-   **Orchestrator:** The `vector-orchestrator` logic is now centralized within the MCP Server, which Windsurf interacts with via tool calls.
-   **Skills:** Individual VECTOR skills (ICP, Market, Channel, etc.) are exposed as distinct MCP tools (e.g., `vector_intake`, `vector_icp_jtbd`) that Windsurf can invoke.
-   **KB:** The `KNOWLEDGE_BASE.md` serves as the shared state file, managed by the MCP Server.

## Media Integration Hook (Future)

When media generation is enabled, Windsurf will be able to call the `vector_render_media` MCP tool. The MCP Server will handle the rendering process and return a structured media spec or render-ready contract. This allows Windsurf to orchestrate the creation of visual GTM content through the MCP Server.

## Vietnamese note

Với MCP, Windsurf có thể gọi các chức năng GTM của VECTOR một cách có cấu trúc và an toàn, tận dụng tối đa khả năng của cả hai hệ thống.

## v1.6 Windsurf notes

Windsurf works best when each skill folder is clean and progressive disclosure is respected. The MCP integration centralizes complex GTM logic, allowing Windsurf to focus on orchestrating tool calls and presenting results.

### Install recommendation
-   Deploy the `vector-mcp-server`.
-   Configure Windsurf to discover and call the MCP tools exposed by the server.
-   The KB remains the continuity anchor, managed by the MCP Server.

### Failure mode to avoid
Do not attempt to replicate the MCP Server's logic directly within Windsurf's skill definitions. Always delegate GTM logic and state management to the MCP Server.

## v1.6 adapter notes

### Best practice
-   Windsurf should call MCP tools for all GTM phase execution.
-   The MCP Server ensures canonical schemas are loaded and state is managed consistently.
-   Artifact history is preserved by the MCP Server.

### Skill registry note
With MCP, the concept of a "skill registry" shifts to the MCP Server's tool definitions, which Windsurf can query and utilize dynamically.

## Verification note

Do not call this adapter `verified-local` until the recipe in `vector/docs/INTEGRATION_SMOKE_TESTS.md` is executed and captured in-repo.
