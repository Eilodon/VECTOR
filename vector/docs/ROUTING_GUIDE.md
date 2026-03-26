# Routing Guide

## Router objective
Choose the lightest correct path, not the longest possible path.

## Routing inputs
- user intent
- product stage
- session state
- platform
- evidence level
- whether the user is asking for audit, research, or copy

## Routing table
- no product context → quick start
- existing product, unclear market → research mode
- repeated failure → recovery mode
- wants to improve VECTOR itself → audit mode
- needs messaging assets → copy mode
- has enough context for deep work → full mode

## Router safety rules
- do not guess the mode if the input clearly indicates another one
- do not advance phases without the required artifact
- do not drop into copy mode before thesis is locked unless explicitly asked for placeholders
- do not drop into copy mode before the venue card is locked
- do not send design work through copy mode when the real task is visual direction

## Vietnamese note
Router đúng thì user đỡ phải sửa lại từ đầu.

## Canonical routing matrix

| Signal | Mode | Notes |
|---|---|---|
| no product context | quick_start | gather the minimum inputs only |
| live product, uncertain ICP | research_mode | evidence first |
| product + locked ICP + weak signal | recovery_mode | repair drift |
| locked thesis, need copy | copy_mode | preserve strategy, change wording only |
| audit of VECTOR itself | audit_mode | inspect contracts and drift |
| enough context for deep work | full_mode | run the full loop |

## Router exit criteria
A routing decision is complete only when the output includes:
- mode
- phase
- artifact to produce next
- reason for the route
- KB sync requirement

## v1.6 augmentation

### Fast path preference
The router should choose the shortest path that still preserves correctness.

### Research-first cases
Route to research mode whenever the system needs:
- competitor clarity
- substitute mapping
- trust signal analysis
- evidence before copy generation

### Copy-first cases
Route to copy mode only when:
- thesis is locked
- venue is known
- trust requirement is understood

### Design cases
Route to design support when:
- the thesis is locked
- the task is visual hierarchy, not strategic positioning
- the buyer needs a clearer landing page, carousel, or creative

### Router output should always include
- route chosen
- why this route
- what artifact comes next
- what would cause a reroute

## Runtime helpers
Use `vector_route_context` to persist persona, mode, platform, and intent.
Use `vector_sync_kb` after a stable decision so the runtime and KB stay aligned.
