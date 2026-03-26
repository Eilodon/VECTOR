# GitHub Copilot Adapter

## Best surface

GitHub Copilot is a strong fit when VECTOR needs a repo-native coding agent with MCP support and auditable pull-request workflows.

## Recommended setup

- Keep VECTOR schemas and KB in the repository.
- Configure the coding agent to call the VECTOR MCP Server as a tool provider.
- Prefer tool-heavy flows because Copilot coding agent is strongest when the server exposes clean tool contracts.

## VECTOR mapping

- Orchestrator → repo instructions or agent task spec
- MCP runtime → tool provider for GTM phases
- KB → repo file updated after stable decisions

## Failure mode to avoid

Do not assume prompt-only context is enough. If the agent cannot call tools, treat the adapter as degraded.
