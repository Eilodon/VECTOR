# Changelog

## [2.0.0] - 2026-03-26

### Added
- Capability-scoped MCP runtime with explicit toolsets and `safe_mode`.
- Provider-backed research connector boundary plus provenance-aware evidence ingestion.
- Hybrid memory layer with advisory graph sidecar and graph query/sync tools.
- Instance-based runtime model for both local and remote execution paths.
- Auth0-compatible OAuth access-token validation in the remote worker, with license fallback preserved for technical beta.
- Principal-scoped session registry with concurrent-session caps and anomaly-event logging for remote auth.
- Generated registry metadata under `vector/registry/server_metadata.json`.
- One-command host installer via `pnpm run host:install`.
- Host-facing self-test entrypoint via `pnpm run selftest`.
- Maintained host fixture templates under `vector/integrations/templates/`.
- Auth/community vNext implementation plan under `vector/docs/AUTH_COMMUNITY_VNEXT_PLAN.md`.

### Changed
- Product identity and runtime version are unified on the `2.0.0` line.
- Root README now reflects VECTOR as an MCP-native GTM operating system instead of a legacy hardening snapshot.
- Local host fixtures are generated from shared templates and carry explicit `VECTOR_TOOLSETS` plus `VECTOR_SAFE_MODE`.
- Release checks now validate registry metadata truth and run a host-facing self-test.
- Integration verification records now reference generated fixture commands and self-test commands.

### Fixed
- Removed drift between runtime identity, manifest version, and top-level product docs.
- Closed the gap where installer, fixtures, and verification records could diverge silently.

## [1.6.2] - 2026-03-25

### Added
- Canonical runtime views for routing, product, ICP, distribution, risk, logs, session sync, and artifact registry.
- `vector_venue_score`, `vector_route_context`, `vector_strategy_map`, and `vector_sync_kb` runtime tools.
- `vector_research_memo` runtime tool with structured evidence capture and research-weighted scoring inputs.
- `vector_source_capture`, `vector_competitor_map`, and `vector_channel_evidence` to move research toward an auditable evidence pipeline.
- Intake and ICP input support for price, watering holes, WTP signal, persona, intent, platform, and stage metadata.
- Integration status tracking plus adapters for GitHub Copilot, Cline, OpenHands, Replit, and Antigravity.
- Shared runtime core used by both the local `stdio` server and the Cloudflare remote transport.
- Automated local MCP smoke test for `stdio` transport with idempotent retry verification.
- Host-specific local MCP fixtures for Cursor, Cline, Windsurf, and GitHub Copilot.
- Integration fixture validator plus host verification-record gates for local adapters.

### Changed
- Runtime state now reconciles the legacy flat fields with the documented nested schema before saving.
- Artifact registry entries are updated automatically on every emitted artifact.
- KB sync status is tracked explicitly in runtime state.
- Channel and venue scoring can now incorporate observed research evidence instead of relying on heuristics alone.
- Research evidence now carries `source_type` plus freshness windows, and stale evidence is penalized during scoring.
- Channel scoring now blends evidence-first observations with benchmark guidance instead of stacking raw heuristic bonuses.
- Runtime phase flow now includes a first-class `venue` phase, and sales copy is gated behind a locked venue card.
- Signal review now writes experiment-ledger rows instead of updating only the lightweight signal counters.
- Workflow policy now has a single executable source of truth in `vector/mcp_server/workflow_contract.ts`, and `vector_channel_score` now promotes into `thesis` before `venue`.
- Remote transport moved from the old SSE prototype to `streamable-http` with durable-object backed runtime state.
- All runtime tools now accept optional `request_id` and return cached responses for idempotent retries.

### Fixed
- The doc/runtime gap around `stage`, `product.price`, `watering_holes`, `wtp_signal`, and routing/session fields is now bridged in execution.
- Release checks now point at the real package root and current version line.
- State writes no longer depend on a single-process boolean flag; commits now flow through a serialized queue.

## [1.6.1] - 2026-03-25

### Added
- `vector/skills/design/SKILL.md` expanded into a usable basic design skill.
- `tests/` added for manifest, docs, and build checks.
- `.github/workflows/ci.yml` added for install, test, build, and audit verification.

### Changed
- Orchestrator rewritten around one canonical phase flow.
- Knowledge base reduced to a single YAML snapshot template.
- Channel scoring standardized to one normalized rubric.
- Thesis and venue outputs now include the missing fields from the report.
- Auto-install prompts rewritten for step-by-step buyer clarity.
- Copy, audit, research, quick start, full, and recovery modes expanded.
- Examples made more concrete and decision-ready.
- Package metadata and runtime version updated to `1.6.1`.

### Security
- Added stronger prompt-injection handling in the runtime.
- CI now checks installability and build health before release.

## [1.6.0] - 2026-03-24

### Added
- MCP runtime
- typed tools
- durable state
- phase guards
- artifact output contracts

### Fixed
- earlier duplicate templates and phase confusion
- install friction in the basic runtime package


## 1.6.1 final hardening

- Added release freeze boundaries and regression checks for legacy duplicate markers.
