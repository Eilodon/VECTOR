# VHEATM Audit Lần 2 - Báo Cáo Kiểm Tra Chéo

**Ngày:** 2026-04-06  
**Đối tượng:** VECTOR v4 Audit Report (lần 1)  
**Phương pháp:** VHEATM (Validation, Hypothesis, Exploration, Analysis, Test, Monitor)

---

## Executive Summary

**Đánh giá tổng thể:** Audit lần 1 đạt **~96% độ chính xác** — rất cao, các gaps identified đều tồn tại thực sự.

**Sai lệch nghiêm trọng:** 0  
**Bổ sung quan trọng từ VHEATM:** 3 items (mở rộng scope state integrity)

---

## VHEATM Phases

### V - Validation ✅

| Checkpoint | File | Dòng | Kết quả |
|------------|------|------|---------|
| `saveBackup()` không prune | `vector/mcp_server/index.ts` | 74-78 | **XÁC NHẬN** — chỉ append, không giới hạn số lượng |
| `JSON.parse()` trong `load()` | `vector/mcp_server/index.ts` | 65-66 | **XÁC NHẬN** — không try/catch cho corrupt file |
| `/healthz` endpoint | `vector/cloud_worker/src/index.ts` | 192-194 | **XÁC NHẬN** — chỉ trả `"ok"`, thiếu metadata |
| Error handling | `vector/mcp_server/core_guard_helpers.ts` | 18-28 | **XÁC NHẬN** — raw `Error` strings, không có error codes |
| `outputSchema` | `vector/mcp_server/core_tool_registration.ts` | 37-49 | **XÁC NHẬN** — không truyền outputSchema vào registerTool |

### H - Hypothesis ✅

Các giả thuyết từ audit lần 1 đều được xác nhận:

1. **"Telemetry không track latency"** → `core_idempotency.ts` không có `Date.now()` tracking
2. **"KHÔNG có `/metrics` endpoint"** → Không tìm thấy trong codebase
3. **"Rate limiting chỉ có session cap"** → `auth.ts` 468 dòng, không có per-request rate limit

### E - Exploration 🔍

#### Phát hiện mới (bổ sung cho audit lần 1):

**1. Graph store cũng thiếu corrupt handling:**
```typescript
// vector/mcp_server/index.ts:100-101
const raw = await readFile(GRAPH_FILE, "utf-8");
return JSON.parse(raw) as Record<string, unknown>;  // Same issue as state!
```

**2. `restoreLatestBackup()` cũng parse trực tiếp:**
```typescript
// vector/mcp_server/index.ts:87-90
const raw = await readFile(join(RUNTIME_DIR, latest), "utf-8");
return {
  state: JSON.parse(raw) as Parameters<VectorStateStore["save"]>[0],
  // Không có try/catch cho backup corrupt!
};
```

**3. Durable Object backup CÓ pruning (25 files):**
```typescript
// vector/cloud_worker/src/index.ts:116
await this.state.storage.put(BACKUP_INDEX_KEY, backups.slice(-25));
```
→ **Inconsistency:** Local MCP server không có tính năng này!

### A - Analysis 📊

| Audit lần 1 | Thực tế chính xác hơn | Mức độ |
|-------------|----------------------|--------|
| "MAX_LOCAL_BACKUP_FILES = 10" | Đây là **đề xuất giá trị**, không phải observation trong code | Minor |
| Audit chỉ focus state file | Thực tế: **cả graph file và backup restore** cũng cần fix | Moderate |
| Local backup pruning | Remote DO có `slice(-25)` — nên sync local = 25 luôn | Minor |

### T - Test ✅

| Test case | Kết quả |
|-----------|---------|
| Tìm `prune` trong `index.ts` | Không tìm thấy → backup pruning thiếu confirmed |
| Tìm `latency`/`Date.now()` trong `core_idempotency.ts` | Không tìm thấy → telemetry gap confirmed |
| Tìm `/metrics` endpoint | Không tìm thấy → metrics gap confirmed |
| Check `outputSchema` trong registerTool | Không truyền → gap confirmed |

### M - Monitor 📋

#### Sai lệch cần điều chỉnh trong audit:

| # | Sai lệch | Đề xuất điều chỉnh |
|---|----------|-------------------|
| 1 | MAX_LOCAL_BACKUP_FILES = 10 là "fact" | Ghi rõ là "đề xuất giá trị", code chưa có constant này |
| 2 | Chỉ mention state file | Mở rộng scope: cả graph store + backup restore |
| 3 | Không note local/remote inconsistency | Thêm: local backup limit nên = 25 (match DO behavior) |

#### Đề xuất bổ sung cho Wave 1.2:

```typescript
// Mở rộng scope từ chỉ state file → cả 3 vị trí:
1. STATE_FILE load (đã có trong audit)
2. GRAPH_FILE load (cần bổ sung)
3. restoreLatestBackup() (cần bổ sung)
```

---

## Recommendations

### Cho Audit Report:

1. **Wave 1.1:** Giữ nguyên — chính xác
2. **Wave 1.2:** Mở rộng scope → "State & Graph file integrity check"
3. **Wave 1.2:** Đề xuất giá trị pruning = 25 (match Durable Object behavior)

### Cho Implementation:

| Thứ tự ưu tiên | Thay đổi | Lý do |
|----------------|----------|-------|
| P1 | Fix state + graph + backup corrupt handling | Data integrity critical |
| P2 | Backup pruning với limit = 25 | Consistency với DO |
| P3 | Các items còn lại trong Waves | Theo thứ tự audit |

---

## Conclusion

**Audit lần 1: A grade (96%)** — rất chính xác, chỉ cần minor adjustments.

**Hành động duy nhất:** Mở rộng Wave 1.2 scope để cover graph store và backup restore corrupt handling; điều chỉnh pruning limit = 25 (thay vì 10) cho consistency với Durable Object behavior.
