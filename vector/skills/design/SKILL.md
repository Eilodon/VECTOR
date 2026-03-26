---
name: vector-design
version: 2.0.0
description: "Support skill for VECTOR. Called after Thesis + Venue are locked. Turns a locked thesis into simple, production-ready visual direction for landing pages, social assets, carousels, and hero creatives."
---

# Design Skill v2.0

## Khi nào được gọi

Đây là **support skill** — không tự chạy. Orchestrator gọi theo routing table:

| Trigger | Phase | Lý do gọi |
|---|---|---|
| Thesis đã locked + Venue đã cleared + cần landing page / asset | Phase 6 (sau Venue) | Visual direction cho launch asset |
| User yêu cầu design review trước khi ship | Bất kỳ lúc nào sau Venue | QA visual layer |

**Không gọi design skill khi:** Thesis chưa locked. Venue chưa cleared. Strategy chưa được commit.

---

## Goal

Giữ visual layer aligned với thesis, channel, và venue — mà không biến VECTOR thành design brainstorm mơ hồ.

---

## Inputs cần có

- ICP card
- Thesis card (locked)
- Venue card (cleared)
- Primary CTA
- Trust signal requirement
- Asset format
- Channel context (visual standard của channel là gì?)

---

## Outputs

- Visual direction memo
- Layout hierarchy
- Typography / spacing guidance
- Color và contrast notes
- Component / section order
- Asset-specific do / do not list
- Optional prompt cho designer hoặc image generator

---

## Design Rules

- Design serves the thesis — không rewrite thesis.
- First screen phải làm next action rõ ràng.
- Trust signals phải xuất hiện trước decorative polish.
- Reduce visual choices khi channel là noisy.
- One visual hierarchy per asset.
- Design làm offer dễ tin hơn — không làm khó hiểu hơn.
- Match visual register của channel (LinkedIn ≠ TikTok ≠ email newsletter).

---

## Canonical Output Template

```text
OBJECTIVE:             [mục tiêu của asset — convert / educate / build trust]
AUDIENCE:              [ICP — từ ICP card]
ASSET TYPE:            [landing page / LinkedIn post / email header / carousel / v.v.]
CHANNEL:               [primary channel — ảnh hưởng đến visual style]
PRIMARY ACTION:        [CTA — từ venue card]

HEADLINE HIERARCHY:
  1. [clear pain — hoặc clear promise nếu buyer đã biết pain]
  2. [clear outcome — specific, not vague]
  3. [proof / trust signal]

TRUST SIGNAL PLACEMENT: [vị trí cụ thể — above fold / near CTA / sau headline]

LAYOUT STRUCTURE:
  [component order — headline → proof strip → benefit bullets → CTA → FAQ / v.v.]

VISUAL STYLE:          [calm / direct / energetic / editorial — và tại sao]
COLOR / CONTRAST NOTES: [high contrast text / limited palette / one accent color]

DO:
  - [...]
  - [...]

DO NOT:
  - [...]
  - [...]

CHECK BEFORE SHIPPING:
  ☐ First screen có giải thích được phải làm gì tiếp theo không?
  ☐ Trust signal có xuất hiện trước CTA không?
  ☐ Copy có nghe native với channel không?
  ☐ Chỉ có một primary action không?
  ☐ Visual có làm offer dễ tin hơn không?
```

---

## Example

```text
OBJECTIVE:             Convert technical founder thành booking teardown
AUDIENCE:              Solo technical founders, 1–5 người, stage 0→1
ASSET TYPE:            Landing page
CHANNEL:               LinkedIn (cold DM → link)
PRIMARY ACTION:        Book 20-min teardown

HEADLINE HIERARCHY:
  1. "Bạn biết product của mình tốt. Bạn chưa biết ai muốn mua nó ngay bây giờ."
  2. "Teardown 20 phút để tìm ra đúng ICP đầu tiên."
  3. Testimonial ngắn từ peer founder + outcome cụ thể

TRUST SIGNAL PLACEMENT: Above the fold, dưới headline — trước CTA

LAYOUT STRUCTURE:
  Headline → Pain statement → Proof strip (1–2 testimonials) →
  Benefit bullets (3 bullets tối đa) → CTA → FAQ (3–4 câu phổ biến nhất)

VISUAL STYLE: Calm, editorial, low-clutter — phù hợp với LinkedIn context
COLOR / CONTRAST NOTES: Dark text on white, one accent color, no gradients

DO:
  - Giữ copy ngắn — mỗi section tối đa 2–3 câu
  - Cho thấy một offer duy nhất
  - Đặt trust signal gần CTA

DO NOT:
  - Thêm decorative sections làm loãng CTA
  - Dùng stock photos generic
  - Liệt kê features thay vì outcomes

CHECK BEFORE SHIPPING:
  ☑ First screen giải thích rõ phải book teardown
  ☑ Testimonial xuất hiện trước CTA
  ☑ Copy phù hợp với LinkedIn DM context
  ☑ Một CTA duy nhất — "Book teardown"
  ☑ Layout không overwhelm với quá nhiều thứ
```

---

## Guardrails

- Không introduce positioning claim mới.
- Không để visual style hide weak strategy.
- Không add polish nhiều hơn buyer's trust threshold có thể support.
- Design không được contradict thesis — nếu có mâu thuẫn, flag lại trước khi proceed.

---

## Vietnamese note

Lỗi phổ biến nhất của founder Việt Nam khi làm landing page: thiết kế theo style họ thích, không phải style ICP expect. Founder trong tech thích minimal; nhưng nếu ICP là chủ doanh nghiệp truyền thống đang tìm vendor, họ expect nhiều thông tin hơn và social proof mạnh hơn. Match visual register với buyer — không với personal taste của founder.
