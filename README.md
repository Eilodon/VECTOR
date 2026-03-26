# VECTOR Suite v2.0.0

English-first. Vietnamese notes stay short and only where they add clarity.

VECTOR is a GTM execution operating system delivered as a durable MCP server plus canonical schemas, skills, and host integration assets. It takes a project from vague market intuition to an auditable loop across intake, ICP, market, channel, thesis, venue, signal, research, and copy.

## What VECTOR is

- A typed MCP runtime with durable state for GTM decisions.
- A contract-driven workflow system with explicit phase gates.
- An evidence-first research layer with provider-backed normalization.
- A hybrid-memory system: authoritative snapshot state plus advisory graph memory.
- A host-installable product surface for local MCP adapters and remote `streamable-http`.

## What it is for

Use VECTOR when you need to:

- lock a sharper ICP and JTBD with 4 Forces, not generic personas
- map the market by direct, substitute, workflow, and attention competitors
- score channels with founder edge plus fresh evidence
- keep thesis and venue as separate decisions
- track signal quality and recovery paths through a durable experiment ledger
- generate copy only after GTM choices are locked enough to deserve it

## Product surfaces

- Local runtime: `stdio` MCP server at [vector/mcp_server](/home/ybao/B.1/VECTOR/vector/mcp_server)
- Remote runtime: Cloudflare `streamable-http` worker at [vector/cloud_worker](/home/ybao/B.1/VECTOR/vector/cloud_worker)
- Canonical contracts: [vector/schemas](/home/ybao/B.1/VECTOR/vector/schemas)
- Integration registry: [INTEGRATION_STATUS.md](/home/ybao/B.1/VECTOR/vector/docs/INTEGRATION_STATUS.md)
- Runtime/tool contract: [runtime_contract.yaml](/home/ybao/B.1/VECTOR/vector/schemas/runtime_contract.yaml)

## Quick start

Install workspace dependencies:

```bash
pnpm install --frozen-lockfile
pnpm --dir vector/mcp_server install --frozen-lockfile
```

Build and verify the runtime:

```bash
pnpm --dir vector/mcp_server run build
pnpm run selftest -- --mode local
```

Generate a host config:

```bash
pnpm run host:install -- --host cursor
pnpm run selftest -- --host cursor
```

## Host install model

Local host configs are generated from maintained templates, not hand-edited JSON. Today the generated local install targets are:

- Cursor
- Cline
- Windsurf
- GitHub Copilot

Status truth remains in [INTEGRATION_STATUS.md](/home/ybao/B.1/VECTOR/vector/docs/INTEGRATION_STATUS.md). A generated fixture plus repo self-test does not automatically promote a host to `verified-local`; that still requires a real host run captured in the corresponding `VERIFICATION.md`.

## Remote auth model

- Technical beta / local-style remote deploys can keep `Authorization: Bearer vsk_*`.
- Production remote deploys can enable Auth0-backed OAuth access-token validation by setting `VECTOR_AUTH_ISSUER` and `VECTOR_AUTH_AUDIENCE`.
- Session routing still requires `x-vector-project-id` and `x-vector-session-owner` so KB ownership remains explicit.
- Wave 2 anti-sharing is now partially implemented: principal-scoped session registry, per-tier concurrent-session caps, and review-first anomaly logs for device/IP drift.

## Safety rules

- Never let the shell become the source of truth.
- Never let copy rewrite strategy.
- Never scale before a real signal exists.
- Keep runtime mutation auditable.
- Prefer fresh evidence over stale heuristics.

## Release checks

The product release gate now covers:

- manifest integrity
- integration fixture generation truth
- typecheck and build
- registry metadata truth
- host-facing self-test
- test suite

Run the full release gate:

```bash
pnpm run release-check
```

## Package map

- [vector/mcp_server](/home/ybao/B.1/VECTOR/vector/mcp_server) — executable local MCP runtime
- [vector/cloud_worker](/home/ybao/B.1/VECTOR/vector/cloud_worker) — remote MCP runtime
- [vector/skills](/home/ybao/B.1/VECTOR/vector/skills) — phase-oriented GTM skills
- [vector/schemas](/home/ybao/B.1/VECTOR/vector/schemas) — machine-readable contracts
- [vector/integrations](/home/ybao/B.1/VECTOR/vector/integrations) — host fixtures, templates, and verification records
- [vector/docs](/home/ybao/B.1/VECTOR/vector/docs) — architecture, reference workflows, and release notes

## Notes

If the package feels too large, start with [vector/mcp_server/README.md](/home/ybao/B.1/VECTOR/vector/mcp_server/README.md) and [INTEGRATION_SMOKE_TESTS.md](/home/ybao/B.1/VECTOR/vector/docs/INTEGRATION_SMOKE_TESTS.md).

Vietnamese note: root README là landing page của sản phẩm. Source of truth cho hành vi runtime vẫn nằm ở schema, workflow contract, và MCP server.
