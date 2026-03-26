# Auto-Install Prompts

Use these prompts to install VECTOR into different surfaces.

## Universal install order

Load VECTOR in this order whenever the surface lets you choose file order:

1. canonical schemas
2. orchestrator
3. KB snapshot
4. skills
5. modes
6. examples
7. platform adapters
8. prompts
9. runtime or connector notes

That order matters because the schemas and orchestrator define the rules, while the rest of the package provides supporting context.

## Claude.ai Projects

1. Open Claude and create a new Project named `VECTOR`.
2. Upload the files in this order:
   1. `vector/schemas/state.yaml`
   2. `vector/schemas/phase_schema.yaml`
   3. `vector/schemas/decision_policy.yaml`
   4. `vector/schemas/session_contract.yaml`
   5. `vector/orchestrator/SKILL.md`
   6. `vector/kb/KNOWLEDGE_BASE.md`
   7. `vector/skills/icp/SKILL.md`
   8. `vector/skills/market/SKILL.md`
   9. `vector/skills/channel/SKILL.md`
   10. `vector/skills/thesis/SKILL.md`
   11. `vector/skills/venue/SKILL.md`
   12. `vector/skills/signal/SKILL.md`
   13. `vector/skills/design/SKILL.md`
   14. `vector/modes/quick_start.md`
   15. `vector/modes/full_mode.md`
   16. `vector/modes/recovery_mode.md`
   17. `vector/modes/audit_mode.md`
   18. `vector/modes/research_mode.md`
   19. `vector/modes/copy_mode.md`
   20. `vector/examples/good_outputs.md`
   21. `vector/examples/bad_outputs.md`
3. In the project instructions, tell Claude:
   - use the schemas as the source of truth
   - never skip a phase gate
   - never let copy rewrite strategy
   - keep the KB as the persistent session memory
4. After upload, paste the latest KB snapshot if one exists.

### Screenshot note

If you are showing this to a non-technical buyer, add one screenshot of the upload dialog and one screenshot of the final project setup screen.

## Cursor

1. Open the repository in Cursor.
2. Put the canonical schemas and orchestrator at the top of the workspace context.
3. Add the KB snapshot next.
4. Load the skills in this order: ICP → Market → Channel → Thesis → Venue → Signal → Design.
5. Load the mode files last.
6. Configure Cursor to call the MCP server instead of duplicating the GTM logic in rules.

### File note

If Cursor supports reusable rules, keep them short and route phase work to the MCP server or the canonical skills.

## Windsurf

1. Open the project in Windsurf.
2. Add the schemas and orchestrator as the first references.
3. Keep the KB as the shared memory anchor.
4. Load the skill files in the canonical phase order.
5. Keep the copy mode separate from the strategy phases.

## Manus / OpenClaw / Lovable / Codex

For these surfaces, use the same principle:

1. schemas first
2. orchestrator second
3. KB third
4. skills next
5. modes and examples last

### Plain-language buyer note

If the buyer is non-technical, tell them exactly which folder to upload and exactly which file to open next.
Do not say “upload the docs” without listing the docs.

## What a good install prompt must include

- exact file names
- exact order
- exact surface name
- where to paste the KB snapshot
- what to do if the platform asks for a project instruction field

## Vietnamese note

Prompt cài đặt phải chỉ rõ file nào, thứ tự nào, và làm ở đâu. Không nên nói mơ hồ kiểu “upload docs”.
