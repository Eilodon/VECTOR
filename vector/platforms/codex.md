# Codex Adapter

## Best surface

Codex is best when VECTOR needs to operate as a software engineering agent with reviewable changes.

## Current shape

OpenAI’s Codex is available as a cloud agent and also through the Codex app and connected workflows.
The app emphasizes parallel work, worktrees, git-friendly review, automations, and skills support.

## Recommended setup

- Keep the VECTOR engine in the repo.
- Keep the KB as a normal file so changes are reviewable.
- Split long work into small tasks that can be audited.
- Use the app or connected workflow for parallel agent work.

## VECTOR mapping

- Orchestrator → task spec / repo instruction
- Skills → task-specific markdown modules
- KB → file that Codex can edit and commit back

## Vietnamese note

Codex phù hợp khi VECTOR trở thành một bộ công việc có thể review, commit, và chia task song song.

## v1.6 Codex notes

Codex works best when VECTOR is presented as reviewable work:
- one task spec at a time
- one artifact per phase
- minimal hidden context
- clear diffs and checkpoints

### Install recommendation
- Keep schemas and KB in the repo.
- Keep prompt packs as text files in version control.
- Split research and copy into separate tasks so review remains easy.
- Use the signal ledger to explain why the next branch exists.

### Failure mode to avoid
Avoid pushing the whole system as one giant task; Codex is strongest when the work is decomposed.

## v1.6 adapter notes

### Best practice
- load canonical schemas before phase prompts
- keep the KB as the stable memory anchor
- preserve artifact history across turns
- route research before copy when evidence is missing
- route copy only after thesis and venue are locked

### Skill registry note
If the platform supports reusable skill folders or modules, keep related skills together and preserve a clear load order.
