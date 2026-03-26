# Platform Matrix

This file maps VECTOR to each supported surface.

## Core idea

Not every platform has the same abstraction.
Some support native skills, some support rules/modes, some support project knowledge, and some use a mix.
VECTOR should therefore ship as a **portable framework** with platform-specific adapters.

## Matrix

| Platform | Best surface | Skill / instruction model | Notes |
|---|---|---|---|
| Claude.ai Projects | Project knowledge + project instructions | Persistent workspace context | Good for grounding and long-running strategy chats |
| Claude Code | Subagents + settings + repo instructions | `.claude/agents/`, `.claude/settings.json`, CLAUDE.md-style guidance | Best for repo-local execution workflows |
| Cursor | Rules + custom modes + skills | `.cursor/rules`, `.cursor/skills`, `.agents/skills` | Great for agentic coding workflows |
| Windsurf | Skills + Cascade | `.windsurf/skills`, `~/.codeium/windsurf/skills`, `.agents/skills` | Progressive disclosure works well for multi-step tasks |
| Codex | App skills + repo context + worktrees | Codex app and connected repo | Best when the user wants parallel agent work and reviewable changes |
| GitHub Copilot | Coding agent + MCP config | repository instructions + MCP tool config | Strong fit for reviewable repo-native workflows |
| Cline | MCP + CLI/editor agent | MCP servers + editor workflow | Strong fit for tool-heavy autonomous workflows |
| OpenHands | Headless agent + MCP | hosted or local agent runner | Strong fit for open-source automation and remote execution |
| Replit | Hosted agent workspace | app workspace + agent flows | Best for low-friction builder workflows and fast prototypes |
| Antigravity | Agent-first development environment | integrated editor, terminal, browser | Promising fit for multi-surface agent execution, still earlier than mature MCP hosts |
| Manus | Uploadable skills and slash activation | Folder / `.skill` / `.zip` skill library | Good for modular workflows and community skills |
| OpenClaw | AgentSkills-compatible folders | `<workspace>/skills`, `~/.openclaw/skills` | Strong precedence and config gating model |
| Lovable | Workspace knowledge + project knowledge | Plain-text persistent instructions | Best for project context and coding standards, not skill folders |

## Skill-aware chatbot group

Some surfaces behave like chatbots but support reusable skills or persistent instructions:

- Claude.ai Projects
- Claude Code
- Manus
- OpenClaw
- Codex app
- Lovable
- Windsurf Cascade
- Cursor Agent / Custom modes

## Recommended adapter strategy

- Keep the canonical VECTOR engine in portable markdown.
- For native skill platforms, map the engine to `SKILL.md` or equivalent.
- For knowledge-only platforms, map the engine to persistent project knowledge plus a compact instruction pack.
- For rule-based platforms, map the engine to rules + mode instructions.
- Track the real adapter maturity in `vector/docs/INTEGRATION_STATUS.md`.
- Keep smoke-test recipes in `vector/docs/INTEGRATION_SMOKE_TESTS.md` and do not infer maturity from docs alone.
- Keep host-specific config fixtures under `vector/integrations/` so install paths stay reviewable.

## Vietnamese note

Đừng cố ép tất cả nền tảng dùng cùng một cách cài đặt. Hãy giữ cùng một “brain”, nhưng đổi “shell” theo platform.

## v1.6 platform deployment guidance

### Load order
1. Core state and decision schemas
2. Orchestrator instruction
3. Platform adapter
4. Relevant skill files
5. KB snapshot
6. Example artifacts

### Platform-specific emphasis

- **Claude.ai Projects**: best for long-context planning, KB-based continuity, and research-heavy sessions.
- **Claude Code**: best for repo-local execution, task decomposition, and reviewable file edits.
- **Cursor**: best for rules + custom modes + codebase-aware workflows.
- **Windsurf**: best for progressive disclosure and folder-based skills.
- **Codex**: best for reviewable agent work, parallel tasks, and clean diffs.
- **Manus**: best for uploadable skill packs and slash-command style invocation.
- **OpenClaw**: best when precedence, config gating, and file-system skills matter.
- **Lovable**: best when you want knowledge-first persistent instructions and compact workflows.

### Adapter quality checklist
A surface is good for VECTOR only if it can do most of these:
- persist a session state
- load reusable instructions
- keep the KB stable
- invoke skills or equivalent modules
- produce reviewable outputs

### Vietnamese note
Platform nào lưu được state và load được skill thì mới đáng gọi là surface tốt cho VECTOR.

## v1.6 adapter heuristic

A platform is especially good for VECTOR when it can:
- persist a stable KB or equivalent memory
- load reusable instructions in a predictable order
- support modular skill files or prompt packs
- produce reviewable outputs or diffs
- retain artifact history across turns
