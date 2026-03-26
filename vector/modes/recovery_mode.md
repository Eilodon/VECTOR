# Recovery Mode v2.0.0

Use this mode when the evidence contradicts the thesis, the channel is drifting, or the system needs to repair a broken assumption.

## When to use

Use Recovery Mode when you see:

- repeated drift
- weak or wrong ICP responses
- channel failure after reasonable iteration
- venue friction that blocks conversion
- a missing artifact that stops progress

## Recovery objective

Recovery does not mean “start over.”
It means:
- isolate the failure
- preserve what still works
- change the smallest thing that can plausibly restore signal

## Recovery workflow

1. **Name the drift type** (required before routing):
   - `wrong_icp` → return to ICP phase
   - `wrong_channel` → re-score remaining gold zone candidates
   - `wrong_angle` → rewrite angle in thesis, keep channel
   - `wrong_venue` → re-run venue phase
   - `weak_trust_signal` → audit trust signal + entry offer
   - `too_much_scope` → shrink entry offer to smallest proof unit
   - `too_much_noise` → move to lower-density channel
2. Identify the last trusted gate (where gates.X = true AND required fields are non-null).
3. Split fact from interpretation — what actually happened vs. what we assumed.
4. Choose the smallest correction that explains the drift.
5. Write correction into the recovery_log (KB).
6. Return to the correct phase (drift_type determines which phase — see decision_policy.yaml).

## Guardrails

- Do not add more channels just because the first one is weak.
- Do not widen the ICP to hide a bad fit.
- Do not change the offer before checking whether the venue is the real problem.
- Do not continue scaling a broken loop.

## Good recovery output

A good recovery memo includes:

- what failed
- what probably caused it
- what we are keeping
- what we are changing
- what we will test next

## Vietnamese note

Recovery là sửa cái hỏng nhỏ nhất trước, không phải bịa ra một kế hoạch mới thật lớn.
