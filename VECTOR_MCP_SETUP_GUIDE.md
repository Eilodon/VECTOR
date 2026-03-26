# VECTOR MCP — Tổng kết Setup Guide
> Cập nhật: Tháng 3/2026 | Spec: MCP November 2025

> Current product note:
> This guide is a deep technical background document.
> For the current install path and runtime truth, start with `README.md`, `vector/schemas/runtime_contract.yaml`, `pnpm run host:install`, and `pnpm run selftest`.

---

## MỤC LỤC

1. [Bức tranh tổng thể](#1-bức-tranh-tổng-thể)
2. [Transport Layer — Chọn đúng từ đầu](#2-transport-layer)
3. [Kiến trúc Tools — 7 Phases, 7 Tools](#3-kiến-trúc-tools)
4. [Auth & License Control](#4-auth--license-control)
5. [Chống Share Key — 4 lớp phòng thủ](#5-chống-share-key)
6. [KB Persistence — State Management](#6-kb-persistence)
7. [Hosting & Infrastructure](#7-hosting--infrastructure)
8. [Security Checklist](#8-security-checklist)
9. [Observability — Đo cái gì](#9-observability)
10. [Roadmap Technical theo Tier](#10-roadmap-technical-theo-tier)
11. [5 Nguyên tắc bất biến](#11-5-nguyên-tắc-bất-biến)

---

## 1. BỨC TRANH TỔNG THỂ

VECTOR MCP khác hoàn toàn MCP server thông thường ở 3 điểm:

```
MCP thông thường          VECTOR MCP
─────────────────         ─────────────────────────────
Kết nối 1 tool            Orchestrate 7-phase workflow
Stateless OK              PHẢI có state (KB persistence)
1 user 1 session          Multi-user, KB riêng mỗi user
Tool đơn giản             Tool gọi tool (nested agent calls)
```

Mọi quyết định kỹ thuật đều phải phục vụ 2 mục tiêu cốt lõi:

- **Friction = 0** cho user install và chạy phase đầu tiên
- **State không bao giờ mất** — KB là core value, không phải feature phụ

---

## 2. TRANSPORT LAYER

Spec MCP November 2025 xác định 2 transport còn hiệu lực. **SSE đã deprecated hoàn toàn.**

### Quyết định theo Tier

| Tier | Transport | Lý do |
|---|---|---|
| Tier 1–2 (Skills Kit) | **STDIO** | Local trong Cursor, zero network overhead, install bằng `npx` |
| Tier 3–4 (Full Stack + Custom) | **Streamable HTTP** | Cloud KB sync, multi-device, team sharing, streaming response cho long-running phases |

### STDIO — Cấu hình tối thiểu

```json
// claude_desktop_config.json hoặc cursor settings
{
  "mcpServers": {
    "vector": {
      "command": "npx",
      "args": ["vector-skills@latest"],
      "env": {
        "VECTOR_KB_PATH": "~/.vector/kb",
        "VECTOR_LICENSE_KEY": "vsk_xxxx"
      }
    }
  }
}
```

### Streamable HTTP — Endpoint chuẩn

```
POST https://mcp.vector-gtm.com/mcp
Headers:
  Content-Type: application/json
  Authorization: Bearer <JWT_TOKEN>
  MCP-Session-Id: <UUID_V4>
```

**Nguyên tắc:** Đừng force user dùng HTTP nếu họ chỉ cần local. Friction = churn.

---

## 3. KIẾN TRÚC TOOLS

### Nguyên tắc: Phase-oriented, không phải utility-oriented

```javascript
// ✅ ĐÚNG — tools theo phase, agent biết ngữ cảnh
vector_intake_collect()     // Phase 1: Thu thập product brief
vector_icp_build()          // Phase 2: Xây ICP card
vector_market_analyze()     // Phase 3: Phân tích thị trường
vector_channel_score()      // Phase 4: Chấm điểm kênh
vector_thesis_lock()        // Phase 5: Khóa thesis card
vector_venue_set()          // Phase 6: Thiết lập venue
vector_signal_track()       // Phase 7: Theo dõi tín hiệu

// ❌ SAI — flat utility tools, mất context workflow
vector_create_document()
vector_analyze_data()
vector_generate_content()
```

### Tool Schema chuẩn (bắt buộc)

```javascript
{
  name: "vector_icp_build",
  description: "Xây dựng ICP card từ thông tin intake. Chỉ chạy sau khi intake_collect hoàn tất.",
  inputSchema: {
    type: "object",
    properties: {
      project_id: { type: "string", format: "uuid" },
      product_brief: { type: "object" },
      request_id: { type: "string" }  // Bắt buộc — dùng cho idempotency
    },
    required: ["project_id", "request_id"]
  }
}
```

### Rule bắt buộc: Idempotency

Agent có thể retry hoặc parallelize requests. Mọi tool phải idempotent: cùng `request_id` → cùng output, không tạo duplicate artifact trong KB.

```javascript
// Idempotency middleware
async function handleTool(name, args) {
  const existing = await kb.getByRequestId(args.request_id);
  if (existing) return existing;  // Trả kết quả cũ, không chạy lại
  
  const result = await executeTool(name, args);
  await kb.saveWithRequestId(args.request_id, result);
  return result;
}
```

---

## 4. AUTH & LICENSE CONTROL

### Reality Check: Implemented now vs Roadmap

**Implemented now in this repo**

- Local `stdio` runtime with durable state.
- Remote `streamable-http` runtime with bearer key validation.
- Remote request gating via active license check plus `x-vector-project-id` and `x-vector-session-owner`.
- Optional Auth0-compatible OAuth access-token validation in the remote worker when issuer/audience are configured.
- Principal-scoped session registry with concurrent-session caps and review-first anomaly logging.

**Roadmap only, not shipped in this repo today**

- Real host rollout evidence for OAuth 2.1 + PKCE flows.
- Hosted Authorization Server provisioning and host PKCE setup via Auth0/Clerk.
- Refresh-token rotation and full anomaly detection suite.

Phần còn lại của mục này mô tả target architecture cho Tier 3–4, không phải toàn bộ đã live trong runtime hiện tại.

### Toàn cảnh Auth Architecture

Current vNext choice for production rollout: **Auth0 first**. VECTOR only validates tokens; it does not issue them.

```
[Cursor / Claude Agent]
        │
        │ 1. OAuth 2.1 PKCE flow
        ▼
[Auth Server — Auth0 first, Clerk optional later]   ← KHÔNG tự build
        │
        │ 2. JWT token (scope + user_id + tier)
        ▼
[VECTOR MCP Server]                ← Chỉ validate, không issue token
        │
        │ 3. Check scope → route đến KB
        ▼
[KB Storage — per user_id]
```

**Quan trọng:** MCP server là OAuth Resource Server. Không bao giờ kiêm nhiệm Authorization Server.

### 3 Cơ chế Auth theo Tier

**Tier 1–2 — Static API Key (MVP, đơn giản nhất)**

```
Header: Authorization: Bearer vsk_a1b2c3d4e5f6...

Format key:  vsk_{tier}_{random_32_chars}
Ví dụ:       vsk_pro_9f8e7d6c5b4a3210...

Server-side: hash key với bcrypt trước khi lưu DB
             KHÔNG lưu plaintext key
```

Phù hợp cho Tier 1–2 vì user chạy local STDIO. Giới hạn: nếu key bị leak là full access.

**Tier 3–4 — OAuth 2.1 + PKCE (Production)**

```javascript
// Flow bắt buộc từ MCP spec November 2025
1. Agent khởi tạo PKCE: tạo code_verifier + code_challenge
2. Redirect đến Auth Server (Clerk) với code_challenge
3. User đăng nhập → Auth Server issue authorization_code
4. Agent exchange code + code_verifier → access_token + refresh_token
5. Mọi MCP request: Authorization: Bearer <access_token>
6. Server validate JWT signature + expiry + scope
```

**Scope Map theo Tier:**

```
vector:read    → Tier 1 (PDF buyer — read-only framework docs)
vector:skills  → Tier 2 (Skills Kit — local KB read/write)
vector:cloud   → Tier 3 (Full Stack — cloud KB + community access)
vector:custom  → Tier 4 (Custom — admin + MCP config management)
```

**Token Lifecycle:**

```
Access token:   expire sau 1 giờ
Refresh token:  rotate mỗi lần dùng, expire sau 30 ngày inactive
→ Người share token sẽ thấy friction leo thang cực nhanh sau mỗi lần dùng
```

---

## 5. CHỐNG SHARE KEY — 4 LỚP PHÒNG THỦ

Bài toán: 1 user mua key nhưng chia cho 80 người dùng chung.

### Lớp 1 — Device Fingerprint Binding

```javascript
// Khi activate key lần đầu
async function activateKey(key, requestMeta) {
  const fingerprint = {
    device_hash: hash(requestMeta.user_agent + requestMeta.platform),
    ip_range: requestMeta.ip.substring(0, requestMeta.ip.lastIndexOf('.')), // /24
    activated_at: new Date().toISOString()
  };
  await db.keys.update({ key_id }, { fingerprint });
}

// Mọi request sau
async function validateRequest(key, requestMeta) {
  const stored = await db.keys.get(key_id);
  const current_hash = hash(requestMeta.user_agent + requestMeta.platform);
  
  if (current_hash !== stored.fingerprint.device_hash) {
    await db.keys.increment(key_id, 'suspicious_device_count');
    if (suspicious_device_count > 3) {
      await flagForReview(key_id);  // Không ban ngay — flag để review
    }
    requireReAuth();  // Force OAuth flow lại
  }
}
```

### Lớp 2 — Concurrent Session Limit

```javascript
const SESSION_LIMITS = {
  'vector:skills': 1,   // Tier 2: 1 device cùng lúc
  'vector:cloud':  3,   // Tier 3: 3 devices (multi-device hợp lý)
  'vector:custom': 999  // Tier 4: unlimited
};

async function checkConcurrentSessions(user_id, tier) {
  const active = await sessions.countActive(user_id);
  if (active >= SESSION_LIMITS[tier]) {
    // Option A: Block + thông báo
    // Option B: Force logout session cũ (UX tốt hơn)
    await sessions.terminateOldest(user_id);
  }
}
```

### Lớp 3 — Short-lived Token + Rotation

Refresh token rotate mỗi lần dùng. Nếu token bị share:
- Người dùng thứ nhất dùng → token rotate
- Người dùng thứ hai cần re-auth → lại rotate
- Sau vài lần → người chia sẻ bị kick ra khỏi session của chính họ

### Lớp 4 — Usage Anomaly Detection

```javascript
const ANOMALY_RULES = [
  {
    name: 'multi_ip',
    condition: (events) => uniqueIpRanges(events, '24h') > 3,
    action: 'flag'
  },
  {
    name: 'bot_pattern',
    condition: (events) => stdDevInterval(events) < 100, // ms, quá đều = bot
    action: 'flag'
  },
  {
    name: 'geo_jump',
    condition: (events) => impossibleTravel(events),     // 2 quốc gia trong 10 phút
    action: 'require_reauth'
  },
  {
    name: 'kb_overuse',
    condition: (events) => kbOps(events, '1h') > avgKbOps * 10,
    action: 'rate_limit'
  }
];

// Khi flag: KHÔNG ban ngay
// → Gửi email: "Phát hiện đăng nhập từ nhiều thiết bị.
//               Bạn có muốn upgrade Team plan không?"
// → Đây vừa là security vừa là upsell tự nhiên
```

---

## 6. KB PERSISTENCE — STATE MANAGEMENT

KB là lý do duy nhất VECTOR phức tạp hơn MCP thông thường. Đây là core value.

### Schema tối thiểu

```json
{
  "version": "1.0",
  "project_id": "uuid-v4",
  "user_id": "auth0|xxx",
  "current_phase": "channel",
  "gates_passed": ["intake", "icp", "market"],
  "artifacts": {
    "icp_card": { ... },
    "market_memo": { ... },
    "channel_scorecard": { ... }
  },
  "signal_ledger": [],
  "request_ids": ["uuid1", "uuid2"],
  "last_updated": "2026-03-25T10:00:00Z",
  "export_hash": "sha256:abc123"
}
```

### Storage Strategy theo Tier

```
Tier 1–2 (STDIO — local):
└── ~/.vector/kb/{project_id}.json
    ├── Agent đọc/ghi trực tiếp qua file system
    ├── User full control, không cần internet
    └── Export insight = ý tưởng roadmap, chưa có tool export chính thức trong runtime hiện tại

Tier 3–4 (HTTP — cloud):
└── Cloudflare Durable Objects hoặc Supabase
    ├── KB gắn với user_id từ JWT token
    ├── Multi-device sync tự động
    ├── Versioning: mỗi phase advance = 1 immutable snapshot
    └── Rollback được nếu user muốn undo phase
```

### Versioning — Không bao giờ mất state

```javascript
// Mỗi phase advance tạo snapshot bất biến
async function advancePhase(project_id, from_phase, to_phase, artifact) {
  await kb.snapshots.create({
    project_id,
    phase: from_phase,
    artifact,
    timestamp: new Date().toISOString(),
    snapshot_id: uuidv4()
  });
  await kb.projects.update(project_id, { current_phase: to_phase });
}

// User có thể rollback
async function rollbackToPhase(project_id, target_phase) {
  const snapshot = await kb.snapshots.getLatestForPhase(project_id, target_phase);
  await kb.projects.restoreFromSnapshot(snapshot);
}
```

### KB Export cho Community (Privacy-safe)

```javascript
// Agent tự distill — user không cần làm gì
async function distillForCommunity(kb) {
  return {
    // ✅ GIỮ LẠI — structural patterns
    product_type: kb.intake.product_type,         // "dev_tool"
    icp_tier: kb.icp_card.primary_tier,           // "solo_founder"
    channel_winner: kb.channel_scorecard.winner,   // "twitter"
    channel_loser: kb.channel_scorecard.loser,     // "product_hunt"
    time_to_first_signal_days: kb.signal_ledger.daysToFirstSignal,
    pattern_tags: kb.thesis.pattern_tags,
    
    // ❌ XÓA — mọi thông tin có thể identify
    // company_name, domain, revenue, team_size,
    // founder_name, product_url, customer_names
  };
}
```

---

## 7. HOSTING & INFRASTRUCTURE

### Giai đoạn 1 — MVP (Tháng 1–3): Cloudflare Workers

```toml
# wrangler.toml
name = "vector-mcp"
main = "src/index.ts"
compatibility_date = "2025-11-01"

[vars]
MCP_SPEC_VERSION = "2025-11-01"
MAX_CONCURRENT_SESSIONS = 100
RATE_LIMIT_PER_USER = 100        # requests/phút

[[durable_objects.bindings]]
name = "KB_STORAGE"
class_name = "VectorKBStore"     # Persistent KB per user

[[durable_objects.bindings]]
name = "SESSION_STORE"
class_name = "VectorSessionStore"

[observability]
enabled = true
```

Tại sao Cloudflare Workers:
- Deploy trong < 5 phút từ template có sẵn
- Edge network: latency thấp toàn cầu
- Free tier đủ cho < 100k requests/ngày
- Durable Objects xử lý KB persistence native

### Giai đoạn 2 — Scale (Tháng 4+)

```
Nếu cần Python (ML features, signal pattern analysis):
→ Google Cloud Run + Cloud IAM

Nếu cần enterprise compliance (SOC2, GDPR):
→ AWS ECS + Cognito OAuth 2.0
```

### Pricing estimate (Cloudflare)

```
Free tier:    100k requests/ngày, 1GB Durable Objects storage
Workers Paid: $5/tháng → 10M requests/tháng
→ Đủ cho ~1,000 active users Tier 3 mà không cần scale infra
```

---

## 8. SECURITY CHECKLIST

### Bắt buộc từ ngày đầu

```
✅ Validate toàn bộ input theo JSON Schema trước khi xử lý
✅ Allowlist file paths — Agent không được đọc ngoài ~/.vector/kb/
✅ Token KHÔNG được log, KHÔNG được xuất hiện trong MCP tool results
✅ Rate limit per user: 100 req/phút (đủ workflow, chặn abuse)
✅ Session ID: UUID v4, không bao giờ sequential
✅ Log tất cả tool invocations: timestamp + user_id + tool_name + duration
✅ bcrypt cho API key storage — không lưu plaintext
✅ HTTPS everywhere — không có HTTP fallback
```

### 3 CVE đã biết trong reference implementations (Tháng 1/2026)

Đã phát hiện trong chính reference Git MCP server của Anthropic:
- **Path traversal**: validate và normalize mọi file path input
- **File deletion**: whitelist operations được phép, không blacklist
- **Remote code execution**: không bao giờ eval() input từ user

**Hành động:** Đừng copy-paste template từ repo Anthropic mà không code review kỹ.

### Lỗ hổng phổ biến nhất (43% MCP server sớm mắc phải)

Command injection — server chạy với permission của user, nếu bị compromise có thể access toàn bộ dữ liệu user.

```javascript
// ❌ SAI
const result = exec(`vector analyze ${userInput}`);

// ✅ ĐÚNG
const sanitized = validateAgainstSchema(userInput, icp_input_schema);
const result = await vector_icp_build(sanitized);
```

---

## 9. OBSERVABILITY — ĐO CÁI GÌ

Ở giai đoạn indie product, **workflow metrics quan trọng hơn server metrics**.

### Phải track ngay từ đầu

```javascript
const VECTOR_METRICS = {
  // Product health
  phase_completion_rate: "% user vượt gate mỗi phase",
  // → Nếu 80% drop ở Market phase → phase đó có friction

  phase_duration_avg: "Trung bình bao lâu complete 1 phase (phút)",
  // → Benchmark để detect regression khi update skills

  tool_error_rate: "Lỗi theo từng tool name",
  // → vector_channel_score() lỗi nhiều → debug ngay

  kb_export_rate: "% Tier 3 user contribute insight ra community",
  // → KPI trực tiếp của moat strategy

  // Business health
  tier_upgrade_rate: "% user upgrade từ Tier thấp hơn",
  time_to_first_value: "Thời gian từ install đến complete Phase 1 (phút)",
  session_depth: "Trung bình bao nhiêu phase/session"
};
```

### Không cần track sớm

P99 latency, CPU utilization, NUMA topology, memory pressure — đây là vấn đề của hyperscaler, không phải indie product với < 1,000 users.

---

## 10. ROADMAP TECHNICAL THEO TIER

```
THÁNG 1–2: FOUNDATION
├── STDIO transport
├── 7 tools tương ứng 7 phases
├── Local KB (file system JSON)
├── Static API key (bcrypt stored)
├── Input validation cơ bản
├── npx install one-liner
└── Phase completion rate tracking

THÁNG 3–4: CLOUD LAYER
├── Cloudflare Workers deployment
├── Streamable HTTP transport
├── OAuth 2.1 + PKCE qua Clerk (KHÔNG tự build)
├── Durable Objects cho cloud KB
├── Concurrent session limit
├── Short-lived token + rotation
└── Basic anomaly detection (multi-IP rule)

THÁNG 5–6: ECOSYSTEM
├── KB distill + export pipeline (community contribution) [roadmap]
├── Community KB aggregate (anonymized patterns) [roadmap]
├── Versioning + rollback cho KB
├── Team mode (shared KB, multi-user Tier 4)
└── Full anomaly detection suite + upsell trigger
```

---

## 11. 5 NGUYÊN TẮC BẤT BIẾN

| # | Nguyên tắc | Lý do |
|---|---|---|
| **1** | **STDIO trước, HTTP sau** | Friction tối thiểu cho early adopter. Đừng ép user setup OAuth khi họ chỉ muốn thử |
| **2** | **Không tự build Auth Server** | Dùng Clerk/Auth0. OAuth 2.1 đúng chuẩn mất ít nhất 2 tuần để build đúng và an toàn |
| **3** | **KB là first-class citizen** | State persistence = core value. Mất KB = mất toàn bộ lý do dùng VECTOR |
| **4** | **Track workflow metrics, không phải server metrics** | Phase completion rate quan trọng hơn P99 latency ở giai đoạn 0→1 |
| **5** | **Idempotent mọi tool** | Agent retry là bình thường, không phải bug. Duplicate artifact trong KB = mất trust |

---

> **Ghi nhớ cuối:** 53% MCP server production hiện vẫn dùng static API key và hoạt động tốt. Đừng over-engineer auth ở giai đoạn đầu. Build đơn giản, ship sớm, layer thêm security khi có user thực và abuse thực xảy ra.
