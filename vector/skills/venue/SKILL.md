---
name: vector-venue
version: 2.0.0
description: "Phase 6 skill for VECTOR. Defines where the offer is sold, how the product is packaged, and what trust must exist before launch. Owns ALL venue-specific fields — thesis does not."
---

# Venue & Product Architecture Skill v2.0

## Goal

Chọn buying environment và offer structure phù hợp với channel behavior — mà không rewrite thesis đã lock.

---

## Ranh giới Venue / Thesis

Venue skill **sở hữu** các quyết định sau. Chúng không thuộc về thesis card:

- Sales venue cụ thể (loại môi trường conversion)
- Product architecture (entry / core / upsell)
- Trust signal cần thiết trước launch
- Venue risk
- ICP drift check (dấu hiệu drift cụ thể từ venue)
- Primary CTA

Venue skill **không được** thay đổi:
- Primary channel (từ thesis)
- Angle / hook (từ thesis)
- Growth multiplier type (từ thesis)

> Nếu venue design đòi hỏi thay primary channel → đó là signal thesis cần review, không phải venue cần extend.

---

## Inputs cần có

- Thesis card (đã locked)
- ICP card (đã cleared gate, focus vào trust threshold và anxiety)
- Channel context (primary channel behavior = gì người mua expect?)

---

## What this skill must answer

1. Người mua đã sẵn trust seller ở đâu?
2. Format nào match với natural behavior của channel?
3. Entry offer nhỏ nhất vẫn prove được demand là gì?
4. Trust signal nào cần có trước first sale?
5. Venue risk nào có thể break launch?
6. Dấu hiệu cụ thể nào cho thấy ICP đã drift?

---

## Venue Types

| Type | Khi nào phù hợp |
|---|---|
| Direct call | ICP expects high-touch; trust threshold cao |
| DM / chat | ICP đã comfortable với async; deal size thấp-trung |
| Community thread | ICP congregates ở specific community; founder có presence |
| Marketplace | ICP đang actively search; category đã established |
| Async audit / teardown | ICP muốn proof trước khi commit |
| Paid workshop | ICP muốn learn trước khi buy; educational trust path |
| Subscription / recurring | ICP cần ongoing support; trust đã established |

---

## Product Architecture

Cấu trúc tốt thường tách biệt 3 tầng:

| Tầng | Mục tiêu | Đặc điểm |
|---|---|---|
| **Entry** | Low friction, fast proof of value | Reversible, low commitment, rõ outcome |
| **Core** | Main value delivery | Đủ để solve problem chính |
| **Upsell** | Expanded support / depth / reach | Chỉ cần khi demand từ buyer |

> Nếu chưa rõ upsell: ghi "locked — pending signal" thay vì bịa ra.

---

## Trust Signal Framework

Trust signal phải đủ để buyer take first action — không phải để impress tổng quát.

Calibrate theo anxiety level của ICP:
- **High anxiety** (big switching cost, career risk): cần case study, peer testimonial, trial/guarantee
- **Medium anxiety** (uncertain ROI): cần before/after example, concrete outcome, social proof
- **Low anxiety** (motivated buyer, urgent problem): cần chỉ một proof of competence

Không thêm trust signals vượt mức cần thiết — mỗi tầng trust signal thêm vào = thêm friction.

---

## Canonical Output

```text
SALES VENUE:
  Name:    [tên loại venue]
  Why:     [tại sao venue này fit channel behavior và buyer trust level]
  Format:  [cụ thể: DM → calendar link / community post → reply thread / v.v.]

PRODUCT ARCHITECTURE:
  Entry:  [format] — [price] — [purpose — outcome cụ thể buyer nhận]
  Core:   [format] — [price] — [purpose]
  Upsell: [format] — [price] — [purpose / "locked — pending signal"]

TRUST SIGNAL NEEDED:
  Level:    [high / medium / low — từ ICP anxiety]
  Required: [cụ thể: 1 before/after + 1 peer testimonial / v.v.]
  Status:   [có rồi / cần build / không cần ở stage này]

VENUE RISK:
  Main risk:            [điều gì likely nhất sẽ break launch]
  What would cause failure: [dấu hiệu cụ thể của failure mode]
  Mitigation:           [cách giảm risk này]

ICP DRIFT CHECK:
  What counts as drift: [dấu hiệu cụ thể: sai role / sai company size / sai trigger]
  What to do:           [tighten ICP / tighten channel filter / không thay venue]

PRIMARY CTA:
  One action only: [động từ + outcome: "Book 20-min teardown" / "Reply 'YES' để nhận audit"]
```

---

## Example

```text
SALES VENUE:
  Name:    Founder-led async teardown
  Why:     ICP (technical founders, skeptical) muốn thấy proof of insight
           trước khi commit time. Async teardown tạo low-risk first touch.
  Format:  DM với link → Loom video teardown → Book call nếu quan tâm

PRODUCT ARCHITECTURE:
  Entry:  Async teardown (Loom) — free — prove fit + demonstrate insight
  Core:   Implementation sprint (4 sessions) — $1,500 — deliver core result
  Upsell: Monthly advisory — $500/tháng — maintain momentum (locked — pending signal)

TRUST SIGNAL NEEDED:
  Level:    Medium (ROI uncertain, switching cost moderate)
  Required: 1 before/after example (same role/industry) + 1 short testimonial
  Status:   Before/after có, testimonial cần build trong M3–M4

VENUE RISK:
  Main risk:            Buyer muốn proof trước khi watch teardown
  What would cause failure: Không có warm referral hoặc mutual connection để validate
  Mitigation:           Lead với mutual connection hoặc shared community context khi có

ICP DRIFT CHECK:
  What counts as drift: Replies từ non-technical roles / companies > 50 người /
                        buyers muốn "done for you" thay vì "done with you"
  What to do:           Tighten outreach filter — không thay venue

PRIMARY CTA:
  One action only: "Reply 'YES' để tôi gửi teardown trong 48h"
```

---

## Gate Checklist — Venue → Signal

```
☐ Sales venue được chọn với lý do (không chứa venue-related fields từ thesis)
☐ Product architecture có entry / core / upsell (hoặc entry / core nếu chưa rõ upsell)
☐ Trust signal cần thiết được xác định
☐ Primary CTA là 1 hành động duy nhất
☐ ICP drift check được viết ra (cụ thể: dấu hiệu gì = drift)
☐ Venue risk được ghi nhận
```

---

## Writing Rules

- Giữ venue aligned với channel (DM venue ≠ webinar venue)
- Giữ offer aligned với buyer's trust level
- Nếu buyer không thể giải thích tại sao venue này đáng tin → venue chưa ready
- Không thêm packaging complexity chỉ vì nó "feel premium"
- Upsell không bắt buộc phải defined ngay — "locked" là acceptable

---

## Vietnamese note

Venue tốt là nơi người mua đã sẵn tin một phần — không phải nơi founder thấy mình trông professional nhất. Một cuộc DM có thể close deal nhanh hơn một landing page đẹp nếu ICP expect DM. Match buyer expectation, không phải founder preference.
