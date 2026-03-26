# Cline Adapter

## Best surface

Cline is a strong fit when VECTOR needs MCP-aware agent execution across editor and CLI workflows.

## Recommended setup

- Run the VECTOR MCP Server locally.
- Point Cline at the MCP server instead of duplicating GTM logic in prompts.
- Keep the KB in the workspace so the agent can audit diffs and state changes.

## VECTOR mapping

- Orchestrator → top-level operating instruction
- MCP runtime → callable GTM tools
- KB → durable repo artifact

## Failure mode to avoid

Do not collapse research, routing, and copy into one giant task. Keep the phase boundaries explicit.
