---
name: vector-research
version: 2.0.0
description: "Support skill for VECTOR. Called by Orchestrator at specific phases — Market (Phase 2) and Channel (Phase 3–4) — to build evidence tables, competitor maps, substitute analysis, channel density checks, and recommendation memos."
---

# Research Skill v2.0

## Khi nào được gọi

Đây là **support skill** — không tự chạy. Orchestrator gọi theo routing table:

| Trigger | Phase | Lý do gọi |
|---|---|---|
| User không biết competitors | Market (Phase 2) | Build competitor map từ research |
| Cần verify ICP presence trên channel | Channel (Phase 3–4) | Validate trước khi score |
| User paste raw research | Bất kỳ phase nào | Structure thành decision-ready artifact |
| Channel candidate cần verification | Channel (Phase 3–4) | Confirm Gold Zone claim |

Sau khi trả output, **return về phase đang chạy** — không tự động move sang phase tiếp theo.

---

## Goal

Biến market uncertainty thành structured evidence mà Orchestrator có thể dùng để ra quyết định.

---

## What to Collect

- Market category và boundaries
- Direct competitors (channel, promise, weakness, trust lever)
- Substitutes (outcome, switching cost)
- Internal workarounds (job họ được hired for)
- Attention competitors (điều gì đang chiếm ICP's time và trust)
- Current channel presence của ICP
- Pricing / packaging observations
- Customer language và repeated phrases
- Trust signals đang được used trong category

---

## Research Roles — 3 Passes

Treat work như 3 passes riêng biệt:

1. **Collector** — gather facts, competitor notes, channel observations
2. **Analyst** — separate patterns, substitutes, contradictions
3. **Writer** — package memo thành decision-ready artifact

---

## Required Evidence Table Fields

Mỗi claim trong research phải có:

| Field | Description |
|---|---|
| Source | Từ đâu (conversation, website, report, direct observation) |
| Date / Recency | Gần đây hay outdated? |
| Claim | Điều gì được assert |
| Evidence strength | strong / medium / weak |
| Type | observed fact / inference / benchmark |
| Relevance | Relevant đến ICP hoặc channel nào |

---

## Output — Research Memo

```text
RESEARCH MEMO — [topic]
Phase context: [đang serve cho phase nào]

EVIDENCE TABLE:
  [source] | [date] | [claim] | [strength] | [type] | [relevance]
  ...

COMPETITOR / SUBSTITUTE MAP:
  [format từ market.md]

CHANNEL DENSITY MAP:
  [channel]: ICP presence=[high/med/low], competitor density=[high/med/low]
  ...

KEY FINDINGS:
  Most likely truth: [...]
  Biggest unknown:   [...]
  Pattern observed:  [...]

RECOMMENDATION:
  For the current phase: [cụ thể — không general]

RISKS AND UNKNOWNS:
  What we don't know yet: [...]
  What to test next:      [smallest experiment]
```

---

## Evidence Rules

- Phân biệt observed facts với inferences.
- Mark weak evidence là weak — không promote lên.
- Prefer repeated patterns hơn one-off anecdotes.
- Không over-interpret từ single example.

---

## Research Quality Bar

Memo tốt phải trả lời được:
- Điều gì là true?
- Điều gì likely true?
- Điều gì vẫn chưa biết?
- Chúng ta nên test gì tiếp theo?

---

## Research Kill-Switch

Nếu memo không thể đặt tên được next experiment → research vẫn đang quá vague.  
Nếu tất cả evidence đều "speculative" → cần conversations thật, không phải thêm desk research.

---

## Vietnamese note

Research skill không phải để nói cho hay — là để giảm vùng mù trước khi ra quyết định. Một memo tốt kết thúc bằng "experiment nhỏ nhất cần chạy", không kết thúc bằng "summary tổng hợp chung".
