# Integration Smoke Tests

This file defines the minimum evidence required before an adapter can move past `documented`.

For generated local fixtures, use:

```bash
pnpm run host:install -- --host <host>
pnpm run selftest -- --host <host>
```

## Required outcomes

Every adapter smoke test must prove all of these:

1. a clean checkout can follow the install path without undocumented steps
2. the host can reach at least one VECTOR MCP tool end-to-end
3. the resulting state change is visible in the KB or runtime snapshot
4. the transport/auth story used by the adapter matches the repo docs

## Shared target

Use this minimum test target unless a host requires a different path:

1. start VECTOR locally with `VECTOR_LICENSE_KEY=vsk_test VECTOR_PROJECT_ID=smoke pnpm --dir vector/mcp_server start`
2. connect the host to the MCP endpoint or stdio transport that the adapter claims to support
3. call `vector_state_snapshot`
4. call `vector_intake` with a fixed `request_id`
5. retry the same `vector_intake` call with the same `request_id`
6. confirm the response is cached and the state does not duplicate artifacts

This shared local path is already automated in-repo by `tests/smoke_local.test.mjs`.
Host-specific local fixtures live under `vector/integrations/`, and their generated source templates live under `vector/integrations/templates/`.

## Adapter recipes

### Cursor
- Status target: `verified-local`
- Transport: local MCP / stdio or local subprocess
- Evidence to capture:
  - Cursor config snippet
  - one successful `vector_state_snapshot`
  - one successful `vector_intake`
  - reference to the shared local smoke test plus host-specific config proof

### Windsurf
- Status target: `verified-local`
- Transport: local MCP server
- Evidence to capture:
  - MCP server registration
  - one successful tool call
  - KB or runtime state change
  - reference to the shared local smoke test plus host-specific config proof

### Cline
- Status target: `verified-local`
- Transport: local MCP server
- Evidence to capture:
  - host config
  - one successful tool call
  - idempotent retry result
  - reference to the shared local smoke test plus host-specific config proof

### GitHub Copilot
- Status target: `verified-local`
- Transport: repo-local MCP tool provider
- Evidence to capture:
  - agent tool config
  - one successful tool call
  - visible repo or state artifact update
  - reference to the shared local smoke test plus host-specific config proof

### OpenHands
- Status target: `verified-remote`
- Transport: remote `streamable-http`
- Evidence to capture:
  - remote MCP endpoint config
  - explicit ownership headers: `Authorization`, `x-vector-project-id`, `x-vector-session-owner`
  - one successful remote tool call
  - durable state persisted across a second request
  - isolation proof for a second owner or project id

### Manus
- Status target: `verified-remote`
- Transport: remote `streamable-http`
- Evidence to capture:
  - remote MCP connector config
  - explicit ownership headers if the connector supports custom headers
  - one successful tool call
  - state visible on the next request

### Replit
- Status target: `verified-remote`
- Transport: hosted workspace + remote MCP
- Evidence to capture:
  - hosted service wiring
  - one successful tool call
  - persisted state after workspace refresh

### Antigravity
- Status target: `verified-remote`
- Transport: remote MCP if publicly supported
- Evidence to capture:
  - public integration path
  - one successful tool call
  - persisted state evidence

### Claude, Codex, Lovable, OpenClaw
- Keep at `documented` unless the repo gains a reproducible host-specific setup with the same evidence rules above.

## Promotion note

Do not change adapter status in `INTEGRATION_STATUS.md` until the smoke-test evidence exists in-repo and the host's `VERIFICATION.md` record is filled from a real run.
