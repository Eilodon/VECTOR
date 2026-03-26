# Cursor Adapter

Status: `documented`

## Best surface

Cursor is ideal when VECTOR needs to operate close to the codebase and integrate with developer workflows, now enhanced by MCP for structured tool interaction.

## Supported surfaces

-   Project Rules: `.cursor/rules`
-   User Rules: global Cursor settings
-   AGENTS.md: simple project instructions
-   Skills: `.cursor/skills` and `.agents/skills`
-   Custom modes: for specialized workflows

## Recommended setup

-   **Deploy VECTOR MCP Server:** Run the `vector/mcp_server` as a local subprocess launched by Cursor through MCP, or as a dedicated service when supported by the host.
-   **Configure Cursor to call MCP Tools:** Utilize Cursor's tool calling capabilities to interact with the running VECTOR MCP Server. This means configuring Cursor to call the MCP server rather than duplicating the GTM logic inside rules or modes.
-   **Persistent KB:** The `KNOWLEDGE_BASE.md` should remain a repository file, managed and updated by the MCP Server.

## VECTOR mapping

-   **Orchestrator:** The `vector-orchestrator` logic is now centralized within the MCP Server, which Cursor interacts with via tool calls.
-   **Skills:** Individual VECTOR skills (ICP, Market, Channel, etc.) are exposed as distinct MCP tools (e.g., `vector_intake`, `vector_icp_jtbd`) that Cursor can invoke.
-   **State:** The `KNOWLEDGE_BASE.md` file in the repo serves as the persistent state, managed by the MCP Server.

## Media Integration Hook (Future)

When media generation is enabled, Cursor will be able to call the `vector_render_media` MCP tool. The MCP Server will handle the rendering process and return a structured media spec or render-ready contract. This allows Cursor to facilitate the creation of visual GTM content without needing native media generation capabilities.

## Notes

Cursor works best when instructions are short, scoped, and modular. The MCP integration aligns perfectly with this principle by providing well-defined, callable tools.

## Vietnamese note

Với MCP, Cursor có thể gọi các chức năng GTM của VECTOR một cách có cấu trúc và an toàn, tận dụng tối đa khả năng của cả hai hệ thống.

## v1.6 Cursor notes

Cursor works best when the rules are compact and the folder structure is predictable. The MCP integration centralizes complex GTM logic, allowing Cursor to focus on orchestrating tool calls.

### Install recommendation
-   Deploy the `vector-mcp-server`.
-   Configure Cursor to discover and call the MCP tools exposed by the server.
-   The KB remains the continuity anchor, managed by the MCP Server.

### Failure mode to avoid
Avoid attempting to replicate the MCP Server's logic directly within Cursor's rules or prompts. Always delegate GTM logic and state management to the MCP Server.

## v1.6 adapter notes

### Best practice
-   Cursor should call MCP tools for all GTM phase execution.
-   The MCP Server ensures canonical schemas are loaded and state is managed consistently.
-   Artifact history is preserved by the MCP Server.

### Skill registry note
With MCP, the concept of a "skill registry" shifts to the MCP Server's tool definitions, which Cursor can query and utilize dynamically.

## Verification note

Do not call this adapter `verified-local` until the recipe in `vector/docs/INTEGRATION_SMOKE_TESTS.md` is executed and captured in-repo.
