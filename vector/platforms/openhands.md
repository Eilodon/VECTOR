# OpenHands Adapter

## Best surface

OpenHands is a strong fit when VECTOR needs a headless or hosted open-source agent that can run longer workflows and still keep reviewable artifacts.

## Recommended setup

- Run the VECTOR MCP Server as the GTM tool backend.
- Keep the KB as a stable workspace file.
- Use OpenHands for execution and browser/terminal loops, but keep GTM phase logic inside VECTOR.

## VECTOR mapping

- Orchestrator → task framing for the agent run
- MCP runtime → GTM tool backend
- KB → durable state checkpoint between runs

## Failure mode to avoid

Do not let the host agent invent its own GTM state model when the MCP runtime already owns the canonical state.
