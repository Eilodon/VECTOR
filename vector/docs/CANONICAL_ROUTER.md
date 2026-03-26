# Canonical Router

## Purpose
Choose the lightest correct route for the current situation without skipping the data required to make the next decision.

## Canonical routing order
1. Identify persona.
2. Identify platform.
3. Load KB or create a fresh session snapshot.
4. Determine current phase.
5. Select mode.
6. Emit the next artifact.
7. Sync the decision back into the KB.

## Persona → default mode

| Persona | Default mode | Primary focus |
|---|---|---|
| prelaunch_builder | quick_start | discovery, ICP, first signal |
| active_founder | full_mode | channel selection, thesis, signal |
| scaling_team | full_mode | systemization, multiplier, repeatability |
| audit_user | audit_mode | improve VECTOR itself |

## Situation → route

| Situation | Route | Why |
|---|---|---|
| no product context | quick_start | gather the minimum required inputs only |
| live product, uncertain ICP | research_mode | evidence first |
| product + locked ICP + weak signal | recovery_mode | repair drift |
| locked thesis, need copy | copy_mode | preserve strategy, change wording only |
| audit of VECTOR itself | audit_mode | inspect contracts and drift |
| enough context for deep work | full_mode | run the full loop |

## Escalation logic
Escalate to recovery when any of these are true:
- repeated drift appears
- the same channel fails twice in a row
- the respondent quality does not match the ICP
- the channel benchmark is below threshold
- the trust signal is missing

## De-escalation logic
Use quick_start again when:
- the current goal is only to restart momentum
- the state is fresh and the user needs a short path
- the next action is obvious and low-risk

## Output contract
Every routed turn should return:
- current mode
- current phase
- current artifact
- reason for route
- next action
- KB sync status

## Vietnamese note
Router càng rõ thì agent càng ít lãng phí vòng hỏi lại.

## v1.6 augmentation

### Two-pass routing
- Pass 1: identify the safest correct mode.
- Pass 2: identify the next artifact and the first correction path.

### Conflict rule
If two routes are plausible, choose the one that preserves evidence and reduces ambiguity first.

### Artifact routing reminder
The router should prefer artifacts that can be reused later:
- evidence tables
- decision memos
- scorecards
- message matrices
- experiment ledgers
- design briefs when the visual layer is the bottleneck
