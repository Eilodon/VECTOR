---
name: vector-thesis
version: 2.0.0
description: "Phase 5 skill for VECTOR. Commits to a primary channel, defines the growth multiplier, and builds the thesis card. Thesis card does NOT contain venue-specific fields — those belong to venue.md."
---

# Thesis Skill v2.0

## Goal

Biến research thành một hướng đi duy nhất được cam kết — không phải brainstorm dài hơn.

---

## Ranh giới Thesis / Venue (boundary rule)

Đây là ranh giới quan trọng nhất của phase này.

**Thesis card quyết định:**
- Primary channel (kênh nào?)
- Angle (hook cụ thể nào?)
- Growth multiplier (khi nào và loại gì?)
- Unlock condition (điều kiện để scale)
- Reversibility (khó đổi không nếu sai?)

**Thesis card KHÔNG quyết định:**
- Sales venue cụ thể (→ venue.md)
- Product architecture / tiers (→ venue.md)
- Trust signal cụ thể cần thiết (→ venue.md)
- Primary CTA (→ venue.md)
- ICP drift check (→ venue.md)

> **Lý do phân tách:** Thesis là *channel commitment*. Venue là *buying environment design*. Hai thứ này có thể thay đổi độc lập nhau: có thể giữ nguyên thesis (LinkedIn direct outreach) nhưng thay venue (từ DM → book a call → async teardown). Merge chúng sẽ làm mỗi lần chỉnh venue = phải rebuild thesis.

---

## What this phase decides

Phase 5 quyết định growth thesis, không phải sales packaging.  
Phải lock:
- Primary channel
- Angle
- Growth multiplier (type hoặc "not yet")
- Unlock condition
- Reversibility path

Venue gate đến ngay sau và không được blend vào đây.

---

## Growth Multiplier Types

| Type | Meaning | Trigger |
|---|---|---|
| Type A | Second channel | Good conversion, low traffic |
| Type B | Product tier / bundle | Buyers ask for more |
| Type C | Second venue | Venue risk hoặc saturation |
| Type D | Advocacy loop | Organic sharing hoặc referral signal |

---

## Stage Rules

- **0→1:** Đúng 1 primary channel. Growth multiplier = "not yet" là acceptable.
- **1→10:** 1 primary channel + 1 multiplier sau green signal.
- **10→100:** 1 primary channel + 1 multiplier + 1 controlled experiment.

---

## Thesis Card

Thesis card phải ngắn, decision-ready, và explicit về điều gì sẽ phá vỡ nó.

```text
PRODUCT:             [tên]
ICP:                 [một câu — từ ICP card]
STAGE:               [0→1 / 1→10 / 10→100]
RISKIEST ASSUMPTION: [một câu — thứ gì likely nhất sẽ sai]

PRIMARY CHANNEL:     [tên channel — từ channel scorecard]
CHANNEL SCORE:       [X/100 — từ stage-weighted scoring]
WHY THIS CHANNEL:    [lý do grounded in evidence + stage]
ANGLE:               [hook hoặc entry point cụ thể]
UNFAIR ADVANTAGE:    [điều gì làm founder credible ở channel này]

GROWTH MULTIPLIER:   [Type A / B / C / D — hoặc "not yet"]
UNLOCK CONDITION:    [điều gì phải đúng trước khi add multiplier]

REVERSIBILITY:       [khó / medium / dễ — tại sao]
CONFIDENCE:          [low / medium / high — với lý do cụ thể]

EVIDENCE USED:       [list key evidence inform thesis này]
ALTERNATIVES REJECTED: [các channel đã xem xét nhưng không chọn + lý do ngắn]
```

---

## Venue Handoff

Nếu thesis đã locked:
- Pass thesis card sang venue skill.
- Venue skill được phép refine: sales venue, trust signal, product architecture.
- Venue skill **không được** rewrite primary channel decision từ thesis.
- Nếu venue skill phát hiện thesis card có venue-specific fields: trả lại cho user để làm rõ.

---

## What Good Looks Like

Thesis card tốt phải trả lời được:
- Tại sao channel này, lúc này?
- Tại sao founder này có thể win ở đây?
- Cái gì phải đúng để scale?
- Cái gì sẽ phá vỡ thesis này?

Nếu không trả lời được → thesis chưa done.

---

## Thesis Kill-Switch

Nếu thesis card cần nhiều hơn 1 trang để explain: chưa đủ committed.  
Nếu primary channel vẫn là "A hoặc B": chưa decided.  
Nếu confidence = "không biết": cần thêm data — return về Market hoặc Channel.

---

## Vietnamese note

Thesis là lời cam kết có điều kiện — không phải điều chắc chắn, nhưng là điều rõ ràng nhất bạn có thể cam kết với evidence hiện tại. "Không chắc" không phải là thesis. Chọn một hướng và ghi rõ tại sao bạn sai được phép sai theo cách đó.
