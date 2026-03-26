# VECTOR Artifact Blueprints v2.0.0

> Canonical output templates cho từng artifact. Agent phải match format này. User dùng để check "done" nghĩa là gì.

---

## Common Artifact Header

Mọi artifact phải bắt đầu bằng:
```text
artifact_name: [...]
version: [...]
phase: [...]
owner: [...]
date: [...]
confidence_level: [low / medium / high]
evidence_used: [list key sources]
```

---

## 1. Intake Summary (`intake_memo`)

```text
INTAKE SUMMARY

Product:                    [một câu, không jargon]
Problem:                    [cụ thể — pain, không phải feature]
Target persona:             [role + context — hypothesis only]
Why now:                    [timing trigger hoặc market pressure]
Evidence level:             [observed / inferred / speculative]
Constraint:                 [time / money / access / credibility]
Founder edge:               [insider knowledge / network / experience / none]
Known channels/communities: [list hoặc "unknown"]
Early network signals:      [warm contacts? y/n + context]
Riskiest assumption:        [một câu]

GATE STATUS:
☐/☑ Product mô tả 1 câu
☐/☑ Problem cụ thể
☐/☑ Persona giả định
☐/☑ Why now
☐/☑ Constraint
☐/☑ Evidence tagged
```

---

## 2. ICP Card (`icp_card`)

```text
JOB STATEMENT:
Khi [situation], [target user] muốn [job], để họ có thể [outcome].

ICP CARD:
Who:            [role, company size, maturity]
Core problem:   [specific pain]
Trigger moment: [event nào khiến họ act now]
Watering holes: [nơi congregate]
WTP signal:     [evidence về willingness to pay]

4 FORCES MAP:
Push:    [pain đẩy họ rời status quo]
Pull:    [outcome kéo họ đến solution]
Anxiety: [fear of switching / wrong decision / ROI unclear]
Habit:   [workaround "tạm ổn", no urgency]

EVIDENCE TAGS:
Who: [obs/inf/bench/spec] | Problem: [...] | Trigger: [...] | WTP: [...] | Forces: [...]

Riskiest assumption: [một câu]
Confidence:          [low / medium / high]
Top unknown:         [điều gì sẽ thay đổi card này nhiều nhất]
Next experiment:     [test nhỏ nhất]

GATE STATUS:
☐/☑ Job statement 1 câu  ☐/☑ 4 Forces mapped
☐/☑ Riskiest assumption  ☐/☑ Evidence tags all assigned
☐/☑ Kill switch passed (ICP not vague)
```

---

## 3. Market Map (`market_map`)

```text
MARKET TERRAIN REPORT
STAGE CONFIRMED: [0→1 / 1→10 / 10→100]
CATEGORY STANCE: [entering / reframing / creating] — [rationale]

COMPETITOR MAP:
  Direct:              [name: channel / promise / weakness / trust lever]
  Substitutes:         [name: outcome / switching cost]
  Workflow competitors: [spreadsheet/manual/stack — job hired for]
  Attention competitors: [chiếm ICP's time và trust]

GOLD ZONE CHANNELS:
  1. [channel] — ICP=[H/M/L], density=[H/M/L] — white-space: [pass/fail each]
  2. [channel] — ...

RED OCEAN: [channel — lý do tránh]
WHY NOW:   [market shift tạo urgency]
NEXT RESEARCH QUESTION: [unknown quan trọng nhất]

GATE STATUS:
☐/☑ Stage confirmed  ☐/☑ Category stance
☐/☑ Comp map 4 types  ☐/☑ Gold zone ≥2  ☐/☑ Kill switch passed
```

---

## 4. Channel Scorecard (`channel_scorecard`)

```text
CHANNEL: [...]  STAGE: [...]

FOUNDER EDGE AUDIT:
  Network: [Y/N] | Track record: [Y/N] | Credibility: [Y/N]
  Speed: [Y/N] | Warm door: [Y/N] | Score: [X/5]

STAGE-WEIGHTED SCORING:
  ICP Match:         [1–5] × [w] = [pts]  — [lý do]
  Builder Advantage: [audit score] × [w] = [pts]
  Speed to Signal:   [1–5] × [w] = [pts]  — [lý do]
  Cost to Test:      [1–5] × [w] = [pts]  — [lý do]
  Scalability:       [1–5] × [w] = [pts]  — [lý do]
  Weighted raw: [X / max]  Normalized: [X/100]  → [weak/promising/strong]

WHY THIS CHANNEL:  [grounded in evidence]
FIRST TEST:        [time-boxed, concrete]
FAILURE SIGNAL:    [specific indicator]
WHY NOT OTHERS:    [each channel + reason]

GATE STATUS:
☐/☑ Audit run  ☐/☑ Stage weights applied  ☐/☑ Score ≥50
☐/☑ ≥2 channels scored  ☐/☑ First test defined
```

---

## 5. Thesis Card (`thesis_card`)

> **Note:** Does NOT contain sales_venue, product_architecture, trust_signal, icp_drift_check, hoặc primary_cta.

```text
PRODUCT: [...]  ICP: [1 câu]  STAGE: [...]
RISKIEST ASSUMPTION: [...]

PRIMARY CHANNEL:  [từ channel scorecard]
CHANNEL SCORE:    [X/100]
WHY:              [grounded in evidence]
ANGLE:            [hook cụ thể]
UNFAIR ADVANTAGE: [điều gì làm founder credible]

GROWTH MULTIPLIER: [Type A/B/C/D — hoặc "not yet"]
UNLOCK CONDITION:  [điều gì phải đúng trước khi add]

REVERSIBILITY:  [hard/medium/easy — lý do]
CONFIDENCE:     [low/medium/high — lý do]
EVIDENCE USED:  [list]
ALTERNATIVES REJECTED: [channels + lý do]

GATE STATUS:
☐/☑ Single channel  ☐/☑ Multiplier typed
☐/☑ Confidence with rationale  ☐/☑ Venue fields absent
```

---

## 6. Venue Card (`venue_card`)

```text
SALES VENUE:
  Name: [...]  Why: [fit channel + ICP trust]  Format: [cụ thể]

PRODUCT ARCHITECTURE:
  Entry:  [format] — [price] — [outcome buyer nhận]
  Core:   [format] — [price] — [outcome]
  Upsell: [format] — [price] — [outcome / "locked"]

TRUST SIGNAL:
  Level: [high/med/low — từ ICP anxiety]
  Required: [cụ thể]  Status: [have/need-to-build/not-needed]

VENUE RISK:
  Main risk: [...]  What causes it: [...]  Mitigation: [...]

ICP DRIFT CHECK:
  Drift signal: [sai role / sai trigger / sai company size]
  Response: [tighten filter — không thay venue]

PRIMARY CTA: [1 action: "Reply YES" / "Book teardown"]

GATE STATUS:
☐/☑ One CTA  ☐/☑ Trust signal calibrated to anxiety
☐/☑ Drift check specific  ☐/☑ No thesis fields overwritten
```

---

## 7. Signal Ledger Row (`signal_ledger`)

```text
MILESTONE:   [M0–M5]  DATE: [...]
HYPOTHESIS:  [nếu X cho Y thì Z]
SAMPLE SIZE: [...]  ATTEMPTS: [...]
RESPONSE QUALITY: [high/med/low/none]  CONVERSION: [yes/interest/no/n/a]
SIGNAL CLASS: [green/yellow/red]
DRIFT STATUS: [none/minor/major]
DRIFT TYPE:   [taxonomy — required nếu drift != none]
  (wrong_icp / wrong_channel / wrong_angle / wrong_venue /
   weak_trust_signal / too_much_scope / too_much_noise)
RECOVERY ROUTING: [return phase — required nếu drift_type != null]
CORRECTION: [...]
NEXT CHECKPOINT: [date + mục tiêu]
DECISION: [go/iterate/pivot/stop]
CONFIDENCE UPDATE: [increased/stable/decreased — lý do]
```

---

## 8. Copy Pack (`copy_pack`)

```text
OBJECTION MAP:
  Primary: [từ 4 Forces]  Type: [anxiety/habit/both]
  Copy job: [điều copy làm với objection]  Placement: [where in asset]

MESSAGE MATRIX:
  Variant: [curiosity/pain/outcome/trust/urgency]
  Hook: [...]  Body: [2-3 sentences]  CTA: [1 action]
  [repeat cho mỗi variant family]

PROOF NOTES: [trust signal placement và context]

TEST PLAN:
  Variants: [A/B/C]  To: [N targets]
  Success: [X% reply / Y conversations]  Timeline: [...]

QA CHECKLIST (7 items):
  ☐ Promise believable (không overclaim)
  ☐ Native với venue
  ☐ CTA match stage
  ☐ Single primary action
  ☐ Trong thesis boundary
  ☐ Objection addressed
  ☐ Trust signal before CTA
```

---

## Vietnamese note

Blueprint là standard — không phải mẫu để điền cho có. Field nào null sau khi phase cleared = artifact chưa complete. Gate checklist phải 100% pass trước khi advance.
