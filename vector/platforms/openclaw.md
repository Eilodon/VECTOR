# OpenClaw Adapter

## Best surface

OpenClaw is a strong match for file-system-based skills with explicit precedence and config gating.

## Supported locations

- `<workspace>/skills`
- `~/.openclaw/skills`
- bundled skills

## Why it matters

OpenClaw is useful because it has a predictable load order and can gate skills based on environment, config, and binary presence.

## VECTOR mapping

- Orchestrator → top-level skill or workflow skill
- Skills → folder-based phase skills
- KB → repo or workspace state snapshot
- Config → optional gating for enabled environments

## Vietnamese note

OpenClaw hợp với bộ skill phải “chuẩn file-system” và có kiểm tra điều kiện load rõ ràng.

## v1.6 OpenClaw notes

OpenClaw should be treated as a precedence-aware file system for VECTOR.

### Install recommendation
- Keep the canonical skills in a predictable folder tree.
- Place the KB in the workspace root or a stable attached file.
- Gate optional modules through config rather than hardwiring them.
- Keep load order explicit so the same instruction wins every time.

### Failure mode to avoid
Avoid ambiguous priority between workspace and user-level skill folders.

## v1.6 adapter notes

### Best practice
- load canonical schemas before phase prompts
- keep the KB as the stable memory anchor
- preserve artifact history across turns
- route research before copy when evidence is missing
- route copy only after thesis and venue are locked

### Skill registry note
If the platform supports reusable skill folders or modules, keep related skills together and preserve a clear load order.
