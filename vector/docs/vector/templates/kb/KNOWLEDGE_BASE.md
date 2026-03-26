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
  confidence: unknown
  top_unknown: null
  next_experiment: null
  # [NEW v2.0] 4 Forces
  forces:
    push: null
    pull: null
    anxiety: null
    habit: null

market:
  stage_confirmed: null
  market_category: null
  category_stance: null        # entering / reframing / creating
  competitor_map:
    direct: []
    substitutes: []
    workflow_competitors: []
    attention_competitors: []
  gold_zone_channels: []
  red_ocean: []
  white_space_notes: null
  why_now_pressure: null
  next_research_question: null
  last_updated: null

# [NEW v2.0] Founder Edge Audit results per channel considered
founder_edge_audit: []
# format:
# - channel: [tên]
#   network_presence: null     # yes/no
#   track_record: null         # yes/no
#   credibility_recognizable: null  # yes/no
#   speed_advantage: null      # yes/no
#   warm_door_opener: null     # yes/no
#   score: null                # 0-5

distribution:
  channel_selected: null
  channel_score: null          # stage-weighted score (0-100)
  channel_score_raw: null      # breakdown per dimension
  venue_selected: null
  primary_angle: null
  growth_multiplier: null
  growth_multiplier_type: null # A/B/C/D
  unlock_condition: null

thesis:
  primary_channel: null
  why_this_channel: null
  angle: null
  unfair_advantage: null
  growth_multiplier: null
  unlock_condition: null
  reversibility: null
  confidence: null
  alternatives_rejected: []
  evidence_used: []

venue:
  sales_venue: null
  venue_format: null           # [NEW v2.0] cụ thể hơn về format
  entry_offer: null
  core_offer: null
  upsell_offer: null
  trust_signal_level: null     # [NEW v2.0] high/medium/low
  trust_signal_needed: null
  trust_signal_status: null    # [NEW v2.0] have/need-to-build/not-needed
  venue_risk: null
  venue_risk_mitigation: null  # [NEW v2.0]
  icp_drift_check: null
  primary_cta: null

# [NEW v2.0] Objection map (populated khi salescopy skill chạy)
objection_map:
  primary_objection: null
  objection_type: null         # anxiety/habit/both
  copy_job: null
  secondary_objection: null

signals:
  green: []
  yellow: []
  red: []

# [NEW v2.0] Recovery routing log
recovery_log: []
# format:
# - milestone: [M0-M5]
#   drift_type: [7 types]
#   return_phase: [phase name]
#   correction_applied: null
#   date: null

quality:
  overall_confidence: unknown
  riskiest_assumption: null
  top_failure_mode: null
  benchmark_status: unknown

gates:
  intake_cleared: false
  icp_cleared: false
  market_cleared: false
  channel_cleared: false
  thesis_cleared: false
  venue_cleared: false

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

- Chạy Session Resumption Protocol (trong SKILL.md) ngay khi load KB.
- Nếu version < 2.0.0: thông báo, add missing fields, không refuse.
- Kiểm tra gates section trước khi assume phase đã cleared.
- Nếu gate = true nhưng required fields = null: treat gate = false, hỏi user.
- Không overwrite snapshot với template yếu hơn.
- Preserve milestone evidence trước khi move sang phase mới.
- Cập nhật recovery_log mỗi khi loop-back xảy ra.
- Cập nhật founder_edge_audit mỗi khi channel mới được xem xét.

## Vietnamese note

KB là nguồn sự thật duy nhất. Agent không được đoán state từ conversation nếu KB đã có câu trả lời. Version 2.0.0 thêm: 4 Forces trong ICP, Founder Edge Audit, stage-weighted channel score, objection map, recovery routing log.
