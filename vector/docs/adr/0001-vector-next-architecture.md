# ADR 0001: VECTOR Next Architecture

- Status: Accepted
- Date: 2026-03-25
- Owners: VECTOR runtime maintainers
- Scope: `vector/mcp_server`, `vector/cloud_worker`, `vector/integrations`, `vector/docs`, `vector/schemas`

## Context

VECTOR has already been hardened across four major areas:

1. release contract and CI verification
2. local and remote MCP runtime paths
3. integration-status discipline
4. research memo plus evidence-first scoring

That work fixed the obvious reliability issues, but it also exposed a second-order architecture problem:

- VECTOR still behaves too much like a strong custom runtime plus disciplined docs, rather than a clearly modular productized MCP system
- research is more structured than before, but still not a true connector-driven evidence system
- persistent state is deterministic, but still snapshot-heavy and weak at longitudinal memory
- host integrations are documented and gated, but not yet organized around capability surfacing and installation ergonomics
- runtime policy drift was reduced by introducing `workflow_contract.ts`, but adjacent concerns are still spread across runtime, docs, schemas, and integration assets

The next architecture step must optimize for four things at once:

1. stronger modularity
2. stronger host safety and capability control
3. stronger research automation
4. stronger long-term strategic memory

This ADR consolidates the post-hardening direction into a single accepted architecture decision so implementation does not drift across parallel workstreams.

## Decision

VECTOR will evolve into a **capability-scoped, connector-driven, hybrid-memory MCP operating system for GTM execution**.

This means six binding decisions:

1. tool exposure will move from flat registration toward explicit capability groups
2. research will move from memo-first input capture toward provider-backed evidence acquisition
3. memory will move from snapshot-only toward snapshot-plus-graph
4. remote runtime will move from merely spec-compliant toward multi-session production-grade ownership and persistence
5. installation will move from adapter-doc-first toward productized setup with self-test and host rules
6. registry metadata will become first-class so VECTOR can be distributed as a verifiable MCP server product

These are not optional experiments. They are the accepted direction for the next architecture cycle.

## Why This Direction

### Why capability-scoped runtime

VECTOR currently exposes a broad surface area. That is convenient during development, but weak for:

- host-specific UX
- least-privilege operation
- audit-only use cases
- integration reliability

Comparable MCP systems such as GitHub MCP separate tools into coherent capability bundles and support more dynamic discovery patterns. VECTOR needs the same discipline to scale cleanly across hosts and usage modes.

### Why connector-driven research

VECTOR's current evidence model is structurally sound, but the runtime still relies too heavily on manually supplied evidence. Research should be orchestrated by VECTOR, not merely recorded by VECTOR. That requires explicit provider boundaries for search, crawl, extraction, browser sessions, and deep research jobs.

### Why hybrid memory

`vector_state.json` is good at deterministic execution, rollback, and auditing one active working state. It is not sufficient for:

- comparing thesis revisions over time
- tracking competitor changes longitudinally
- understanding recurring venue failures
- linking signal observations across cycles

A graph memory layer complements the snapshot without replacing it.

### Why stronger remote runtime

The current remote path is far better than the old prototype, but the next bottleneck is not transport choice. The bottleneck is production session ownership, persistence semantics, and multi-instance behavior.

### Why productized install

Docs-only integrations do not create reliable adoption. VECTOR must ship installation assets that reduce ambiguity and encode the intended tool invocation behavior for each host.

### Why registry metadata

If VECTOR is meant to act like a real MCP product, metadata publication is part of the architecture, not a marketing afterthought.

## Architecture Invariants

The following rules are mandatory after this ADR:

1. The shell must never become the source of truth.
2. Runtime mutation must always remain auditable.
3. Fresh evidence must override stale heuristics.
4. Capability exposure must be explicit, not accidental.
5. Snapshot state remains the deterministic execution core.
6. Graph memory must not become a backdoor around workflow gates.
7. Remote state ownership must be safe under retries and concurrent sessions.
8. Host integration claims must not exceed verified behavior.

## Binding Workstreams

## WS1: Capability System

### Decision

VECTOR will introduce first-class capability groups, also referred to as toolsets.

### Capability groups

The initial grouping is:

- `core`
  - `vector_intake`
  - `vector_icp_jtbd`
  - `vector_market_terrain`
  - `vector_channel_score`
  - `vector_thesis`
  - `vector_venue`
  - `vector_signal_review`
  - `vector_state_snapshot`
- `research`
  - `vector_source_capture`
  - `vector_competitor_map`
  - `vector_channel_evidence`
  - `vector_research_memo`
  - future provider-backed research tools
- `strategy`
  - `vector_venue_score`
  - `vector_route_context`
  - `vector_strategy_map`
  - `vector_sync_kb`
- `copy`
  - `vector_sales_copy`
  - `vector_render_media`
- `admin`
  - `vector_update_state`
  - `vector_undo`

### Required behavior

1. runtime must be able to list available toolsets
2. runtime must be able to list tools inside a toolset
3. runtime must be able to start in a restricted toolset mode
4. runtime must support `safe_mode`
5. `safe_mode` must disable all mutating admin operations
6. future hosts may request only a subset of toolsets

### Rationale

This reduces risk and lets the same runtime serve:

- audit hosts
- research hosts
- copy-generation hosts
- full GTM operator hosts

### Implementation notes

- `workflow_contract.ts` remains the source of workflow law
- a new capability contract will sit beside it
- tool registration must reference both workflow policy and capability policy

## WS2: Research Connector Architecture

### Decision

VECTOR will not expand into an all-in-one crawler/browser/search engine. Instead, it will define a provider boundary and orchestrate external or pluggable research providers.

### Required provider interfaces

- `search`
- `crawl`
- `extract`
- `browser_session`
- `deep_research_job`

### Required data flow

1. provider returns raw source payload
2. VECTOR normalizes it into evidence items
3. evidence items enter provenance-aware storage
4. observations are derived from evidence
5. channel or venue scoring consumes observations

### Required controls

- source whitelisting
- freshness defaults by source type
- max results / budget caps
- observed vs inferred labeling
- confidence separation from raw evidence strength

### Rationale

This keeps VECTOR opinionated at the GTM layer while remaining replaceable at the retrieval layer.

### Implementation notes

- `vector_source_capture` becomes the normalization seam
- `vector_research_memo` becomes a synthesis artifact, not the only research entry point
- scoring must stay evidence-first once fresh evidence exists

## WS3: Hybrid Memory Layer

### Decision

VECTOR will preserve the current snapshot state model and add a graph-oriented strategic memory layer.

### Snapshot remains authoritative for

- active phase
- active artifact chain
- request idempotency
- rollback and recovery
- current execution context

### Graph memory will store

- ICP entities
- competitor and substitute entities
- channel entities
- venue entities
- thesis revisions
- signal observations
- experiment relationships
- trust-signal expectations

### Mandatory rule

Graph memory is advisory and historical. It must not directly override active workflow state.

### Rationale

This preserves deterministic runtime behavior while enabling long-range reasoning.

### Implementation notes

- graph edges should be typed
- graph queries must return provenance
- every graph write must trace back to snapshot state or captured evidence

## WS4: Production Remote Runtime

### Decision

VECTOR remote runtime will be upgraded from transport-valid to production-safe.

### Required behavior

1. session ownership must be explicit
2. retry semantics must remain idempotent
3. multi-session isolation must be enforced
4. persistent backend semantics must be documented and tested
5. remote smoke tests must cover at least one mutating path and one read path

### Rationale

Transport compliance alone does not make a reliable remote MCP service.

### Implementation notes

- auth and session boundary should stay outside core workflow law
- local and remote transports must continue to share one runtime core
- state-store semantics must be documented as part of the contract

## WS5: Productized Install

### Decision

VECTOR will ship installation as a product workflow, not only as markdown instructions.

### Required assets

- one-command installer
- host-specific rules or agent instructions
- post-install self-test
- host verification checklist

### Required host coverage

Priority order:

1. Cursor
2. Cline
3. Windsurf
4. GitHub Copilot
5. Claude
6. Codex

Secondary:

- OpenHands
- Replit
- Antigravity
- Manus

### Rationale

Integration friction is architecture debt. If installation is ambiguous, capability design and workflow quality will be underused.

## WS6: Registry Metadata

### Decision

VECTOR will publish machine-readable server metadata suitable for MCP registry ecosystems and downstream marketplaces.

### Required metadata

- package identity
- install instructions
- transport information
- auth expectations
- capability summary
- host compatibility notes

### Rationale

Discoverability and authenticity are part of operational architecture once the product is intended for external host consumption.

## Non-Goals

This ADR does not approve the following:

1. building a monolithic proprietary search engine inside VECTOR
2. replacing snapshot state with graph-only memory
3. allowing graph memory to rewrite active phase state automatically
4. exposing all tools by default to all hosts forever
5. marking adapters as verified without smoke evidence
6. treating docs as sufficient proof of integration quality

## Rejected Alternatives

### Alternative A: Keep current architecture and only add more tools

Rejected because this increases surface area without solving capability control, research acquisition, or long-term memory.

### Alternative B: Move all orchestration into prompts and keep runtime minimal

Rejected because this recreates the exact drift problem already observed between docs and runtime.

### Alternative C: Replace snapshot state with graph memory entirely

Rejected because deterministic execution, rollback, and idempotent retries are easier with the current snapshot model.

### Alternative D: Build one huge research subsystem directly into runtime

Rejected because provider boundaries are cleaner, easier to audit, and easier to swap.

## Implementation Order

The approved order is:

1. WS1 capability system
2. WS2 research connector architecture
3. WS3 hybrid memory layer
4. WS4 production remote runtime
5. WS5 productized install
6. WS6 registry metadata

This order is binding unless a later technical blocker is discovered.

## Acceptance Criteria

### WS1 complete when

- toolsets are discoverable at runtime
- runtime can start in restricted capability mode
- `safe_mode` blocks mutating admin paths
- tests verify tool exposure by capability

### WS2 complete when

- at least one provider-backed search path works end-to-end
- evidence provenance remains structured
- scoring consumes provider-generated observations
- tests prove evidence-first behavior with fresh inputs

### WS3 complete when

- graph writes are possible for thesis, competitors, channels, venues, and signals
- graph queries return provenance-linked results
- snapshot state remains unchanged as the execution authority

### WS4 complete when

- remote smoke tests pass
- session isolation is verified
- concurrent mutation semantics are documented and tested

### WS5 complete when

- installer runs successfully
- at least one host self-test passes end-to-end
- host instructions are generated from maintained assets, not ad hoc docs

### WS6 complete when

- registry metadata exists
- metadata matches actual runtime behavior
- package/install metadata is verifiable during release-check

## Risks

### Risk 1: Over-modularization

Too many layers can slow development.

Mitigation:

- keep contracts small
- keep runtime core authoritative
- avoid speculative abstractions without a test need

### Risk 2: Provider sprawl

Too many research providers can fragment behavior.

Mitigation:

- one normalized provider interface
- one evidence model
- one scoring contract

### Risk 3: Graph memory semantic drift

Graph data can become inconsistent with active state.

Mitigation:

- snapshot remains authoritative
- graph writes require provenance
- reconciliation rules must be explicit

### Risk 4: Host-specific fragmentation

One host may require special behavior that weakens the common runtime.

Mitigation:

- put host variance in install/config/rules, not workflow law

## Operational Consequences

After this ADR:

- new tool registration must declare capability scope
- new workflow features must not bypass `workflow_contract.ts`
- new research features must fit the provider-normalize-evidence pipeline
- new long-term memory features must not override snapshot state directly
- new host integration claims must remain below or equal to verified status

## References

- [Architecture Spec](/home/ybao/B.1/VECTOR/vector/docs/ARCHITECTURE_SPEC.md)
- [Decision Policy](/home/ybao/B.1/VECTOR/vector/docs/DECISION_POLICY.md)
- [Reference Workflows](/home/ybao/B.1/VECTOR/vector/docs/REFERENCE_WORKFLOWS.md)
- [Runtime Contract](/home/ybao/B.1/VECTOR/vector/schemas/runtime_contract.yaml)
- [Workflow Contract](/home/ybao/B.1/VECTOR/vector/mcp_server/workflow_contract.ts)
