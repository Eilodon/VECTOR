# VECTOR Release Freeze

This document defines the final hardening boundary for the current VECTOR release.

## What is frozen

- canonical schemas and phase order
- orchestrator routing rules
- knowledge-base structure
- MCP tool split between thesis and venue
- the single channel scoring rubric
- install prompts and platform instructions
- design support scope
- test and CI coverage

## What is still allowed

- bug fixes that preserve the current architecture
- dependency upgrades that do not change public behavior
- documentation corrections that remove ambiguity
- security fixes that reduce risk without changing the product model

## What is not allowed without a new version plan

- reintroducing duplicate templates or duplicate instruction sources
- merging thesis and venue back into one phase
- adding a second channel scoring system
- expanding the package into a new product category
- changing the package without updating tests and manifest together

## Freeze checklist

Before accepting a change, verify:

1. the schemas still remain the source of truth
2. the KB still contains one canonical YAML snapshot
3. the MCP runtime still exposes thesis and venue separately
4. the install prompts still list exact files in exact order
5. the tests still pass on a clean checkout
6. the manifest still matches the shipped file set

## Maintenance rule

If a change improves clarity without changing the architecture, it can ship.
If a change adds a new source of truth, a new phase gate, or a new rubric, it needs a new release plan.

## Vietnamese note

Đây là ranh giới chốt. Sau mốc này, chỉ sửa lỗi thật hoặc vá an toàn, không mở lại thiết kế nền tảng.
