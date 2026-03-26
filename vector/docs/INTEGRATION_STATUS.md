# Integration Status

This document is the operational truth for VECTOR platform adapters.

## Status vocabulary

- `documented` — the repo includes adapter guidance or generated assets, but no real host run has verified the path end-to-end.
- `verified-local` — the install path is verified for local or repo-scoped execution by a real host run plus repo evidence.
- `verified-remote` — the install path is verified for remote or hosted MCP execution by a real host run plus repo evidence.
- `deprecated` — keep only for migration notes; do not market as an active path.

## Current adapter status

| Platform | Status | Integration shape | Notes |
|---|---|---|---|
| Claude | documented | project knowledge / repo instructions | Strong context surface, but this repo does not ship a reproducible MCP install path for Claude Projects. |
| Codex | documented | repo context + reviewable tasks | Good fit for reviewable work; keep documented until a reproducible host setup is checked in. |
| Cursor | documented | local MCP + rules + skills | Generated fixture plus `pnpm run selftest -- --host cursor` exist in-repo; promotion still requires a real Cursor run. |
| Lovable | documented | workspace knowledge | Useful for product context, not a first-class MCP host in this repo. |
| Manus | documented | remote MCP tool provider | Remote-ready in theory after `P1`, but still not verified without an in-repo host smoke test. |
| OpenClaw | documented | file-system skills | Requires security review plus precedence testing before any promotion. |
| Windsurf | documented | local MCP server + skills | Generated fixture plus `pnpm run selftest -- --host windsurf` exist in-repo; promotion still requires a real Windsurf run. |
| GitHub Copilot | documented | coding agent + MCP | Generated fixture plus `pnpm run selftest -- --host github_copilot` exist in-repo; promotion still requires a real host run. |
| Cline | documented | local MCP + CLI / editor agent | Generated fixture plus `pnpm run selftest -- --host cline` exist in-repo; promotion still requires a real Cline run. |
| OpenHands | documented | remote MCP + headless agent | Candidate for `verified-remote` once remote smoke proof is captured. |
| Replit | documented | hosted workspace + remote MCP | Candidate for `verified-remote` once hosted service flow is reproduced in-repo. |
| Antigravity | documented | agent-first dev environment | Keep documented until the public integration path is stable and smoke-tested. |
| Legacy SSE remote path | deprecated | old cloud transport notes | Superseded by `streamable-http`; do not market as active integration. |

## Promotion rules

Before promoting an adapter from `documented` to `verified-local` or `verified-remote`, verify:

1. the install path works on a clean checkout
2. the adapter can call at least one VECTOR MCP tool end-to-end
3. the KB sync path is explicit
4. the adapter does not claim unsupported transport or auth behavior
5. the smoke-test steps live in the repo
6. the status row links to or names the smoke-test recipe used
7. the host has a checked-in verification record under `vector/integrations/<host>/VERIFICATION.md`

## Install automation note

For Cursor, Cline, Windsurf, and GitHub Copilot, the repo now ships:

- generated fixture templates under `vector/integrations/templates/`
- `pnpm run host:install -- --host <host>`
- `pnpm run selftest -- --host <host>`

These assets reduce install drift, but they do not replace host-run evidence.

## Vietnamese note

Không được gọi một adapter là “hỗ trợ MCP” chỉ vì có file markdown mô tả. Phải có smoke test hoặc xác thực cài đặt tương ứng với status.
