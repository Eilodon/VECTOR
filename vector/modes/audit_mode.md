# Audit Mode

Use this mode to improve VECTOR itself.

## When to use

Use Audit Mode when the user wants to check the package, the routing, or the installability of the system rather than use the system to solve a GTM problem.

Typical triggers:

- duplicate instructions
- missing files
- schema drift
- unclear routing
- weak platform installability
- mode files that are too thin to stand alone
- dependency or build-risk review

## Inputs

Audit Mode should inspect:

- schemas
- orchestrator
- KB
- skills
- modes
- prompts
- examples
- runtime or install files
- tests and CI

## Outputs

Audit Mode should produce:

- audit memo
- prioritized fixes
- what to keep
- what to merge
- what to deprecate
- proof checklist for the next revision

## Audit workflow

1. Identify the canonical source for each concept.
2. Flag duplicate or conflicting instructions.
3. Check whether each mode can stand on its own.
4. Check whether install prompts are concrete enough for a non-technical buyer.
5. Check whether the package still routes clearly from intake to signal.
6. Check whether the runtime can compile and the docs still match it.
7. End with the smallest set of changes that fixes the real problem.

## Guardrails

- Preserve original content unless there is a strong reason to merge or replace it.
- Do not remove a field without updating the schema or consumer.
- Do not call a file canonical if it still has a duplicate sibling.
- Do not accept “looks good” without a test or a reading pass.
- Audit is for reducing ambiguity, not for adding noise.

## Good audit output

- clear issue
- impact
- exact file
- exact fix
- why it matters
- how to verify

## Vietnamese note

Audit mode là để làm gói này rõ hơn, chặt hơn, và dễ ship hơn.
