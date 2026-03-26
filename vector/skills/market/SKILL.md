---
name: vector-market
version: 2.0.0
description: "Phase 2 skill for VECTOR. Maps market terrain, competitor positioning, channel density, category stance, and white-space opportunities. Feeds Gold Zone candidates into Channel scoring."
---

# Market Terrain Skill v2.0

## Goal

Xác định ICP đang ở đâu, đối thủ đang làm gì, và khoảng trắng là gì — để Channel scoring có basis thực tế thay vì đoán.

---

## Inputs cần có

- ICP card (đã cleared gate, bao gồm 4 Forces)
- Stage confirmed (0→1 / 1→10 / 10→100)
- Known competitors hoặc adjacent substitutes
- Observed channels từ founder

---

## Process

### Step 1 — Competitive Alternatives (bắt đầu từ "do nothing")

Lỗi phổ biến nhất: liệt kê direct competitors trước tiên.  
Thứ tự đúng:

1. **Do nothing / stay the same** — buyer làm gì nếu product của bạn không tồn tại?
2. **Internal workaround** — spreadsheet, manual process, existing team, hired intern
3. **Workflow competitor** — một tool khác đang bị dùng sai để làm job này
4. **Substitute** — product khác, outcome giống nhau
5. **Direct competitor** — cùng job, cùng buyer intent, sản phẩm tương tự

Nếu bước 1 sai, mọi thứ downstream sẽ sai.  
Buyer "sẽ không làm gì" cần positioning khác với buyer đang actively evaluate competitors.

Với mỗi alternative, ghi:
- Job nó được hired for
- Primary weakness tại job đó
- Trust lever nó dùng
- Switching cost nó tạo ra

### Step 2 — Channel Heatmap

Score mỗi candidate channel trên 2 trục:
- ICP presence (high / medium / low)
- Competitor density (high / medium / low)

**Gold zone** = ICP presence cao + competitor density thấp.

Output: danh sách Gold Zone candidates để đưa vào Channel scoring.

### Step 3 — Stage Fit

| Stage | Best motion type |
|---|---|
| 0→1 | Direct, manual, personal |
| 1→10 | Repeat winning motion |
| 10→100 | Systematize one winning motion |
| 100+ | Layer new channels |

### Step 4 — Red Ocean Filter

Tránh channels mà:
- Tất cả đang shouting
- ICP vắng hoặc distracted
- Chi phí stand out quá cao cho stage hiện tại

### Step 5 — Category Stance Decision

Trước khi chọn channel, quyết định product đang ở vị trí nào:

| Stance | Nghĩa | GTM implication |
|---|---|---|
| Enter existing category | Buyers đã hiểu problem, đang shopping | Differentiate rõ từ known alternatives; position directly against them |
| Reframe existing category | Problem đã known nhưng frame sai | Reposition job buyers nghĩ họ đang làm; thay comparison set |
| Create new category | Buyers chưa biết mình có problem này | Phải sell problem trước, sau mới sell product; education cost cao |

> **Warning:** Hầu hết founders 0→1 overestimate buyers hiểu problem đến đâu. Default = "enter or reframe" trừ khi có strong evidence rằng new category thực sự cần thiết.

---

## White-Space Rubric

White space tốt không chỉ là "ít competition". Phải đáp ứng cả 4:

```
☐ ICP reachable (founder có thể tiếp cận được)
☐ Competitor density thấp (không invisible nhưng không crowded)
☐ Clear trigger moment (buyer có lý do act now)
☐ Believable trust path (buyer có thể trust được trong context này)
```

Nếu không đáp ứng tất cả 4: ghi lý do và flag cho Channel phase.

---

## Market Kill-Switch

Nếu market argument duy nhất là "category đang hot" → market work chưa xong.  
Nếu không xác định được "do nothing / stay the same" alternative → competitive analysis chưa complete.  
Nếu Gold Zone channels = empty → cần re-examine ICP watering holes trước khi proceed.

---

## Gate Checklist — Market → Channel

```
☐ Stage được xác nhận (0→1 / 1→10 / 10→100)
☐ Competitor map có ít nhất 3 loại (direct + substitute + workflow)
☐ Gold zone channels được xác định (≥ 2 candidates)
☐ Red ocean được ghi nhận
☐ Category stance được chọn (entering / reframing / creating)
☐ Kill switch check: không chỉ nói "category đang hot"
```

---

## Output Format

```text
MARKET TERRAIN REPORT
STAGE CONFIRMED: [0→1 / 1→10 / 10→100]
MARKET CATEGORY: [buyers hiện tại đang nghĩ về space này như thế nào]

CATEGORY STANCE:
  Stance:    [entering existing / reframing existing / creating new]
  Rationale: [tại sao stance này — evidence]

COMPETITOR MAP:
  Direct:
    - [name]: channel=[...], promise=[...], weakness=[...], trust lever=[...]
  Substitutes:
    - [name]: outcome=[...], trust lever=[...], switching cost=[...]
  Workflow competitors:
    - [spreadsheet / manual process / existing stack — job nó được hired for]
  Attention competitors:
    - [điều gì đang chiếm time và trust của ICP right now]

GOLD ZONE CHANNELS:
  1. [channel] — ICP presence: [high/med/low], density: [high/med/low]
     White-space check: [reachable/trigger/trust — pass/fail each]
  2. [channel] — ICP presence: [high/med/low], density: [high/med/low]
     White-space check: [reachable/trigger/trust — pass/fail each]

RED OCEAN:
  - [channel] — [lý do tránh]

WHY NOW PRESSURE:
  [market shift, regulation, tool change, hay behavior change tạo urgency]

NEXT RESEARCH QUESTION:
  [unknown đơn lẻ nào ảnh hưởng nhất đến channel choice]
```

---

## Vietnamese note

Market skill phải trả lời được "người dùng đang dùng gì thay thế" — không chỉ "ai là đối thủ". Và Gold Zone channels phải pass white-space rubric cả 4 điều kiện, không phải chỉ "ít người làm". Ít người làm vì ICP không ở đó = không phải white space, là dead zone.
