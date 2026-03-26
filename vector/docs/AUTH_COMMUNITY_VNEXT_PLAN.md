# Auth / Community vNext Plan

This document captures the current repo truth on 2026-03-26, the chosen OAuth direction, and the next implementation slices for anti-sharing and community export.

## Current state audit

### Implemented now

- Local `stdio` runtime with durable state.
- Remote `streamable-http` runtime on Cloudflare Durable Objects.
- Active-license bearer validation for `vsk_*` keys.
- Ownership routing via `x-vector-project-id` and `x-vector-session-owner`.
- Registry metadata and setup guide now distinguish implemented behavior from roadmap.

### Missing or partial

- No browser login flow or hosted Authorization Server is shipped inside this repo.
- No token rotation telemetry, hard device binding, or automated anomaly scoring yet.
- No community KB export tool, anonymization pipeline, consent gate, or moderation boundary yet.

### Boundary decision

- VECTOR remains an OAuth Resource Server, never an Authorization Server.
- Local/dev paths keep static bearer licenses for low-friction technical beta use.
- Remote production path moves to OAuth 2.1 Authorization Code with PKCE via an external provider.

## Provider choice

Chosen provider: **Auth0**

Why this fits VECTOR best right now:

- Stable support for Authorization Code + PKCE, API audience/scopes, JWKS-based JWT validation, and refresh-token rotation.
- Cleaner fit for VECTOR's remote runtime because the Cloudflare worker only needs to validate access tokens for a custom API.
- Better near-term path for organizations, tiered scopes, and future remote-host integrations than Clerk's still-evolving machine-token story.

Not chosen first: **Clerk**

- Clerk remains a valid option for a later productized UX layer.
- For VECTOR's current need, Auth0 maps more directly to "custom API + resource server + scoped access token" without extra translation.

## Target auth architecture

### Wave 1: OAuth resource-server support

- Add Auth0 JWT validation to the remote worker.
- Keep `vsk_*` bearer fallback behind `VECTOR_ALLOW_LICENSE_FALLBACK`.
- Require `vector:cloud` scope by default.
- Route Durable Objects by authenticated principal namespace plus project/session ownership headers.

### Wave 2: Anti-sharing suite

- Session registry keyed by authenticated subject. [implemented]
- Per-tier concurrent-session caps. [implemented]
- Soft device binding with review-first anomaly events. [implemented]
- Refresh-token rotation and suspicious-session telemetry in the external auth layer.

### Wave 3: Community export

- New `vector_export_insight` tool.
- Explicit consent and redaction policy.
- Distilled export artifact separate from authoritative session state.
- Moderation / publish queue before any community aggregate is updated.

## Implementation order

1. Ship OAuth resource-server support in `vector/cloud_worker`.
2. Update docs and registry metadata to reflect dual auth truth.
3. Add anti-sharing telemetry contract plus session registry.
4. Add community export contract and artifact schema.
5. Only after that, promote real host OAuth runs with checked evidence.

## Exit criteria for auth wave

- Remote worker accepts Auth0 JWT access tokens when issuer/audience are configured.
- Remote worker can disable static-license fallback for production deployment.
- Tests cover valid JWT, missing scope, and legacy license fallback.
- Registry metadata and setup guide describe the dual-mode auth model truthfully.
