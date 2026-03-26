# Local Host Fixtures

These fixtures capture host-specific MCP configuration shapes for local VECTOR usage.
They are generated from `vector/integrations/templates/` and should stay aligned with `pnpm run host:install`.

They do not automatically promote a platform to `verified-local`.
Promotion still requires a real host run plus the shared smoke test.

## Included hosts

- Cursor: `.cursor/mcp.json`
- Cline: `cline_mcp_settings.json`
- Windsurf: `mcp_config.json`
- GitHub Copilot: `.github/agents/vector_gtm.agent.md` and `.copilot/mcp-config.json`

## Shared assumptions

- the VECTOR server runs locally through `node vector/mcp_server/dist/index.js`
- the caller provides `VECTOR_LICENSE_KEY`
- the caller may override `VECTOR_PROJECT_ID`
- local fixtures expose `core,research,strategy,copy` by default through `VECTOR_TOOLSETS`
- local fixtures enable `VECTOR_SAFE_MODE=true` by default
- the KB stays outside the host-specific config and remains owned by VECTOR

## Verification note

Use these fixtures together with `pnpm run selftest -- --host <host>` and `tests/smoke_local.test.mjs`, then fill the host's `VERIFICATION.md` from a real run before promoting any adapter status.
