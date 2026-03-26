---
name: vector-icp
version: 2.0.0
description: "Phase 1 skill for VECTOR. Turns a vague product idea into a concrete job statement, ICP card, and 4 Forces map. Extracts assumptions, evidence, trigger moments, and willingness-to-pay signals."
---

# ICP / JTBD Skill v2.0

## Goal

Convert founder language mơ hồ thành market hypothesis sắc nét — đủ để score channel một cách có nghĩa.

---

## What to produce

1. Job statement một dòng.
2. ICP card sống (living hypothesis).
3. 4 Forces map (push / pull / anxiety / habit).
4. Riskiest assumption.
5. Evidence level cho mỗi claim.
6. Next experiment để reduce uncertainty.

---

## Discovery Ladder

### Level 1 — What is the product?
- Nó là gì?
- Ai dùng nó?
- Nó thay thế cái gì?
- Tại sao nó quan trọng lúc này?

### Level 2 — What job is it hired for?

Dùng JTBD frame:

> Khi [situation], tôi muốn [motivation], để tôi có thể [expected outcome].

### Level 3 — Who is the ICP exactly?

Thu thập:
- Role
- Company size / maturity
- Pain severity
- Trigger moment
- Current workaround
- Budget / willingness-to-pay signal
- Nơi họ đang congregate (watering holes)

### Level 4 — What evidence exists?

Phân biệt:
- Observed evidence (từ real conversation / real data)
- Founder belief (inferred từ experience)
- Wishful thinking (speculative — không có basis)
- External benchmark (benchmarked từ third-party source)

---

## 4 Forces of Progress

Mọi quyết định mua đều bị shape bởi 4 forces cạnh tranh nhau. Buyer chỉ convert khi push + pull outweigh anxiety + habit.

| Force | Định nghĩa | Copy job |
|---|---|---|
| **Push** | Pain, frustration, urgency đẩy họ rời khỏi hiện tại | Opening line, subject line |
| **Pull** | Promise rõ ràng về better outcome kéo họ về phía solution | Headline, CTA |
| **Anxiety** | Fear of switching cost, fear it won't work, career risk | Trust signal, guarantee, reversible entry offer |
| **Habit** | "Tạm ổn rồi", workflow đã embedded, chưa thấy urgent | Entry offer price, time commitment, scope |

> **Buyer switch khi:** Push + Pull > Anxiety + Habit.  
> Nếu leads interested mà không convert: Anxiety hoặc Habit đang thắng. Kiểm tra entry offer và trust signal.

### Switch Moment

Decision của buyer thường bắt đầu trước khi họ contact bạn. Reconstruct timeline backwards:

*"Lần đầu tiên bạn nghĩ mọi thứ cần thay đổi là khi nào?"*  
→ *"Điều gì xảy ra giữa lúc đó và lúc này?"*

---

## Strong ICP Signals

- Họ đang trả tiền cho một workaround
- Họ hỏi về implementation hoặc pricing
- Họ có time-sensitive trigger
- Họ self-identify với problem
- Họ đã gather ở một known watering hole
- Họ đã cố solve internally và fail

## Weak ICP Signals

- "Anybody can use it"
- "Chúng tôi chỉ cần thêm features"
- Không có trigger moment
- Không có explicit pain
- Không có anxiety về việc không thay đổi (habit force quá mạnh)
- Không có evidence về willingness to pay

---

## Output Format

```text
JOB STATEMENT:
Khi [situation], [target user] muốn [job], để họ có thể [outcome].

ICP CARD:
Who:            [role, company size, maturity]
Core problem:   [specific pain — không phải category]
Trigger moment: [event nào khiến họ act now]
Watering holes: [nơi họ đang congregate]
WTP signal:     [evidence về willingness to pay]

4 FORCES MAP:
Push (đang đẩy họ đi):     [pain, frustration cụ thể]
Pull (đang kéo họ đến):     [outcome họ muốn, picture được]
Anxiety (cản switch):       [fear cụ thể — switching cost, career risk, ROI unclear]
Habit (inertia):            [workaround hiện tại, "tạm ổn" belief]

EVIDENCE TAGS:
Who:            [observed / inferred / benchmarked / speculative]
Core problem:   [observed / inferred / benchmarked / speculative]
Trigger moment: [observed / inferred / benchmarked / speculative]
WTP signal:     [observed / inferred / benchmarked / speculative]
4 Forces:       [observed / inferred / benchmarked / speculative]

RISKIEST ASSUMPTION: [một câu]
CONFIDENCE:          [low / medium / high]
DRIFT STATUS:        [stable / drifting — mô tả]
TOP UNKNOWN:         [điều gì sẽ thay đổi card này nhất nếu biết]
NEXT EXPERIMENT:     [test nhỏ nhất để reduce uncertainty]
```

---

## Decision Rule

Không move sang Market cho đến khi:
- ICP card ít nhất plausible (không phải "đúng", là "có thể đúng")
- Riskiest assumption được đặt tên rõ ràng
- 4 Forces được map (dù mức độ "speculative")

---

## Living Hypothesis Rules

- ICP card là living hypothesis, không phải static description.
- Câu hỏi không phải "Cái này có perfect không?" mà là "Cái gì sẽ làm nó narrower, sharper, hoặc sai?"
- Nếu first real responders khác với hypothesis: ghi drift ngay, không hide bằng cách widen definition.

---

## ICP Kill-Switch

Nếu job statement không thể nói trong 1 câu mà không cần hand-waving: ICP work chưa done.  
Nếu 4 Forces không map được (anxiety = null, habit = null): chưa đủ customer conversations.  
Return về Intake fallback nếu cần thêm data trước khi proceed.

---

## Vietnamese note

ICP mơ hồ = channel score là đoán mò. 4 Forces không phải lý thuyết marketing — là checklist để biết tại sao người mua không convert dù đã interested. Nếu anxiety = null, bạn chưa hỏi đủ câu khó.
