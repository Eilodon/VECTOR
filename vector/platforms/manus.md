# Manus Adapter

Status: `documented`

## Best surface

Manus is an excellent fit for VECTOR, especially with the new MCP integration, as it allows for structured tool calls and durable state management.

## Recommended setup

-   **Deploy VECTOR MCP Server:** Run the `vector/mcp_server` as a background process or a dedicated service. This server will expose all VECTOR GTM functionalities as MCP tools.
-   **Configure Manus to call MCP Tools:** Instead of uploading individual VECTOR skills, configure Manus to interact with the running VECTOR MCP Server. This can be done by defining the MCP Server as a tool provider within Manus's environment.
-   **Persistent KB:** Continue to use the KB as a persistent file within the workspace or as an attached artifact, which the MCP Server will manage.

## What Manus likes (and how MCP enhances it)

-   **Modular instructions:** MCP tools provide clear, modular interfaces for each GTM phase.
-   **Clear task boundaries:** Each MCP tool corresponds to a specific phase or action, ensuring clear boundaries.
-   **Progressive disclosure:** The orchestrator within the MCP Server guides the flow, ensuring phases are completed in order.
-   **Reusable workflows:** MCP tools are inherently reusable and can be called by Manus as needed.

## VECTOR mapping

-   **Orchestrator:** The `vector-orchestrator` logic is now encapsulated within the MCP Server, managing state and routing tool calls.
-   **Skills:** Individual VECTOR skills (ICP, Market, Channel, etc.) are exposed as distinct MCP tools (e.g., `vector_intake`, `vector_icp_jtbd`).
-   **KB:** The `KNOWLEDGE_BASE.md` is managed by the MCP Server for persistent state.

## Media Integration Hook (Future)

When media generation is enabled, Manus will be able to call the `vector_render_media` MCP tool. The MCP Server will then handle the rendering process and return a structured media spec or render-ready contract. This allows Manus to seamlessly integrate visual content into GTM strategies without needing direct media generation capabilities itself.

## Vietnamese note

Với MCP, Manus có thể gọi các chức năng GTM của VECTOR một cách có cấu trúc và an toàn, tận dụng tối đa khả năng của cả hai hệ thống.

## v1.6 Manus notes

Manus becomes even more effective when it can leverage the structured, secure, and state-aware tools provided by the VECTOR MCP Server. This allows for more complex, multi-step GTM workflows to be executed reliably.

### Install recommendation
-   Deploy the `vector-mcp-server`.
-   Configure Manus to discover and call the MCP tools exposed by the server.
-   The KB remains the continuity anchor, managed by the MCP Server.

### Failure mode to avoid
Do not attempt to replicate the MCP Server's logic directly within Manus prompts. Always delegate to the MCP Server for GTM logic and state management.

## v1.6 adapter notes

### Best practice
-   Manus should call MCP tools for all GTM phase execution.
-   The MCP Server ensures canonical schemas are loaded and state is managed consistently.
-   Artifact history is preserved by the MCP Server.

### Skill registry note
With MCP, the concept of a "skill registry" shifts to the MCP Server's tool definitions, which Manus can query and use programmatically.

## Verification note

Do not call this adapter `verified-remote` until the recipe in `vector/docs/INTEGRATION_SMOKE_TESTS.md` is executed and captured in-repo.
