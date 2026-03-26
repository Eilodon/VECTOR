# Claude Adapter

## Claude.ai Projects

Use Project knowledge and project instructions as the persistent context layer.
This is the best fit when VECTOR is being used as a strategy workspace rather than a code-execution environment.

### Recommended setup

- Put business context, notes, and uploaded files in Project knowledge.
- Put English-first VECTOR instructions in the project instructions.
- Keep the KB snapshot as a file or pasted block inside the project.

## Claude Code

Use repo-local instructions and subagents for reusable workflows.

### Recommended setup

- `~/.claude/settings.json` for user-level configuration
- `.claude/settings.json` for project-level configuration
- `.claude/agents/` for project subagents
- `~/.claude/agents/` for user subagents

## How VECTOR maps here

- Orchestrator → repo instructions / main chat prompt
- Skills → subagents or reusable markdown instruction files
- KB → persistent snapshot in repo or project memory

## Notes

Claude.ai Projects are for grounded context.
Claude Code is for execution-oriented workflows.

## Vietnamese note

Claude là nơi tốt để giữ context dài. Nhưng nếu muốn chạy workflow kiểu repo, Claude Code phù hợp hơn.

## v1.6 Claude notes

Claude works best when the project has:
- a stable KB file
- a short instruction block
- a clearly named artifact convention
- explicit “what to do next” requests

### Install recommendation
- Put VECTOR in Project knowledge.
- Put the orchestrator in project instructions.
- Keep the KB as a single file and update it after each major decision.
- Use the research and copy skills as separate reusable blocks when needed.

### Failure mode to avoid
Do not put too many competing instruction blocks in the same project; Claude performs better with a canonical hierarchy.

## v1.6 adapter notes

### Best practice
- load canonical schemas before phase prompts
- keep the KB as the stable memory anchor
- preserve artifact history across turns
- route research before copy when evidence is missing
- route copy only after thesis and venue are locked

### Skill registry note
If the platform supports reusable skill folders or modules, keep related skills together and preserve a clear load order.
