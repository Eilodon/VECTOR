# EXPERIMENT LEDGER v2.0

Paste một row cho mỗi milestone event. Không xóa rows — đánh dấu "superseded" nếu không còn apply.  
File này là audit trail cho toàn bộ signal work và tồn tại ngoài KB để survive across sessions.

---

## How to Write a Ledger Row

```
MILESTONE:          [M0 / M1 / M2 / M3 / M4 / M5]
DATE:               [YYYY-MM-DD]
HYPOTHESIS:         [điều gì được expect là true]
SAMPLE SIZE:        [số targets / attempts]
ATTEMPTS:           [outreach sent / conversations initiated]
RESPONSE QUALITY:   [none / low / medium / high]
CONVERSION STATUS:  [no response / replied / called / offered / bought]
SIGNAL CLASS:       [🟢 green / 🟡 yellow / 🔴 red]
DRIFT STATUS:       [none / minor — mô tả / major — mô tả]
DRIFT TYPE:         [wrong ICP / wrong channel / wrong angle / wrong venue / 
                     weak trust signal / too much scope / too much noise / none]
RECOVERY ROUTING:   [Phase phải return về — từ Loop-Back Routing Table / none]
CORRECTION:         [điều gì thay đổi kết quả này]
NEXT CHECKPOINT:    [điều gì phải xảy ra trước milestone tiếp theo]
DECISION IMPACT:    [continue / iterate / pivot / stop]
```

---

## Ledger Entries

### Entry 001

```
MILESTONE:
DATE:
HYPOTHESIS:
SAMPLE SIZE:
ATTEMPTS:
RESPONSE QUALITY:
CONVERSION STATUS:
SIGNAL CLASS:
DRIFT STATUS:
DRIFT TYPE:
RECOVERY ROUTING:
CORRECTION:
NEXT CHECKPOINT:
DECISION IMPACT:
```

---

## Signal Class Reference

| Class | Meaning | Default next step |
|---|---|---|
| 🟢 Green | Clear positive market signal | Double down on this motion |
| 🟡 Yellow | Promising but ambiguous | Iterate one variable at a time |
| 🔴 Red | Weak or absent signal | Classify drift type → route về đúng phase |

---

## Drift Type Reference

Dùng labels này trong DRIFT TYPE:

| Drift Type | Dấu hiệu | Recovery Phase |
|---|---|---|
| `wrong ICP` | Respondents không phải intended persona | Phase 1 — ICP |
| `wrong channel` | ICP đúng nhưng không có ở channel | Phase 3–4 — Channel |
| `wrong angle` | Hook không resonance với ICP | Phase 5 — Thesis (angle only) |
| `wrong venue` | Interest nhưng buying environment sai | Phase 6 — Venue |
| `weak trust signal` | Replies nhưng conversion stalls | Phase 6 — Venue (trust signal only) |
| `too much scope` | Offer quá complex để close | Phase 6 — Venue (entry offer) |
| `too much noise` | Channel quá crowded, signal unclear | Phase 3–4 — Channel |
| `none` | Không có drift, đúng hướng | Continue |

---

## Trauma Log

Record repeated failure patterns ở đây. Mục tiêu là pattern recognition — không phải blame.

```
PATTERN:    [điều gì cứ thất bại]
ATTEMPTS:   [đã thử bao nhiêu lần]
HYPOTHESIS: [tại sao nó đang thất bại]
ACTION:     [đã thay đổi gì / sẽ thay đổi gì]
```

---

## Confidence Tracking

Sau mỗi milestone, update confidence:

```
MILESTONE:           [M0–M5]
PREVIOUS CONFIDENCE: [low / medium / high]
NEW CONFIDENCE:      [low / medium / high]
REASON FOR CHANGE:   [evidence cụ thể đã thay đổi confidence]

Quy tắc:
  - Confidence KHÔNG tăng mà không có new evidence
  - Weak data KHÔNG được promote lên strong signal
  - Repeated contradiction PHẢI lower confidence và trigger route change
```

---

## Vietnamese note

Ledger này không phải để báo cáo — là để nhìn lại pattern mà không cần nhớ hết mọi thứ trong đầu. Version 2.0 thêm: DRIFT TYPE và RECOVERY ROUTING fields để mỗi Red signal đều trỏ về đúng phase cần fix.
