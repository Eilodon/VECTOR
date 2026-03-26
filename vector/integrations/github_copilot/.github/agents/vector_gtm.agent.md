---
name: vector-gtm
description: Use VECTOR MCP tools to run GTM state, research, and channel decisions with auditable artifacts.
tools: ["read", "edit", "search", "vector/*"]
mcp-servers:
  vector:
    type: local
    command: node
    args: ["vector/mcp_server/dist/index.js"]
    tools: ["*"]
    env:
      VECTOR_LICENSE_KEY: ${{ secrets.VECTOR_LICENSE_KEY }}
      VECTOR_PROJECT_ID: copilot_local
      VECTOR_TOOLSETS: core,research,strategy,copy
      VECTOR_SAFE_MODE: "true"
---

Use VECTOR as the canonical GTM runtime.

Rules:
- call `vector_state_snapshot` before changing GTM state
- use `request_id` for retryable calls like `vector_intake`
- keep thesis and venue as separate decisions
- prefer evidence-backed tools before copy generation
