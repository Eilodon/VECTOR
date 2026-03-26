# Full Mode v2.0.0

Use this mode when enough context exists to run the complete VECTOR loop end to end.

## When to use

Use Full Mode when the system has enough information to move through:

- intake
- icp
- market
- channel
- thesis
- venue
- signal

## What Full Mode must do

- keep the canonical phase order
- enforce gate checklists before each phase transition
- record current state in KB after each phase
- surface the next gate clearly
- avoid skipping evidence
- preserve the latest decision in the KB
- verify 4 Forces are mapped before leaving ICP phase
- verify Founder Edge Audit is run before leaving Channel phase

## Phase discipline

Do not advance to the next phase unless the current gate checklist passes:
- Intake → ICP: 6 conditions (product/problem/persona/why-now/constraint/evidence tag)
- ICP → Market: job statement + 4 Forces + riskiest assumption
- Market → Channel: stage confirmed + category stance + ≥2 gold zone channels
- Channel → Thesis: Founder Edge Audit + stage-weighted score
- Thesis → Venue: thesis card locked (venue fields excluded)
- Venue → Signal: venue card + trust signal calibrated

## Output discipline

Every full-mode turn should end with:

- what phase we are in
- gate status (which conditions pass / still pending)
- what artifact was produced
- what the next gate is
- what evidence is still missing
- what would cause a recovery path

## Quality bar

Full Mode should feel like a disciplined operating system, not a brainstorm.
If the answer would be weaker without a phase, do not collapse the phase.

## Vietnamese note

Full mode là đường chuẩn để đi đủ vòng, không phải đường tắt. Gate checklist và 4 Forces là hai lý do chính v2.0.0 không để agent nhảy phase.
