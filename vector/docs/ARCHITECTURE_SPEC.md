# Architecture Spec

VECTOR is organized as a layered automation system.

## Layer 1 — Canonical contracts
- state schema
- decision policy
- phase schema
- artifact contracts
- persona routing
- platform install

## Layer 2 — Orchestration
The orchestrator decides:
- phase
- mode
- fallback
- next artifact
- confidence updates

## Layer 3 — Skills
Skills are modular execution units:
- ICP
- market
- channel
- thesis
- venue
- signal
- research
- sales copy

## Layer 4 — Persistent memory
The KB stores:
- validated hypotheses
- current decisions
- failures and recovery notes
- platform-specific context
- experiment history

## Layer 5 — Surface adapters
Platform adapters translate the same brain into different shells.

## Design invariant
Never let the shell become the source of truth.
