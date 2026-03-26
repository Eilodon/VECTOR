---
name: vector-channel
version: 2.0.0
description: "Phase 3–4 skill for VECTOR. Scores channels with stage-weighted dimensions, runs Founder Edge Audit, drafts playbooks, and decides which channel deserves the primary bet."
---

# Channel Skill v2.0

## Goal

Chọn channel có expected signal cao nhất trên mỗi đơn vị effort — calibrated theo stage hiện tại của founder.

---

## Bước 1 — Founder Edge Audit (chạy trước khi score)

Trước khi chấm điểm bất kỳ channel nào, chạy Founder Edge Audit. Mục tiêu: đo **Builder Advantage thực tế** thay vì để founder tự ước lượng (thường bị overestimate).

Với mỗi channel đang xem xét, trả lời 5 câu hỏi sau (mỗi câu = 1 điểm nếu Yes):

```
FOUNDER EDGE AUDIT — [tên channel]

☐ Tôi có audience / network sẵn ở đây không?
  (Ví dụ: followers, community membership, warm contacts)

☐ Tôi đã từng tạo traction ở channel này chưa?
  (Ví dụ: đã từng đăng nội dung nhận được engagement, đã từng DM thành công)

☐ ICP ở channel này có thể nhận ra credibility của tôi không?
  (Ví dụ: title, portfolio, track record họ có thể verify)

☐ Tôi có thể tạo nội dung / outreach ở channel này nhanh hơn người khác không?
  (Ví dụ: domain expertise, insider language, access to examples)

☐ Tôi có mối quan hệ với người có thể mở cửa vào channel này không?
  (Ví dụ: connector, community moderator, partner)
```

**Scoring:** Tổng Yes = Builder Advantage score (0–5).
Không round up. Không điền "4" nếu chỉ có 2 Yes.

---

## Bước 2 — Stage-Weighted Channel Scoring

### Lý do dùng weighted scoring

Không phải 5 chiều đều quan trọng như nhau ở mọi stage. Ở 0→1, **Speed to Signal** và **Cost to Test** quyết định liệu founder có đủ runway để học hay không. **Scalability** chỉ quan trọng khi đã có gì đó để scale.

Dùng sai weight = founder 0→1 có thể chọn SEO/content (Scalability = 5) trong khi cần tín hiệu trong 30 ngày.

### 5 Dimensions

1. **ICP Match** — ICP đã có ở đây chưa? Họ có active không?
2. **Builder Advantage** — Điểm từ Founder Edge Audit ở Bước 1
3. **Speed to Signal** — Bao lâu mới biết được có tín hiệu?
4. **Cost to Test** — Thử nghiệm đầu tiên tốn bao nhiêu?
5. **Scalability** — Channel này có thể compound về sau không?

### Scoring Rubric (1–5)

| Score | Meaning |
|---|---|
| 1 | weak / mostly guesswork |
| 2 | possible but expensive or noisy |
| 3 | workable with caveats |
| 4 | strong and testable |
| 5 | clearly advantaged |

### Stage Weight Multipliers

| Dimension | 0→1 | 1→10 | 10→100 |
|---|---|---|---|
| ICP Match | 1.5× | 1.5× | 1.0× |
| Builder Advantage | 1.5× | 1.0× | 0.5× |
| Speed to Signal | 2.0× | 1.0× | 0.5× |
| Cost to Test | 2.0× | 1.0× | 0.5× |
| Scalability | 0.5× | 1.5× | 2.0× |
| **Max weighted raw** | **35** | **30** | **25** |

### Normalization Rule

```
Weighted raw = (ICP×w) + (BA×w) + (STS×w) + (CTT×w) + (SC×w)
Score (0–100) = (Weighted raw / Max weighted raw) × 100
```

### Score Interpretation

| Score | Interpretation | Action |
|---|---|---|
| 0–49 | weak | không chọn làm primary channel |
| 50–74 | promising | giữ làm candidate hoặc secondary motion |
| 75–100 | strong | có thể chọn làm primary nếu evidence supports |

---

## Ví dụ tính điểm — Stage 0→1

Một founder 0→1 đang xem xét LinkedIn Direct Outreach:

```
Founder Edge Audit:
  ☑ Có 800 LinkedIn connections trong đúng ICP industry
  ☑ Đã từng nhận replies từ cold DM
  ☑ ICP có thể xem profile và thấy track record
  ☐ Không viết nhanh hơn người khác
  ☐ Không có warm intro
  Builder Advantage = 3

Raw scores:
  ICP Match         = 4 × 1.5 = 6.0
  Builder Advantage = 3 × 1.5 = 4.5
  Speed to Signal   = 4 × 2.0 = 8.0
  Cost to Test      = 5 × 2.0 = 10.0
  Scalability       = 2 × 0.5 = 1.0

Weighted raw = 29.5 / 35
Score = (29.5 / 35) × 100 = 84 → STRONG ✓
```

So sánh với SEO Content cho cùng founder, stage 0→1:

```
  ICP Match         = 3 × 1.5 = 4.5
  Builder Advantage = 2 × 1.5 = 3.0
  Speed to Signal   = 1 × 2.0 = 2.0  ← SEO cần 3–6 tháng để có signal
  Cost to Test      = 3 × 2.0 = 6.0
  Scalability       = 5 × 0.5 = 2.5

Weighted raw = 18.0 / 35
Score = (18.0 / 35) × 100 = 51 → PROMISING — không chọn làm primary ở 0→1
```

Với hệ thống unweighted cũ, SEO có thể score cao hơn LinkedIn vì Scalability = 5. Stage-weighted scoring ngăn điều này.

---

## Output Template

```text
CHANNEL: [tên channel]
STAGE: [0→1 / 1→10 / 10→100]

FOUNDER EDGE AUDIT:
  Network / audience: [Yes/No]
  Track record: [Yes/No]
  Credibility recognizable: [Yes/No]
  Speed advantage: [Yes/No]
  Warm door opener: [Yes/No]
  Builder Advantage Score: [X/5]

SCORING (Stage: [stage]):
  ICP Match:         [1–5] × [weight] = [weighted]  — [lý do]
  Builder Advantage: [1–5] × [weight] = [weighted]  — [từ audit]
  Speed to Signal:   [1–5] × [weight] = [weighted]  — [lý do]
  Cost to Test:      [1–5] × [weight] = [weighted]  — [lý do]
  Scalability:       [1–5] × [weight] = [weighted]  — [lý do]

  Weighted raw:    [X / max]
  Normalized:      [X / 100]
  Threshold:       [weak / promising / strong]

WHY THIS CHANNEL:     [một đoạn grounded in ICP + stage + evidence]
FIRST TEST:           [time-boxed, concrete experiment]
FAILURE SIGNAL:       [dấu hiệu cụ thể cho thấy channel này không work]
WHY NOT THE OTHERS:   [từng channel bị loại + lý do ngắn gọn]
```

---

## Guardrails

- Không để "future scale" outrank present signal khi stage = 0→1.
- Không chọn channel vì nó nghe sophisticated.
- Không coi content quality là substitute cho ICP fit.
- Không switch sang primary channel thứ hai trước khi channel đầu tiên được test honestly.
- Builder Advantage phải lấy từ Founder Edge Audit — không tự điền.

---

## Vietnamese note

Chấm điểm channel là cam kết chiến lược, không phải brainstorm. Sau khi có score, không thay đổi rubric để justify kênh mình thích. Stage-weighted scoring tồn tại vì founder 0→1 cần sống sót 30 ngày đầu — không phải build SEO moat.
