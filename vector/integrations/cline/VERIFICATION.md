# Cline Verification Record

Status: documented

Fixture:
- `cline_mcp_settings.json`

Generated fixture command:
- `pnpm run host:install -- --host cline --output-dir vector/integrations/cline`

Self-test command:
- `pnpm run selftest -- --host cline --output-dir vector/integrations/cline`

Shared smoke test: tests/smoke_local.test.mjs

Host-specific run evidence:
- date:
- Cline version:
- config path used:
- generated fixture command used:
- self-test command used:
- `vector_state_snapshot` result:
- `vector_intake` result:
- idempotent retry proof:
- KB/state proof:

Promotion gate:
- leave `documented` until all fields above are filled from a real Cline run
