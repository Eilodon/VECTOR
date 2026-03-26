# Replit Adapter

## Best surface

Replit is useful when VECTOR needs a low-friction hosted workspace for builders who want fast iteration with minimal local setup.

## Recommended setup

- Keep VECTOR in the repo or workspace root.
- Run the MCP runtime as the GTM engine when the host supports tool calling or background services.
- Keep the KB visible in the workspace so the agent can preserve continuity.

## VECTOR mapping

- Orchestrator → workspace instruction
- MCP runtime → service or tool backend
- KB → shared state file

## Failure mode to avoid

Do not present Replit as a fully verified MCP path until the hosted service flow has a clean smoke test.
