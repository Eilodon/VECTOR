---
name: vector-salescopy
version: 2.0.0
description: "Support skill for VECTOR. Converts locked strategy into sales copy, DM copy, landing copy, CTA variants, and launch-ready message matrices. Includes Objection Identification Protocol grounded in 4 Forces."
---

# Sales Copy Skill v2.0

## Goal

Biến thesis và venue hiện tại thành copy có thể dùng được — mà không bẻ cong chiến lược để cứu chữ.

---

## Inputs cần có trước khi chạy skill này

- ICP card (đã cleared gate)
- Thesis card (đã locked)
- Venue card (đã cleared gate)
- 4 Forces map (push / pull / anxiety / habit)
- Desired conversion step

Nếu bất kỳ input nào còn null: **không viết copy**. Return về phase tương ứng trước.

---

## Bước 1 — Objection Identification Protocol (chạy trước khi viết)

Objections không phải ngẫu nhiên. Chúng xuất phát từ Anxiety và Habit trong 4 Forces. Chạy protocol này trước để xác định đúng objection cần address — thay vì guess.

### 3-step protocol

**Step 1: Extract Anxiety từ ICP card**
```
Từ ICP card, tìm:
  - Switching cost cao? → Objection: "Quá tốn công để chuyển đổi"
  - Fear of wrong decision? → Objection: "Nếu không work thì sao?"
  - Career risk? → Objection: "Nếu tôi quyết định sai, ai chịu trách nhiệm?"
  - ROI unclear? → Objection: "Tôi không biết liệu nó có đáng không"
```

**Step 2: Extract Habit từ ICP card**
```
Từ ICP card (current workaround), tìm:
  - Đang dùng workaround có vẻ "đủ tốt"? → Objection: "Cái tôi đang dùng tạm ổn rồi"
  - Workflow quá embedded? → Objection: "Đổi sẽ phá vỡ cả quy trình của tôi"
  - Chưa thấy urgency? → Objection: "Bây giờ chưa cần, để sau"
  - Không có ngân sách? → có thể là Habit (chưa prioritize) hoặc Anxiety (ROI unclear)
```

**Step 3: Map objection → copy job**
```
Objection Type      | Copy Job                         | Placement
--------------------|----------------------------------|------------------
Switching cost      | Làm switch nhỏ hơn thực tế       | Entry offer framing
Fear of wrong       | Reduce risk (reversible, trial)   | Trust signal, guarantee
Career risk         | Social proof từ peer role         | Testimonial
ROI unclear         | Outcome cụ thể, measurable        | Subheadline, body
"Đủ tốt rồi"        | Magnify cost of status quo        | Opening, pain hook
Workflow embedded   | "Bắt đầu từ một use case nhỏ"    | Entry offer scope
No urgency          | Intent signal + timing pressure   | Subject line, hook
```

**Output của protocol:**
```
PRIMARY OBJECTION: [1 objection dominant nhất]
TYPE: [Anxiety / Habit / cả hai]
COPY JOB: [làm gì với objection này trong copy]
PLACEMENT: [đặt ở đâu trong message]
SECONDARY OBJECTION: [nếu có]
```

---

## Bước 2 — Forces-Based Copy Architecture

Copy chỉ nói về features bỏ sót 3 trong 4 forces. Map copy vào tất cả bốn:

| Force | Copy job | Đặt ở đâu |
|---|---|---|
| Push (pain) | Làm situation hiện tại trông costly | Opening line, subject line |
| Pull (promise) | Làm outcome cảm thấy real và gần | Headline, CTA |
| Anxiety reduction | Xóa fear of being wrong | Trust signal, guarantee, entry offer framing |
| Habit override | Làm switching nhỏ hơn staying | Entry offer price, time commitment, reversibility |

Message chỉ address push + pull → generates interest.
Message address đủ cả 4 → generates conversion.

---

## Bước 3 — Relevance Over Personalization

Nhắc tên trường đại học hoặc job title = surface-level personalization, thêm noise chứ không thêm signal.

Real relevance = message về điều đang xảy ra trong *world của họ right now*:
- Recent hire, funding round, company announcement
- Problem vừa urgent do market shift
- Job posting cho thấy họ đang deal với exact pain bạn solve

Một câu context thật > năm câu product description.

Nếu không tìm được relevant signal: gửi ít hơn — không phải gửi generic hơn.

---

## Copy Rules

- Một message, một action
- Không feature dumping
- Không multiple CTAs trong cùng primary asset
- Match the venue (DM khác email, email khác landing page)
- Respect trust signal required by buyer
- Preserve thesis — không bẻ cong strategy để cứu chữ

---

## Message Matrix Template

Tạo copy theo matrix, không phải theo paragraph đơn:

```
VARIANT: [curiosity-led / pain-led / outcome-led / trust-led / urgency-led]

HOOK / SUBJECT LINE: [...]
SUBHEADLINE / OPENER: [...]
BODY (2–3 sentences max cho DM; longer cho email): [...]
OBJECTION PRE-HANDLE: [...]
TRUST SIGNAL NOTE: [...]
CTA: [1 action duy nhất]
```

### Variant Families

| Variant | Khi nào dùng |
|---|---|
| Curiosity-led | ICP active, đang explore — không biết problem đã được solved |
| Pain-led | ICP đang chịu pain rõ ràng, muốn empathy trước |
| Outcome-led | ICP đã biết problem, đang tìm solution cụ thể |
| Trust-led | ICP nghi ngờ hoặc đã thử solutions tương tự thất bại |
| Urgency-led | Có intent signal rõ (funding, hiring, event) |

---

## Copy QA Checklist (trước khi ship)

```
☐ Promise có believable không (không overclaim)?
☐ Wording có native với venue không?
☐ CTA có match với stage (awareness / consideration / decision)?
☐ Chỉ có một primary action?
☐ Copy có nằm trong thesis không (không tự bịa thêm claim)?
☐ Objection dominant đã được address chưa?
☐ Trust signal đã xuất hiện trước CTA chưa (nếu cần)?
```

---

## Copy Kill-Switch

Nếu copy phải **overclaim** để work → thesis hoặc venue sai.  
Nếu copy phải **hide the product** để không bị reject → ICP sai.  
Khi gặp kill-switch, return về phase tương ứng — không "patch bằng chữ hay".

---

## Vietnamese note

Copy hay nhất là copy founder không cần giải thích. Nếu phải giải thích tại sao copy này "thật ra hay", ICP chưa chắc đã hiểu như vậy. Test với người ngoài ngành trước khi ship.
