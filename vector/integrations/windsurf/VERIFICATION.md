# Windsurf Verification Record

Status: documented

Fixture:
- `mcp_config.json`

Generated fixture command:
- `pnpm run host:install -- --host windsurf --output-dir vector/integrations/windsurf`

Self-test command:
- `pnpm run selftest -- --host windsurf --output-dir vector/integrations/windsurf`

Shared smoke test: tests/smoke_local.test.mjs

Host-specific run evidence:
- date:
- Windsurf version:
- config path used:
- generated fixture command used:
- self-test command used:
- MCP registration proof:
- `vector_state_snapshot` result:
- `vector_intake` result:
- KB/state proof:

Promotion gate:
- leave `documented` until all fields above are filled from a real Windsurf run
