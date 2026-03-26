# VECTOR Experiment Ledger v2.0.0

> Persist file này qua mỗi session. Thêm row sau mỗi milestone. Không xóa row cũ — archive khi experiment kết thúc.

---

## Where it connects

- **Signal skill:** writes one YAML row per milestone checkpoint.
- **Research skill:** references ledger khi market claim cần evidence.
- **Channel skill:** compares variants, response quality, and drift patterns.
- **Thesis skill:** uses ledger to decide whether a multiplier is actually unlocked.
- **Recovery mode:** reads drift_type and recovery_routing từ most recent entry.

---

## Active Experiments

```yaml
experiments:
  - id: EXP-001
    date: null
    phase: null
    milestone: null          # M0/M1/M2/M3/M4/M5
    channel: null
    venue: null
    variant: null            # which copy variant was tested
    hypothesis: null         # "Nếu gửi [X] cho [Y], sẽ nhận [Z]"
    sample_size: null        # số target đã map
    attempt_count: null      # số outreach đã gửi
    responses: null
    conversations: null
    asks: null
    response_quality: null   # high (qualified) / medium (interested) / low (noise) / none
    conversion_status: null  # converted / interested / no / n/a
    signal_class: null       # green / yellow / red
    drift_status: null       # none / minor / major

    # [v2.0.0] REQUIRED if drift_status != none
    drift_type: null
    # Taxonomy: wrong_icp / wrong_channel / wrong_angle / wrong_venue /
    #           weak_trust_signal / too_much_scope / too_much_noise

    # [v2.0.0] REQUIRED if drift_type is non-null
    recovery_routing: null   # which phase to return to

    correction_applied: null
    next_checkpoint: null
    decision_impact: null    # go / iterate / pivot / stop
    confidence_update: null  # increased / stable / decreased — và lý do
    notes: null
```

---

## Drift Type Taxonomy (v2.0.0)

| Code | Nghĩa | Smallest correction | Return phase |
|---|---|---|---|
| `wrong_icp` | Người respond không match ICP card | Narrow who, update evidence tags | ICP |
| `wrong_channel` | ICP không active ở channel này | Re-score gold zone candidates | Channel |
| `wrong_angle` | Hook không trigger push/pull đúng | Rewrite angle, giữ channel + venue | Thesis |
| `wrong_venue` | Buying environment không match trust level | Re-run venue phase | Venue |
| `weak_trust_signal` | Anxiety thắng pull — buyer do dự | Thêm proof/testimonial/before-after | Venue |
| `too_much_scope` | Entry offer quá lớn | Shrink entry offer đến smallest proof unit | Venue |
| `too_much_noise` | Channel quá crowded / ICP distracted | Move to lower-density channel | Channel |

---

## Signal Classes

| Class | Dấu hiệu | Next step |
|---|---|---|
| 🟢 Green | Reply tích cực, hỏi thêm, book call, mua | Double down |
| 🟡 Yellow | Reply nhưng vague, "để sau", forward | Iterate 1 biến |
| 🔴 Red | Không reply sau đủ attempts, reject rõ | Classify drift, route về phase |

---

## Decision Impact Reference

| Decision | Điều kiện | Action |
|---|---|---|
| Go | ≥1 conversion với đúng ICP | Double down, chuẩn bị growth multiplier |
| Iterate | Green/Yellow signal nhưng chưa convert | Sửa 1 layer theo drift_type |
| Pivot | Red sau ≥3 full cycles qua đúng ICP | Diagnose deeper: ICP hay product |
| Stop | Red + evidence problem không đủ acute | Dừng, preserve learning |

---

## Stop Rules

Freeze experiment khi:
- ICP vẫn thay đổi mỗi lượt (hypothesis chưa stable)
- Trust signal missing
- Message không được anchor vào real trigger moment
- Benchmark bị exceed nhưng không có real conversation

---

## Ledger Rules (v2.0.0)

- Thêm row sau mỗi milestone — không edit row cũ.
- Nếu `drift_status ≠ none`: phải điền `drift_type` và `recovery_routing`.
- Confidence chỉ tăng khi có **new evidence** — không tăng từ speculation.
- Nếu cùng `drift_type` xuất hiện 2+ lần: ghi vào `logs.trauma` trong KB.

---

## Archived Experiments

```yaml
archived: []
```

## Vietnamese note

Ledger giúp nhìn thấy mẫu lặp — không phải chỉ nhìn từng lần thử đơn lẻ. Nếu drift_type giống nhau 2 lần liên tiếp, đó là pattern cần ghi vào Trauma Log để ngăn lặp lại ở các sessions tiếp theo.
