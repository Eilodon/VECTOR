# VECTOR MCP Server

This folder contains the executable VECTOR runtime.

## What it does

- loads the durable VECTOR state through a shared core runtime
- exposes the main GTM steps as typed MCP tools
- keeps thesis and venue as separate gates
- returns structured artifacts instead of loose prose
- supports both `stdio` and remote `streamable-http` transports from the same tool registry
- accepts optional `request_id` on every tool for idempotent retries
- honors capability scoping through `VECTOR_TOOLSETS` and `VECTOR_SAFE_MODE`

## Install

```bash
pnpm install --frozen-lockfile
```

## Verify

```bash
pnpm run typecheck
pnpm run build
```

From the repo root, you can also run product-facing self-tests:

```bash
pnpm run selftest -- --mode local
pnpm run selftest -- --host cursor
```

## Run

```bash
pnpm start
```

## Safety notes

- The server rejects obvious prompt-injection phrases.
- The state snapshot is written back after each meaningful tool call.
- The runtime is designed to be deterministic and auditable.
- State commits are serialized through a commit queue instead of an in-memory boolean lock.
- Automatic backups support `vector_undo` across local files and remote durable-object storage.

## Tool map

- `vector_intake`
- `vector_icp_jtbd`
- `vector_market_terrain`
- `vector_research_memo`
- `vector_channel_score`
- `vector_venue_score`
- `vector_route_context`
- `vector_strategy_map`
- `vector_sync_kb`
- `vector_thesis`
- `vector_venue`
- `vector_signal_review`
- `vector_sales_copy`
- `vector_update_state`
- `vector_state_snapshot`
- `vector_render_media`

## Vietnamese note

MCP server là phần thực thi. Nó không thay thế schema, nó tuân theo schema.
