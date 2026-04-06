# Contributing to VECTOR

## Quick Start

```bash
pnpm install --frozen-lockfile
pnpm --dir vector/mcp_server install --frozen-lockfile
pnpm --dir vector/mcp_server run build
```

## Before Every PR

```bash
pnpm run release-check   # typecheck + build + all tests
```

## Module Architecture (vector/mcp_server/)

| File | Responsibility |
|------|---------------|
| core_schemas.ts | All Zod schemas and types |
| core_state_runtime.ts | commitState, loadState, syncCanonicalViews |
| core_idempotency.ts | request registry, LRU eviction, tool queue |
| core_guard_helpers.ts | sanitizeRecursive, phase guards |
| core_workflow_helpers.ts | Phase transitions, scoring, validation |
| core_workflow_tools.ts | Intake → signal tool handlers |
| core_research_tools.ts | Research provider tools |
| core_copy_tools.ts | Sales copy and review tools |
| core_admin_tools.ts | update_state, undo, snapshot |
| core_graph_tools.ts | Graph memory operations |
| core_tool_registration.ts | Tool registration with MCP server |
| core_state_defaults.ts | Default state factories |
| core_founder_edge_helpers.ts | Founder edge scoring |

## Adding a New Tool

1. Register in `capability_contract.ts` (toolset + mutates_state)
2. Add `entry_phases` to `workflow_contract.ts` tools map
3. Implement handler in appropriate `core_*_tools.ts` module
4. Call `registerVectorTool()` at module load
5. Add e2e test in `tests/`

## Auth Notes

Remote auth secrets must use `wrangler secret put`, not `[vars]`.
See `vector/docs/AUTH_COMMUNITY_VNEXT_PLAN.md` for the OAuth roadmap.

## Security Guidelines

- Never commit secrets to `.env` or config files
- Use `sanitizeRecursive()` on all user inputs
- Validate phase transitions before state changes
- Preserve corrupt files with `.corrupt_` suffix for forensics

## Error Codes

When adding new error conditions, use `VectorError` with appropriate codes:

```typescript
throw new VectorError(
  "PHASE_GUARD_FAILED",
  `Current phase '${phase}' not in allowed: ${allowed.join(", ")}`,
  { currentPhase: phase, allowedPhases: allowed }
);
```

## Testing

```bash
# Run all tests
pnpm run test

# Run specific test
node --test tests/runtime_retention.test.mjs
```

## Code Style

- Use TypeScript strict mode
- Prefer `async/await` over callbacks
- Use `unknown` instead of `any` where possible
- Add JSDoc for public functions

## Questions?

Open an issue or check `vector/docs/adr/` for architectural decisions.
