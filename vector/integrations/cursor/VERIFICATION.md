# Cursor Verification Record

Status: documented

Fixture:
- `.cursor/mcp.json`

Generated fixture command:
- `pnpm run host:install -- --host cursor --output-dir vector/integrations/cursor`

Self-test command:
- `pnpm run selftest -- --host cursor --output-dir vector/integrations/cursor`

Shared smoke test: tests/smoke_local.test.mjs

Host-specific run evidence:
- date:
- Cursor version:
- config path used:
- generated fixture command used:
- self-test command used:
- `vector_state_snapshot` result:
- `vector_intake` result:
- KB/state proof:

Promotion gate:
- leave `documented` until all fields above are filled from a real Cursor run
