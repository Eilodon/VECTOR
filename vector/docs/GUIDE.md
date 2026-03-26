# VECTOR Suite — Guide

Read this first.

## Purpose

VECTOR is a distribution framework that helps builders avoid the most common failure mode:

> building more features when the real bottleneck is channel choice, ICP clarity, or venue fit.

VECTOR exists to answer five questions:

1. Who is the exact target user?
2. What job are they hiring the product for?
3. Where is that user already active?
4. Which channel has the best signal-to-effort ratio right now?
5. What should be tested, measured, and locked next?

## Design principles

- **English-first**. English is the source language for structure and rules.
- **Vietnamese support notes only**. Use Vietnamese for short clarifications, not duplicated logic.
- **Machine-readable before beautiful**. A schema is preferred over prose when the two conflict.
- **One source of truth per concept**. Avoid repeating the same rule in multiple files.
- **Phase gates matter**. Do not skip ICP, terrain, channel scoring, thesis, or venue.
- **Signals beat opinions**. Every claim should tie back to a signal, benchmark, or explicit hypothesis.
- **Recovery is normal**. If the data says the channel is wrong, pivot quickly.

## Package structure

```text
vector/
├── orchestrator/SKILL.md
├── kb/KNOWLEDGE_BASE.md
├── schemas/
├── modes/
├── examples/
├── skills/
├── platforms/
├── prompts/
└── docs/
```

## Operating model

VECTOR runs in a loop:

1. **Intake** — collect the minimum viable context.
2. **ICP/JTBD** — define the actual user and the job.
3. **Market terrain** — map competitors and channel presence.
4. **Channel scoring** — compare channels by fit, effort, and signal quality.
5. **Thesis** — choose the primary channel and a growth multiplier.
6. **Venue + product architecture** — choose where and how the offer is sold.
7. **Signal loop** — watch outcomes, classify them, and decide whether to stay or pivot.

## What the agent should never do

- Never recommend scaling before the first signal is real.
- Never treat “everyone” as a viable ICP.
- Never confuse raw activity with traction.
- Never keep testing the same channel forever when the benchmark is clearly poor.
- Never overwrite the KB without updating confidence and next actions.

## Output contract

Whenever VECTOR completes a phase, it should emit:

- the current phase
- the current hypothesis
- the key evidence observed
- the decision made
- the next action
- the confidence level

## Vietnamese note

Dùng bộ này như một system vận hành phân phối, không phải chỉ là bộ prompt đẹp. Càng giữ schema chặt, agent càng ít bịa.

## v1.6 operating standard

VECTOR now prefers a simple control loop:

1. Determine persona and intent.
2. Choose mode.
3. Load state.
4. Run the next phase.
5. Emit artifact.
6. Update KB.
7. Route to the next action.

## Install-first principle

If the platform is not correctly set up, do not compensate by making the prompt more complicated.
Fix the install path, the instruction path, or the state path first.

## Artifact-first principle

Every phase should leave behind something reusable:
- a card
- a memo
- a scorecard
- a playbook
- a ledger entry
- a copy pack

If no artifact exists, the phase is not finished.

## Fast-path rule

If the user already has:
- a clear product
- a narrow ICP
- a live distribution motion

then VECTOR should skip discovery-heavy behavior and move directly to scoring, thesis, and signal tracking.

## Recovery rule

If there are repeated failed attempts, VECTOR should stop adding channels and instead:
- tighten the ICP
- re-check the angle
- re-evaluate trust signal
- simplify the offer
- reset the benchmark

## Vietnamese note

Mục tiêu của bản này là biến VECTOR thành workflow có thể cài, chạy, và audit được.

## v1.6 applied usage flow

### Recommended start
1. Load the canonical schema.
2. Identify persona and platform.
3. Restore or create KB state.
4. Choose the shortest correct mode.
5. Emit the first reusable artifact.
6. Sync the decision back into the KB.

### Research-to-copy path
Use research mode first when the user needs evidence.
Use copy mode only after the thesis and venue are locked and the runtime has passed through the venue gate.
