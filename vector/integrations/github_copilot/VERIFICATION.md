# GitHub Copilot Verification Record

Status: documented

Fixtures:
- `.copilot/mcp-config.json`
- `.github/agents/vector_gtm.agent.md`

Generated fixture command:
- `pnpm run host:install -- --host github_copilot --output-dir vector/integrations/github_copilot`

Self-test command:
- `pnpm run selftest -- --host github_copilot --output-dir vector/integrations/github_copilot`

Shared smoke test: tests/smoke_local.test.mjs

Host-specific run evidence:
- date:
- Copilot host/version:
- config path used:
- agent profile used:
- generated fixture command used:
- self-test command used:
- `vector_state_snapshot` result:
- `vector_intake` result:
- KB/state proof:

Promotion gate:
- leave `documented` until all fields above are filled from a real Copilot run
