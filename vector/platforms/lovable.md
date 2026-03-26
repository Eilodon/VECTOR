# Lovable Adapter

## Best surface

Lovable is best treated as a knowledge-first agent surface rather than a native skill-folder platform.

## Recommended setup

- Put shared rules in workspace knowledge.
- Put project-specific context in project knowledge.
- Keep the VECTOR state in a plain text artifact.
- Keep instructions short and stable.

## VECTOR mapping

- Orchestrator → persistent instruction block
- Skills → sectioned knowledge blocks or reusable prompt snippets
- KB → project knowledge or linked doc

## Vietnamese note

Lovable hợp kiểu lưu luật trong knowledge thay vì cố ép vào skill folder.

## v1.6 Lovable notes

Lovable should use:
- compact instruction blocks
- persistent project knowledge
- a stable state artifact
- reusable prompt snippets for research and copy

### Install recommendation
- Use knowledge blocks for the canonical VECTOR rules.
- Store the KB in a plain text artifact.
- Keep the prompt pack small and action-oriented.
- Move detailed policy into linked docs when possible.

### Failure mode to avoid
Do not force folder-based skills where the surface is knowledge-first.

## v1.6 adapter notes

### Best practice
- load canonical schemas before phase prompts
- keep the KB as the stable memory anchor
- preserve artifact history across turns
- route research before copy when evidence is missing
- route copy only after thesis and venue are locked

### Skill registry note
If the platform supports reusable skill folders or modules, keep related skills together and preserve a clear load order.
