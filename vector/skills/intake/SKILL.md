---
name: vector-intake
version: 2.0.0
description: "Phase 0 skill for VECTOR. Runs the structured cold-start interview to gather minimum viable input before ICP work begins. Seeds Founder Edge Audit with initial channel/network data."
---

# Intake Skill v2.0

## Goal

Thu thập minimum viable context để bắt đầu ICP work — mà không overwhelm founder hoặc để vague input poison các phases sau.

---

## Khi nào chạy

- Mọi project mới (chưa có KB)
- Sau major pivot (product definition thay đổi)
- Khi KB có `phase: intake` và `milestone: M0`

---

## Interview Rules

- Hỏi tối đa **2 câu mỗi lượt**.
- Không hỏi "target market của bạn là ai?" ở câu đầu tiên — câu hỏi quá rộng → trả lời vague.
- Hỏi về **problem trước** khi hỏi về product.
- Nếu câu trả lời của founder ngụ ý câu trả lời thứ hai → **extract thay vì hỏi lại**.
- Mark mỗi input là `observed` / `inferred` / `speculative`.
- Không move sang ICP khi gate chưa fully green.

---

## Interview Sequence

### Turn 1 — Problem và Product

Hỏi:
1. Bạn đang giải quyết vấn đề gì, và ai là người chịu vấn đề đó nặng nhất?
2. Product của bạn làm gì — trong một câu, không có jargon?

### Turn 2 — Context và Timing

Hỏi:
1. Tại sao vấn đề này cần giải quyết ngay bây giờ? Điều gì thay đổi gần đây khiến đây là thời điểm đúng?
2. Bạn đã nói chuyện với potential users hoặc customers chưa? Nếu có, bạn nghe được gì?

### Turn 3 — Evidence và Constraints

Hỏi:
1. Có ai đã trả tiền cho điều này, hoặc thể hiện willingness to pay mạnh chưa?
2. Constraint lớn nhất của bạn bây giờ là gì — thời gian, tiền, access, hay credibility?

### Turn 4 — Founder Fit (chỉ hỏi nếu chưa rõ từ các câu trước)

Hỏi:
1. Điều gì cho bạn edge ở đây — insider knowledge, existing network, hay prior experience?
2. Bạn đã có access vào channel hoặc community nào rồi?

> **Lưu ý quan trọng:** Câu 4.2 là **seed data cho Founder Edge Audit** sẽ chạy chính thức ở Channel phase. Ghi nhận vào KB dưới `founder_edge_audit` ngay cả khi còn sơ bộ.

---

## Gate Checklist — Intake → ICP

Tất cả **6 điều kiện** phải confirmed trước khi proceed:

```
☐ Product mô tả được trong một câu (không cần jargon)
☐ Problem được đặt tên cụ thể (không phải "inefficiency" hay "pain point" chung)
☐ Ít nhất 1 target persona được giả định (role + context cụ thể)
☐ Lý do "tại sao bây giờ" tồn tại (market shift, timing, hoặc personal trigger)
☐ Ít nhất 1 constraint được ghi nhận (time / money / access / credibility)
☐ Evidence level được tag (observed / inferred / speculative)
```

Nếu bất kỳ item nào chưa checked: hỏi **1 câu targeted** để fill gap. Không move sang ICP với intake half-complete.

---

## Output — Intake Summary

```text
INTAKE SUMMARY

Product:                    [một câu, không jargon]
Problem:                    [một câu — pain cụ thể, không phải feature]
Target persona:             [role + context — hypothesis only, không phải final ICP]
Why now:                    [timing trigger hoặc market pressure cụ thể]
Evidence level:             [observed / inferred / speculative]
Constraint:                 [time / money / access / credibility — cụ thể]
Founder edge:               [insider knowledge / network / experience / none stated]
Known channels/communities: [list hoặc "unknown"]
Early network signals:      [warm contacts ở target community? y/n + context]
Riskiest assumption going into ICP: [đặt tên nó — một câu]

GATE STATUS:
☐/☑ Product mô tả 1 câu
☐/☑ Problem cụ thể
☐/☑ Persona giả định
☐/☑ Why now
☐/☑ Constraint
☐/☑ Evidence tagged
Next gate: ICP phase
```

---

## Handoff

- Pass Intake Summary sang ICP skill.
- Write summary vào KB dưới `product` và `icp.hypothesis`.
- Ghi early network signals vào `founder_edge_audit` (sơ bộ — sẽ formalize ở Channel phase).
- Set `milestone: M0` → `M1` và `gates.intake_cleared: true` trước khi move sang ICP.

---

## What Not To Do

- Không hỏi về pricing trước khi problem rõ.
- Không hỏi về business model trong intake.
- Không chấp nhận "everyone" hoặc "SMBs" là target persona — push cho **một role cụ thể**.
- Không move on nếu founder chỉ có thể mô tả problem bằng cách list features.

---

## Fallback

Nếu founder chỉ trả lời một dòng và không muốn elaborate:
1. Offer prompt: *"Bạn có thể mô tả người thật gần nhất đã gặp vấn đề này và họ làm gì với nó không?"*
2. Nếu vẫn thin: hỏi họ paste bất kỳ research, customer messages, hay notes nào → extract intake từ đó.

---

## Vietnamese note

Intake tốt không phải là hỏi nhiều câu — là hỏi đúng câu theo đúng thứ tự để founder không phòng thủ. Founder hay phòng thủ khi cảm thấy bị test. Hỏi về người thật và vấn đề thật trước khi hỏi về ý tưởng của họ — vì họ tự tin về người thật hơn là về ý tưởng.
