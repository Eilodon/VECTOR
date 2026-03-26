# Tests

This folder contains lightweight checks that protect the VECTOR package from regressions.

## What is covered

- manifest and version consistency
- registry metadata truth
- canonical doc structure
- build/typecheck sanity for the MCP server
- host installer and self-test sanity
- freeze-gate checks for legacy or duplicate instructions

## How to run

```bash
node --test tests/*.mjs
```
