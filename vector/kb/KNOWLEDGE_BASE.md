# VECTOR Knowledge Base v2.0.0

Paste snapshot này vào đầu session mới. Giữ file này là YAML-only canonical state.

## Session state

```yaml
version: 2.0.0
updated_at: null
phase: intake
milestone: M0
stage: null
mode: full_mode
platform: unknown
persona: unknown

product:
  name: null
  summary: null
  price: null
  live_status: unknown

icp:
  hypothesis: null
  confirmed: false
  who: null
  problem: null
  trigger_moment: null
  watering_holes: []
  wtp_signal: null
  drift_status: unknown
  evidence_tags:
    who: speculative
    problem: speculative
    trigger_moment: speculative
    wtp_signal: speculative
    forces: speculative
  confidence: unknown
  top_unknown: null
  next_experiment: null
  # [v2.0.0] 4 Forces — populate trước khi rời ICP phase
  forces:
    push: null       # Pain/frustration đẩy họ rời status quo
    pull: null       # Promise/outcome kéo họ đến solution
    anxiety: null    # Fear of switching, wrong decision, ROI unclear
    habit: null      # "Tạm ổn rồi", workaround embedded, no urgency

market:
  stage_confirmed: null
  market_category: null
  category_stance: null        # entering / reframing / creating
  competitor_map:
    direct: []                 # cùng job, cùng buyer intent
    substitutes: []            # khác product, cùng outcome
    workflow_competitors: []   # spreadsheet/manual/existing stack
    attention_competitors: []  # chiếm ICP's time và trust
  gold_zone_channels: []       # high ICP presence, low density
  red_ocean: []
  white_space_notes: null
  why_now_pressure: null
  next_research_question: null
  last_updated: null

# [v2.0.0] Founder Edge Audit — populated tại Channel phase
# Được seed sơ bộ từ Intake (Turn 4.2)
founder_edge_audit: []
# format per channel:
# - channel: [tên channel]
#   network_presence: null         # yes/no — đã có audience/contacts?
#   track_record: null             # yes/no — đã có traction ở channel này?
#   credibility_recognizable: null # yes/no — ICP nhận ra credibility không?
#   speed_advantage: null          # yes/no — tạo content/outreach nhanh hơn không?
#   warm_door_opener: null         # yes/no — có mối quan hệ mở cửa không?
#   score: null                    # 0-5 (tổng Yes)

distribution:
  channel_selected: null
  channel_score: null              # stage-weighted normalized score (0-100)
  channel_score_raw: null          # breakdown: {icp_match, builder_advantage, speed_to_signal, cost_to_test, scalability}
  venue_selected: null
  primary_angle: null
  growth_multiplier: null
  growth_multiplier_type: null     # A/B/C/D (xem thesis skill)
  unlock_condition: null
  alternatives_rejected: []

thesis:
  primary_channel: null
  why_this_channel: null
  angle: null
  unfair_advantage: null
  growth_multiplier: null
  growth_multiplier_type: null     # A/B/C/D
  unlock_condition: null
  reversibility: null
  confidence: null
  alternatives_rejected: []
  evidence_used: []

venue:
  sales_venue: null
  venue_format: null               # [v2.0.0] cụ thể hơn về format (DM/call/community/marketplace/...)
  entry_offer: null
  core_offer: null
  upsell_offer: null
  trust_signal_level: null         # [v2.0.0] high/medium/low — từ ICP anxiety
  trust_signal_needed: null
  trust_signal_status: null        # [v2.0.0] have/need-to-build/not-needed
  venue_risk: null
  venue_risk_mitigation: null      # [v2.0.0]
  icp_drift_check: null
  primary_cta: null

# [v2.0.0] Objection map — populated khi salescopy skill chạy
objection_map:
  primary_objection: null
  objection_type: null             # anxiety / habit / both
  copy_job: null                   # điều copy phải làm với objection này
  placement: null                  # đặt ở đâu trong asset
  secondary_objection: null

signals:
  green: []
  yellow: []
  red: []

# [v2.0.0] Recovery routing log — update mỗi khi loop-back xảy ra
recovery_log: []
# format per event:
# - milestone: [M0-M5]
#   drift_type: [wrong_icp/wrong_channel/wrong_angle/wrong_venue/weak_trust/too_much_scope/too_much_noise]
#   return_phase: [intake/icp/market/channel/thesis/venue]
#   correction_applied: null
#   date: null

quality:
  overall_confidence: unknown
  riskiest_assumption: null
  top_failure_mode: null
  benchmark_status: unknown

# [v2.0.0] Gate registry — phải checked trước khi move phase
gates:
  intake_cleared: false            # 6 intake conditions met
  icp_cleared: false               # ICP card + 4 Forces + gate checklist
  market_cleared: false            # market memo + gold zone channels
  channel_cleared: false           # stage-weighted score + Founder Edge Audit
  thesis_cleared: false            # thesis card locked (venue fields removed)
  venue_cleared: false             # venue card + trust signal + drift check

logs:
  trauma: []
  decisions: []
  questions_open: []
  experiments: []
```

## Decision memory

```text
What changed:
- [not set]

Why it changed:
- [not set]

What must happen next:
- [not set]
```

## Canonical instructions for the next session

### Session Resumption Protocol (v2.0.0 — 4 bước bắt buộc)

**Bước 1 — Validate schema version:**
- Nếu `version < 2.0.0`: thông báo với user, add missing fields theo template, không refuse.
- Không proceed với v1.x KB mà không notify.

**Bước 2 — Contradiction check:**
- Quét `gates.*` section.
- Nếu `gate = true` nhưng required fields = `null` → treat gate = `false`, hỏi user confirm.
- Nếu `phase` advanced nhưng gates không cleared → reset về phase có gate cleared cuối cùng.

**Bước 3 — Phase routing:**
- Loaded phase = phase tiếp tục từ.
- Không tự advance lên phase tiếp theo nếu gate của current phase = false.
- Nếu `recovery_log` có entry gần đây: đọc correction đã apply trước khi proceed.

**Bước 4 — Malformed KB handling:**
- Nếu KB thiếu required sections: reconstruct từ conversation history nếu có.
- Nếu không có conversation history: restart từ intake.
- Không invent state từ clair → phải confirm với user.

### Sync rules
- Không overwrite snapshot với template yếu hơn.
- Preserve milestone evidence trước khi move sang phase mới.
- Update `recovery_log` mỗi khi loop-back xảy ra.
- Update `founder_edge_audit` mỗi khi channel mới được xem xét.
- Version KB sau mỗi major decision (thesis lock, venue lock).

## Vietnamese note

KB là nguồn sự thật duy nhất. Agent không được đoán state từ conversation nếu KB đã có câu trả lời.

**v2.0.0 thêm:** 4 Forces trong ICP, Founder Edge Audit per channel, stage-weighted channel score, objection map, recovery routing log, gate registry, và Session Resumption Protocol 4 bước.
