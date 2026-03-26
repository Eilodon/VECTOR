# Artifact Spec

Every VECTOR phase should output a durable artifact.

## Artifact classes
- Intake memo
- ICP card
- Market map
- Channel scorecard
- Thesis card
- Venue card
- Venue scorecard
- Signal ledger
- Research memo
- Copy pack
- Decision memo
- Strategy map

## Required properties
Each artifact should answer:
- what it is
- why it exists
- what evidence it uses
- what decision it supports
- what happens next

## Quality bar
A good artifact is:
- reusable
- reviewable
- versioned
- linked to the KB
- easy to compare against the previous version

## Vietnamese note
Artifact là dấu vết của quyết định, không phải chỉ là output cho vui.


## Shared artifact contract

Every artifact should also specify:
- owner
- version
- phase
- confidence
- source of truth
- next action

## Comparison rule
When an artifact is updated, the new version should make it easier to compare:
- what changed
- why it changed
- which signal caused the change

## v1.6 applied artifact extensions

### Decision memo
A decision memo should capture:
- the decision
- the evidence that drove it
- what was rejected
- how reversible it is
- what triggers a reversal

### Venue scorecard
A venue scorecard should capture:
- the candidate venues
- the trust requirement
- the relative fit by ICP and channel
- the selected venue
- the next validation test

### Research memo
A research memo should always end with:
- next experiment
- relevance to channel or venue
- the biggest unresolved unknown
- evidence provenance with observed-vs-inferred separation

### Copy pack
A copy pack should preserve the thesis and explain the test plan by venue.

### Strategy map
A strategy map should show:
- ICP
- channel
- venue
- signal loop
- recovery path
