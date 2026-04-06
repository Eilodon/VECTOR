# VECTOR v4 - Master Implementation Roadmap
## Post-VHEATM Audit Round 3 - Comprehensive Fix Strategy

**Generated:** 2026-04-06  
**Audit Confidence:** 98% (3 rounds of VHEATM validation)

---

## Executive Summary

### Issues Discovered (Total: 23)

| Category | Count | Waves |
|----------|-------|-------|
| State & Reliability | 5 | Wave 1 |
| Observability | 6 | Wave 2 |
| Auth & Security | 4 | Wave 3 |
| Tool Design | 3 | Wave 3 |
| Testing & CI | 3 | Wave 4 |
| DX & Docs | 2 | Wave 1 |

### Implementation Timeline
- **Wave 1:** 2-3 hours (Quick wins, immediate impact)
- **Wave 2:** 1-2 days (Observability overhaul)
- **Wave 3:** 1-2 days (Auth & Tool Design)
- **Wave 4:** 1 day (Testing & CI)
- **Total:** 3-5 working days

---

## Critical Path Analysis

### Dependencies Graph

```
Wave 1 (Foundation)
├── State Integrity (1.2) ──┐
│                           ├──> Wave 2 Telemetry (2.3)
└── Backup Pruning (1.1) ──┘

Wave 2 (Observability)
├── VectorError (2.2) ─────┐
│                          ├──> Wave 3 Rate Limiting (3.1)
└── Telemetry (2.3) ───────┘

Wave 3 (Security & Design)
├── Rate Limiting (3.1) ───┐
├── outputSchema (3.2) ────┤──> Independent
└── Remove dist/ (3.3) ────┘

Wave 4 (Testing) ────────────> Independent
```

---

## Wave 1: Foundation Fixes (2-3 hours)

### 1.1 Local Backup Pruning
**File:** `vector/mcp_server/index.ts`  
**Lines:** 74-78, +15 lines for prune function

#### Implementation
```typescript
const MAX_LOCAL_BACKUP_FILES = 25; // Match DO behavior

async function pruneBackups(): Promise<void> {
  const files = await readdir(RUNTIME_DIR);
  const backups = files
    .filter((f) => f.startsWith("vector_state.json.bkp_"))
    .sort()
    .slice(0, -MAX_LOCAL_BACKUP_FILES);
  
  for (const old of backups) {
    await rm(join(RUNTIME_DIR, old), { force: true });
  }
}

// In saveBackup():
await pruneBackups();
```

#### Test Requirements
- `runtime_retention.test.mjs`: Trigger 30 phase transitions
- Assert backup count ≤ 25
- Assert oldest backups removed first

---

### 1.2 State & Graph File Integrity
**Files:** `vector/mcp_server/index.ts`  
**Locations:** 
- State load: lines 60-66
- Graph load: lines 95-101  
- Backup restore: lines 79-92

#### Implementation Strategy

Create shared `core_file_utils.ts` module:

```typescript
export interface FileLoadResult<T> {
  success: true;
  data: T;
} | {
  success: false;
  error: 'corrupt' | 'missing' | 'unknown';
  message: string;
  preservedPath?: string;
}

export async function loadJsonFile<T>(
  path: string,
  options: {
    preserveCorrupt?: boolean;
    defaultValue?: T;
  } = {}
): Promise<FileLoadResult<T>> {
  try {
    if (!(await pathExists(path))) {
      return { success: false, error: 'missing', message: `File not found: ${path}` };
    }
    const raw = await readFile(path, "utf-8");
    return { success: true, data: JSON.parse(raw) as T };
  } catch (parseError) {
    if (parseError instanceof SyntaxError) {
      if (options.preserveCorrupt) {
        const preservedPath = `${path}.corrupt_${Date.now()}`;
        await rename(path, preservedPath).catch(() => {});
        return {
          success: false,
          error: 'corrupt',
          message: `File is corrupt and has been preserved at ${preservedPath}`,
          preservedPath
        };
      }
      return { success: false, error: 'corrupt', message: 'File is corrupt' };
    }
    return { success: false, error: 'unknown', message: String(parseError) };
  }
}
```

#### Update state store implementation
```typescript
const localStateStore: VectorStateStore = {
  async load() {
    const result = await loadJsonFile<Record<string, unknown>>(STATE_FILE, {
      preserveCorrupt: true
    });
    if (result.success) return result.data;
    if (result.error === 'missing') return null;
    if (result.error === 'corrupt') {
      throw new Error(
        `[VECTOR] State file is corrupt and cannot be parsed. ` +
        `Moved to ${result.preservedPath} for inspection. ` +
        `Restore from a .bkp_* file or start fresh.`
      );
    }
    throw new Error(`[VECTOR] Failed to load state: ${result.message}`);
  }
  // ... rest unchanged
};
```

#### Error Handling Strategy

In `main()` function, catch startup errors:
```typescript
main().catch((error: unknown) => {
  if (error instanceof Error && error.message.includes('[VECTOR]')) {
    console.error(error.message);
    process.exit(1);
  }
  console.error("[VECTOR] Fatal server error:", error);
  process.exit(1);
});
```

---

### 1.3 CONTRIBUTING.md
**File:** New file at root

#### Content Structure
```markdown
# Contributing to VECTOR

## Quick Start
\`\`\`bash
pnpm install --frozen-lockfile
pnpm --dir vector/mcp_server install --frozen-lockfile
pnpm --dir vector/mcp_server run build
\`\`\`

## Pre-PR Checklist
\`\`\`bash
pnpm run release-check  # Full verification
\`\`\`

## Module Architecture

### Core Modules (vector/mcp_server/)
| File | Responsibility |
|------|---------------|
| core_schemas.ts | All Zod schemas and types |
| core_state_runtime.ts | State operations: load, save, sync, backup |
| core_idempotency.ts | Request registry, LRU eviction, tool queue |
| core_guard_helpers.ts | Input sanitization, phase guards |
| core_workflow_helpers.ts | Phase transitions, scoring, validation |
| core_workflow_tools.ts | Intake → signal tool implementations |
| core_research_tools.ts | Research provider integrations |
| core_copy_tools.ts | Sales copy and review tools |
| core_admin_tools.ts | State management: update, undo, snapshot |
| core_graph_tools.ts | Graph memory operations |

### Adding New Tools
1. Register in `capability_contract.ts`
2. Add phases in `workflow_contract.ts`
3. Implement in appropriate `core_*_tools.ts`
4. Call `registerVectorTool()` at module load
5. Add e2e test in `tests/`

### Security Notes
- Remote auth secrets: Use `wrangler secret put`
- Never commit secrets to `.env` or config files
- See `vector/docs/AUTH_COMMUNITY_VNEXT_PLAN.md`
```

---

### 1.4 .env.example
**File:** New file at root

```bash
# ============================================
# VECTOR MCP Server - Environment Template
# ============================================

# Required
VECTOR_LICENSE_KEY=vsk_your_key_here
VECTOR_PROJECT_ID=my_project

# Optional: Custom KB path (default: ~/.vector/kb)
VECTOR_KB_PATH=/path/to/kb

# Optional: Toolset filtering (default: all)
VECTOR_TOOLSETS=core,research

# Optional: Safety mode (blocks admin mutations)
VECTOR_SAFE_MODE=false

# ============================================
# Research Providers (optional)
# ============================================
TAVILY_API_KEY=tvly-...
EXA_API_KEY=exa-...

# ============================================
# Remote Worker (Cloudflare) - DO NOT PUT HERE
# Use: wrangler secret put <VAR_NAME>
# ============================================
# VECTOR_AUTH_ISSUER=https://your-tenant.auth0.com/
# VECTOR_AUTH_AUDIENCE=https://api.vector.gt
# VECTOR_AUTH_JWKS_JSON={"keys":[...]}
```

---

### 1.5 CHANGELOG v4 Entry
**File:** `vector/docs/CHANGELOG.md` (prepend to top)

```markdown
## [2.0.1] - 2026-04-06

### Added
- Local backup pruning with 25-file limit (matches DO behavior)
- State/graph file integrity checks with corrupt file preservation
- CONTRIBUTING.md with module map and contribution guidelines
- .env.example template for environment setup
- Structured error codes (Wave 2)

### Changed
- Refactored monolithic core.ts (3,523 lines) → 14 focused modules
- Zod unified to ^4.3.6 across packages
- Tavily API key moved to Authorization: Bearer header

### Fixed
- Race condition: state reload in serialized tool execution queue
- Telemetry: Added latency tracking and error telemetry
- Request registry: LRU eviction at 500 entries
- Graph provenance: Bounded at 25 entries with dedup
- Evidence table: Bounded at 500 entries with id-based dedup
```

---

## Wave 2: Observability Overhaul (1-2 days)

### 2.1 Rich /healthz Endpoint
**File:** `vector/cloud_worker/src/index.ts:192-194`

#### Implementation
```typescript
if (url.pathname === "/healthz") {
  const oauthConfigured = Boolean(
    env.VECTOR_AUTH_ISSUER && env.VECTOR_AUTH_AUDIENCE
  );
  const licenseFallback = env.VECTOR_ALLOW_LICENSE_FALLBACK !== "false";
  
  const health = {
    status: "ok",
    version: VECTOR_VERSION,
    transport: "streamable-http",
    auth: {
      oauth_configured: oauthConfigured,
      license_fallback: licenseFallback,
      oauth_issuer: oauthConfigured 
        ? env.VECTOR_AUTH_ISSUER 
        : null,
    },
    ts: new Date().toISOString(),
  };
  
  return new Response(JSON.stringify(health), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
```

#### Local Server Startup Log
Update `index.ts:156-160`:
```typescript
console.error(JSON.stringify({
  event: "server_started",
  version: VECTOR_VERSION,
  phase: state.phase,
  milestone: state.milestone,
  toolsets: capability.toolsets,
  safe_mode: capability.safeMode,
  runtime_dir: RUNTIME_DIR,
  ts: new Date().toISOString(),
}));
```

---

### 2.2 VectorError + Structured Errors
**New File:** `vector/mcp_server/core_error_codes.ts`

#### Implementation
```typescript
export type VectorErrorCode =
  | "PHASE_GUARD_FAILED"
  | "PHASE_TRANSITION_ILLEGAL"
  | "PHASE_PREREQUISITES_FAILED"
  | "TOOL_POLICY_MISSING"
  | "CAPABILITY_POLICY_MISSING"
  | "SAFE_MODE_BLOCKED"
  | "PROMPT_INJECTION_DETECTED"
  | "INPUT_TOO_LONG"
  | "INPUT_TOO_DEEP"
  | "INPUT_ARRAY_TOO_LARGE"
  | "COPY_PREREQUISITES_FAILED"
  | "STATE_DRIFT_DETECTED"
  | "RESEARCH_PROVIDER_NOT_CONFIGURED"
  | "RESEARCH_PROVIDER_TIMEOUT"
  | "RESEARCH_PROVIDER_ERROR"
  | "STATE_FILE_CORRUPT"
  | "GRAPH_FILE_CORRUPT"
  | "UNKNOWN_ERROR";

export class VectorError extends Error {
  constructor(
    public readonly code: VectorErrorCode,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "VectorError";
  }
}

// MCP-compliant error response
export function toolError(
  code: VectorErrorCode,
  message: string,
  context?: Record<string, unknown>
): { content: Array<{ type: "text"; text: string }>; isError: true } {
  return {
    isError: true,
    content: [{
      type: "text",
      text: JSON.stringify({ error: true, code, message, ...(context ?? {}) }),
    }],
  };
}
```

#### Migration Strategy

Replace `throw new Error()` in phases:

1. **Phase 1:** `core_guard_helpers.ts`
   ```typescript
   // Before:
   throw new Error("Input nesting is too deep.");
   // After:
   throw new VectorError("INPUT_TOO_DEEP", "Input nesting exceeds maximum depth of 20");
   ```

2. **Phase 2:** `core_workflow_helpers.ts`
   ```typescript
   // Before:
   throw new Error(`Illegal phase transition: ${currentPhase} -> ${nextPhase}`);
   // After:
   throw new VectorError(
     "PHASE_TRANSITION_ILLEGAL",
     `Cannot transition from '${currentPhase}' to '${nextPhase}'`,
     { currentPhase, attemptedNext: nextPhase, allowedNext: allowed }
   );
   ```

3. **Phase 3:** Tool-specific errors in `core_*_tools.ts`

---

### 2.3 Tool Invocation Telemetry
**File:** `vector/mcp_server/core_idempotency.ts:86-117`

#### Implementation
```typescript
function withIdempotency<T extends { content: Array<{ type: "text"; text: string }> }>(
  action: string,
  handler: (args: any) => Promise<T>,
) {
  return async (args: any): Promise<T> => {
    return enqueueToolExecution(async () => {
      const startMs = Date.now();
      
      // ... existing state reload code ...
      
      try {
        const response = await handler(stripRequestId(args));
        const latencyMs = Date.now() - startMs;
        
        // Success telemetry
        void deps.telemetry?.()?.("tool_invocation_completed", {
          action,
          phase: deps.getState().phase,
          latency_ms: latencyMs,
          cached: false,
          request_id: requestId ?? null,
        });
        
        if (requestId) {
          await cacheRequestResponse(requestId, action, response);
        }
        return response;
        
      } catch (error) {
        const latencyMs = Date.now() - startMs;
        
        // Error telemetry
        void deps.telemetry?.()?.("tool_invocation_failed", {
          action,
          phase: deps.getState().phase,
          latency_ms: latencyMs,
          error_code: error instanceof VectorError ? error.code : "UNKNOWN_ERROR",
          error_message: error instanceof Error ? error.message : String(error),
          request_id: requestId ?? null,
        });
        
        // Convert to structured error response
        if (error instanceof VectorError) {
          return toolError(error.code, error.message, error.context);
        }
        throw error;
      }
    });
  };
}
```

---

### 2.4 /metrics Endpoint Foundation
**File:** `vector/cloud_worker/src/index.ts`

#### Implementation
```typescript
if (url.pathname === "/metrics") {
  const metrics = [
    `# HELP vector_info VECTOR server info`,
    `# TYPE vector_info gauge`,
    `vector_info{version="${VECTOR_VERSION}",transport="streamable-http"} 1`,
    ``,
    `# HELP vector_requests_total Total MCP requests`,
    `# TYPE vector_requests_total counter`,
    `vector_requests_total{transport="streamable-http"} 0`,
    ``,
    `# HELP vector_auth_configured Whether OAuth is configured`,
    `# TYPE vector_auth_configured gauge`,
    `vector_auth_configured{issuer="${env.VECTOR_AUTH_ISSUER ?? 'none'}"} ${env.VECTOR_AUTH_ISSUER ? 1 : 0}`,
  ].join("\n");
  
  return new Response(metrics + "\n", {
    status: 200,
    headers: { "content-type": "text/plain; version=0.0.4" },
  });
}
```

---

## Wave 3: Auth & Tool Design (1-2 days)

### 3.1 Per-Request Rate Limiting
**New File:** `vector/cloud_worker/src/ratelimit.ts`

#### Implementation
```typescript
export interface RateLimitConfig {
  requestsPerMinute: number;
}

type RateLimitBucket = {
  count: number;
  window_start: string;
};

export async function enforceRateLimit(
  env: RemoteAuthEnv,
  auth: RemoteAuthContext,
  request: Request,
  config: RateLimitConfig
): Promise<void> {
  const principalHash = await hashValue(auth.principal);
  const key = `vector:ratelimit:${principalHash}`;
  const now = Date.now();
  const windowMs = 60_000;

  const bucket = (await readJsonValue<RateLimitBucket>(env.VECTOR_KB_STORE, key)) ?? {
    count: 0,
    window_start: new Date(now).toISOString(),
  };

  const windowStart = Date.parse(bucket.window_start);
  const nextBucket = now - windowStart > windowMs
    ? { count: 1, window_start: new Date(now).toISOString() }
    : { ...bucket, count: bucket.count + 1 };

  await writeJsonValue(env.VECTOR_KB_STORE, key, nextBucket);

  if (nextBucket.count > config.requestsPerMinute) {
    throw new RemoteAuthError(
      429, 
      `Rate limit exceeded: ${config.requestsPerMinute} requests/minute`
    );
  }
}

function getTierRateLimit(tier?: string | null): number {
  const limits: Record<string, number> = {
    license: 60,
    basic: 60,
    pro: 120,
    enterprise: 300,
  };
  return limits[tier ?? 'license'] ?? 60;
}
```

#### Integration in index.ts
```typescript
// After enforceSessionPolicy, before DO stub fetch:
await enforceRateLimit(env, authContext, request, {
  requestsPerMinute: getTierRateLimit(authContext.tier),
});
```

---

### 3.2 Tool outputSchema Declaration
**File:** `vector/mcp_server/core_tool_registration.ts`

#### Implementation
```typescript
// Update type definition
interface VectorToolDefinition {
  name: string;
  config: { 
    description: string; 
    inputSchema: Record<string, z.ZodTypeAny>;
    outputSchema?: Record<string, any>; // MCP June 2025 spec
  };
  handler: (args: any) => Promise<ToolTextResponse>;
}

// In registerRuntimeTools:
server.registerTool(
  definition.name,
  {
    ...definition.config,
    inputSchema: deps.withRequestSchema(definition.config.inputSchema),
    outputSchema: definition.config.outputSchema ?? {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        decisions: { type: "array", items: { type: "string" } },
        next_actions: { type: "array", items: { type: "string" } },
        state_delta: { type: "object" },
        payload: { type: "object" },
      },
    },
  },
  // ... handler
);
```

---

### 3.3 Remove dist/ from Git
**File:** `.gitignore`

#### Changes
```diff
  # Build / Compiled output
  dist/
  build/
  out/
- # Cần publish package này bằng git nên keep compiled dist output
- !vector/mcp_server/dist/
```

#### CI Update
**File:** `.github/workflows/ci.yml`

```yaml
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      # ... existing steps ...
      
      - name: Build MCP server
        run: pnpm --dir vector/mcp_server run build
        
      - name: Run tests
        run: node --test tests/*.mjs
        
      - name: Verify dist/ is built
        run: test -f vector/mcp_server/dist/index.js
```

---

## Wave 4: Testing & CI (1 day)

### 4.1 New Test Files

#### `tests/runtime_retention.test.mjs` additions
```javascript
test('backup files are pruned to MAX_LOCAL_BACKUP_FILES after phase transitions', async () => {
  await withClient({}, async (client, kbRoot, projectId) => {
    // Trigger 30 phase transitions
    for (let i = 0; i < 30; i++) {
      // ... transition through phases
    }
    
    const files = await readdir(join(kbRoot, projectId));
    const backups = files.filter(f => f.startsWith('vector_state.json.bkp_'));
    assert.ok(backups.length <= 25, `Expected ≤25 backups, got ${backups.length}`);
  });
});

test('corrupt state file throws and preserves corrupt file for inspection', async () => {
  await withClient({}, async (client, kbRoot, projectId) => {
    // Write corrupt JSON
    const statePath = join(kbRoot, projectId, 'vector_state.json');
    await writeFile(statePath, '{ invalid json', 'utf8');
    
    // Next server start should fail with clear error
    // and preserve the corrupt file
  });
});
```

#### `tests/observability.test.mjs` (new file)
```javascript
test('healthz returns structured JSON with version and auth config', async () => {
  const response = await fetch('http://localhost:8787/healthz');
  const body = await response.json();
  
  assert.equal(body.status, 'ok');
  assert.ok(body.version);
  assert.ok(body.auth);
  assert.ok(body.ts);
});

test('tool error telemetry emits tool_invocation_failed with error_code', async () => {
  // Trigger error, check telemetry log
});

test('successful tool emits latency_ms in tool_invocation_completed', async () => {
  // Call tool, check telemetry includes latency_ms
});
```

#### `tests/error_format.test.mjs` (new file)
```javascript
test('phase guard failure returns isError:true with PHASE_GUARD_FAILED code', async () => {
  // Call tool in wrong phase
  const result = await client.callTool({ name: 'vector_venue', ... });
  const text = result.content[0].text;
  const parsed = JSON.parse(text);
  
  assert.equal(parsed.isError, true);
  assert.equal(parsed.code, 'PHASE_GUARD_FAILED');
});
```

### 4.2 CI Matrix Expansion
**File:** `.github/workflows/ci.yml`

```yaml
jobs:
  verify:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest]
        node: [22]
    runs-on: ${{ matrix.os }}
    timeout-minutes: 15
    
  build-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify dist/ can be built
        run: |
          pnpm install --frozen-lockfile
          pnpm --dir vector/mcp_server run build
          test -f vector/mcp_server/dist/index.js
```

---

## Implementation Order

### Week 1

**Day 1 (Wave 1):**
1. Backup pruning (1 hour)
2. State/graph integrity (2 hours)
3. CONTRIBUTING.md + .env.example (30 min)
4. CHANGELOG entry (15 min)

**Day 2-3 (Wave 2):**
1. VectorError framework + migration (4 hours)
2. /healthz + structured logging (2 hours)
3. Tool telemetry with latency (2 hours)
4. /metrics foundation (1 hour)

**Day 4-5 (Wave 3):**
1. Rate limiting module (3 hours)
2. outputSchema declaration (2 hours)
3. Remove dist/ + CI update (2 hours)

**Day 6 (Wave 4):**
1. Test file implementations (4 hours)
2. CI matrix expansion (2 hours)

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking existing error handling | Implement VectorError gradually; keep Error fallback |
| Dist/ removal breaks installs | Verify CI build step; add `prepublishOnly` script |
| State integrity changes break recovery | Extensive testing; preserve corrupt files |
| Rate limiting false positives | Configurable limits; tier-based defaults |

---

## Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Observability Score | 62 | 93 (+31) |
| State & Reliability | 88 | 95 (+7) |
| Auth & Security | 88 | 95 (+7) |
| Testing & CI | 88 | 95 (+7) |
| **Total** | **83** | **~95** |

---

## Appendix: File Change Summary

### New Files (4)
1. `CONTRIBUTING.md`
2. `.env.example`
3. `vector/mcp_server/core_error_codes.ts`
4. `vector/cloud_worker/src/ratelimit.ts`

### Modified Files (12)
1. `vector/mcp_server/index.ts`
2. `vector/mcp_server/core_guard_helpers.ts`
3. `vector/mcp_server/core_workflow_helpers.ts`
4. `vector/mcp_server/core_idempotency.ts`
5. `vector/mcp_server/core_tool_registration.ts`
6. `vector/cloud_worker/src/index.ts`
7. `vector/docs/CHANGELOG.md`
8. `.gitignore`
9. `.github/workflows/ci.yml`
10. `tests/runtime_retention.test.mjs`
11. `tests/observability.test.mjs` (new)
12. `tests/error_format.test.mjs` (new)

---

*End of Master Implementation Roadmap*
