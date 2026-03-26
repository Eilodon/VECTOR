---
name: vector-signal
version: 2.0.0
description: "Milestone loop skill for VECTOR. Tracks M0–M5, classifies signals, detects drift, runs recovery routing, and provides concrete next-step prompts at every milestone."
---

# Signal Skill v2.0

## Goal

Ngăn user "đứng hình" giữa chặng bằng cách thay "chờ kết quả 14 ngày" bằng milestone-based learning có checkpoint cụ thể sau mỗi bước.

---

## Core Principle

Mỗi milestone phải kết thúc bằng ba thứ:
1. **Một artifact cụ thể** (list, variant, ledger row)
2. **Một confidence update** (tăng / giữ nguyên / giảm — và tại sao)
3. **Một prompt cụ thể** mà user paste vào session tiếp theo

Nếu user chưa hoàn thành milestone, prompt tiếp theo phải **nhỏ hơn** — không phải vague hơn.

---

## Real-World Benchmarks (2025–2026)

Dùng để calibrate kỳ vọng của founder. Panic là sớm nếu numbers nằm trong khoảng này.

| Metric | Average | Strong performer |
|---|---|---|
| Cold email reply rate | 3–6% | 10%+ |
| LinkedIn outreach reply rate | 10–25% | 30%+ |
| Cold call connect rate | 2–5% | 8%+ |
| Deals requiring 5+ touches | 80% | — |
| Reps who quit after 1 touch | 44% | — |

**Key interpretation:**
- 5% reply rate không phải thất bại. Gửi 20, nhận 1 reply = trong benchmark.
- Reply rate < 2%: vấn đề targeting hoặc relevance — không phải volume.
- Replies mà không convert: vấn đề anxiety hoặc trust signal.
- 80% deals cần 5+ touches. Không dừng vì im lặng sau 1–2 attempts.

---

## Intent Signal — Khi nào buyer đang trong buying window?

Ưu tiên outreach khi thấy:
- Recent hire ở relevant role (dấu hiệu initiative mới hoặc pain mới)
- New funding round (budget, urgency để show results)
- Job posting signal pain họ đang cần solve
- Competitor change (provider của họ tăng giá, bị mua lại, thay features)
- Public statement mô tả đúng vấn đề (LinkedIn post, conference talk)
- Regulatory hoặc market shift tạo urgency

Warm outreach (có intent signal) nhận reply rate cao hơn cold outreach 3–5×.

---

## Outreach Cadence (M1–M2)

Single-channel outreach dễ fail. Ở 0→1, layer hai channels:

```
Day 1:   First contact (primary channel — DM hoặc email)
Day 3:   Follow-up (cùng channel, angle mới)
Day 5:   Second channel touch (LinkedIn comment, voice note, soft mention)
Day 8:   Value add touch (share something useful — không có ask)
Day 12:  Final ask ("Happy to close the loop — vẫn còn relevant không?")
```

Mỗi touch phải reference touch trước. Không gửi "just following up". Mỗi touch cần lý do riêng để tồn tại.

---

## Milestones M0–M5

### M0 — Launch Pad

**KPI:** 20 targets được map  
**Output:** Target list quality review  
**Ledger:** Target quality, missing context, first correction

**Tiêu chí target tốt:**
- Đúng role và company profile với ICP card
- Có ít nhất 1 intent signal
- Có đủ thông tin để personalize first touch
- Có thể tiếp cận được qua primary channel đã chọn

**Milestone prompt M0 — paste vào session tiếp theo:**
```
M0 COMPLETE
Targets mapped: [số lượng]
Sample (paste 3–5 dòng đại diện):
  - [Tên], [Role], [Company], [Intent signal tìm thấy], [Channel tiếp cận]
Vấn đề gặp phải khi map: [thiếu data gì / không tìm được ai / không rõ filter nào]
Quality assessment: [hầu hết đúng ICP / một nửa nghi ngờ / phần lớn sai]
```

---

### M1 — First Contact

**KPI:** 3 variants được viết, ít nhất 1 đã gửi  
**Output:** Hook review + CTA review  
**Ledger:** Variant count, first send, early friction

**Checklist trước khi gửi:**
- Mỗi variant test 1 biến duy nhất (hook / pain angle / outcome)
- CTA là 1 action duy nhất
- Không có feature dumping
- Có reference đến intent signal nếu tìm được
- Nghe native với channel (DM khác email)

**Milestone prompt M1 — paste vào session tiếp theo:**
```
M1 COMPLETE
Variants viết: [số lượng]
Variant đã gửi: [paste nội dung đầy đủ của variant được chọn]
Gửi đến: [số người] targets
Thời gian gửi: [ngày/giờ]
Vấn đề khi viết: [không biết nên dùng angle nào / CTA nghe awkward / khác]
Early observation: [có reply ngay không / không có gì / bounced]
```

---

### M2 — Signal Scan

**KPI:** Response data được classify  
**Output:** Signal class + decision  
**Ledger:** Attempts, responses, response quality, next action

**Signal Classification:**

| Class | Dấu hiệu | Bước tiếp theo |
|---|---|---|
| 🟢 Green | Reply tích cực, hỏi thêm, book call, mua | Double down |
| 🟡 Yellow | Reply nhưng vague, "cảm ơn", "để sau", forward cho người khác | Iterate 1 biến |
| 🔴 Red | Không có reply sau đủ attempts, reply tiêu cực rõ ràng | Classify drift, route về phase phù hợp |

**Drift detection:** So sánh người đã reply với ICP card gốc. Ghi rõ nếu drift xuất hiện.

**Milestone prompt M2 — paste vào session tiếp theo:**
```
M2 COMPLETE
Attempts gửi: [số] qua [channel]
Replies nhận: [số]
Reply rate: [%]
Nội dung replies (paste hoặc tóm tắt):
  Reply 1: [ai / nội dung ngắn / positive/negative/neutral]
  Reply 2: [...]
Signal class: [🟢 Green / 🟡 Yellow / 🔴 Red]
Drift xuất hiện: [không có / có — mô tả]
```

---

### M3 — Conversation Gate

**KPI:** Ít nhất 1 cuộc trò chuyện thực sự với ICP  
**Output:** Drift check từ conversation  
**Ledger:** Who responded, drift appeared, what to change

**Trong conversation, thu thập:**
- Họ mô tả problem bằng ngôn ngữ của chính họ (→ cập nhật ICP card language)
- Trigger moment của họ (→ so sánh với hypothesis)
- Current workaround (→ cập nhật competitor map nếu chưa có)
- Phản ứng với offer (→ classify anxiety/habit nếu không convert)

**Milestone prompt M3 — paste vào session tiếp theo:**
```
M3 COMPLETE
Conversations diễn ra: [số]
Người nói chuyện: [role, company — không cần tên đầy đủ]
ICP match: [đúng hoàn toàn / gần đúng / không đúng]
Language họ dùng để mô tả problem: [quote trực tiếp nếu có]
Trigger moment họ nêu: [so với hypothesis ban đầu]
Current workaround: [họ đang dùng gì]
Drift status: [không có / minor — mô tả / major — mô tả]
Tín hiệu về offer: [quan tâm / do dự / từ chối — và tại sao]
```

---

### M4 — First Ask

**KPI:** Offer được đưa ra  
**Output:** Response được capture  
**Ledger:** Ask wording, outcome, trust gap nếu có

**Trước khi ask, kiểm tra:**
- Trust signal đã đủ chưa (xem Venue card)
- Entry offer đủ low-friction chưa
- ICP đã hiểu được value proposition chưa

**Sau ask, classify:**
- Chấp nhận → Green signal → tiến tới M5
- Do dự nhưng không từ chối → Trust gap hoặc scope too big → route về Venue
- Từ chối rõ ràng → Classify reason → route về đúng layer

**Milestone prompt M4 — paste vào session tiếp theo:**
```
M4 COMPLETE
Offer được đưa ra: [mô tả entry offer — price, format, scope]
Ask wording (paste nếu có): [...]
Response:
  Chấp nhận: [số / %]
  Do dự: [số — lý do họ nêu]
  Từ chối: [số — lý do họ nêu]
Trust gap phát hiện: [có / không — mô tả]
Scope issue: [có / không — mô tả]
```

---

### M5 — Full Debrief

**KPI:** Final classification  
**Output:** Go / No-go / Pivot decision  
**Ledger:** Full decision impact + next checkpoint

**Decision framework:**

| Outcome | Điều kiện | Decision |
|---|---|---|
| Go | ≥ 1 conversion (mua / commit / pay) với đúng ICP | Double down, chuẩn bị multiplier |
| Iterate | Green/Yellow signal nhưng chưa convert | Chọn 1 layer để thay đổi (xem Recovery Routing) |
| Pivot | Red signal sau ≥ 3 full cycles qua đúng ICP | Chẩn đoán layer sâu hơn: ICP hay product |
| Stop | Red signal + evidence cho thấy problem không đủ acute | Dừng lại, không waste thêm runway |

**Milestone prompt M5 — paste vào session tiếp theo:**
```
M5 COMPLETE — FULL DEBRIEF
Tổng attempts: [số]
Tổng conversations: [số]
Conversions: [số — và loại: mua / commit / interest / none]
Signal trajectory: [Green từ đầu / bắt đầu Red rồi cải thiện / Red xuyên suốt]
Drift summary: [không có / đã xảy ra và xử lý thế nào]
Decision: [Go / Iterate / Pivot / Stop]
Layer cần thay đổi nếu Iterate/Pivot: [ICP / channel / angle / venue / trust signal / scope / none]
Next checkpoint: [ngày và mục tiêu cụ thể]
```

---

## Recovery Routing

Khi drift xuất hiện, không chỉ nói "iterate". Chọn đúng layer:

| Drift Type | Layer cần fix | Hành động cụ thể |
|---|---|---|
| `wrong ICP` | ICP (Phase 1) | Narrow who, update evidence tags, không thay channel |
| `wrong channel` | Channel (Phase 3–4) | Re-score candidates còn lại trong list |
| `wrong angle` | Thesis — angle field only | Thay hook, giữ channel + venue |
| `wrong venue` | Venue (Phase 6) | Thay buying environment + CTA |
| `weak trust signal` | Venue — trust signal only | Thêm proof, testimonial, before/after |
| `too much scope` | Venue — entry offer | Simplify entry, giảm commitment ask |
| `too much noise` | Channel (Phase 3–4) | Chọn channel ít crowded hơn từ candidate list |

> **Quy tắc phục hồi:** Correction nhỏ nhất giải thích được drift = correction đúng. Đừng rebuild từ đầu khi chỉ cần sửa 1 layer.

---

## Trauma Log

Ghi lại repeated failure patterns để nhận ra pattern — không phải để tự blame.

```
PATTERN:    [điều gì cứ thất bại]
ATTEMPTS:   [đã thử bao nhiêu lần]
HYPOTHESIS: [tại sao nó đang thất bại]
ACTION:     [đã thay đổi gì / sẽ thay đổi gì]
```

---

## Confidence Rules

- Confidence KHÔNG tăng mà không có new evidence.
- Weak data KHÔNG được promote lên strong signal.
- Repeated contradiction PHẢI lower confidence và trigger route change.

---

## Vietnamese note

Signal phase là nơi duy nhất trong VECTOR mà reality check diễn ra. Tất cả các phases trước đó đều là hypothesis. M0–M5 là lúc hypothesis gặp thị trường thực tế. Mỗi milestone prompt được thiết kế để user paste đúng data vào — không phải kể chuyện, không phải báo cáo. Càng structured dữ liệu paste vào, agent càng đưa ra được correction chính xác hơn.
