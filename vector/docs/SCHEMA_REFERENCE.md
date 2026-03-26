# Schema Reference

This document is the single reference for the major machine-readable contracts used by VECTOR.
The executable workflow source of truth lives in `vector/mcp_server/workflow_contract.ts`, and runtime plus tests now read from that contract directly.

## 1) State schema

```yaml
phase: intake | icp | market | channel | thesis | venue | signal | recovery
milestone: M0 | M1 | M2 | M3 | M4 | M5 | M6 | null
stage: 0→1 | 1→10 | 10→100 | null
metadata:
  language: string
  notes_language: string
  version: string
product:
  name: string | null
  summary: string | null
  price: string | null
  live_status: live | prelaunch | in-dev | unknown
  category: string | null
icp:
  hypothesis: string | null
  confirmed: boolean
  who: string | null
  problem: string | null
  trigger_moment: string | null
  desired_outcome: string | null
  watering_holes: [string]
  wtp_signal: string | null
  evidence: [string]
  drift_status: unknown | confirmed | narrowed | changed | observed
distribution:
  channel_selected: string | null
  venue_selected: string | null
  primary_angle: string | null
  growth_multiplier: string | null
  alternatives: [string]
research_memo:
  question: string
  provider_runs: [object]
  evidence_table: [object]
  competitors: [string]
  substitutes: [string]
  workflow_competitors: [string]
  attention_competitors: [string]
  channel_observations: [object]
  venue_observations: [object]
  trust_signals: [string]
  pricing_observations: [string]
  customer_language: [string]
  synthesis: string
  recommendation: string
  risks: [string]
  unknowns: [string]
  next_experiment: string
  updated_at: string
request_registry:
  request_id: { action: string, response_text: string, updated_at: string }
thesis:
  primary_channel: string | null
  why_this_channel: string | null
  angle: string | null
  unfair_advantage: string | null
  growth_multiplier: string | null
  unlock_condition: string | null
venue:
  sales_venue: string | null
  entry_offer: string | null
  core_offer: string | null
  upsell_offer: string | null
  trust_signal_needed: string | null
  venue_risk: string | null
  icp_drift_check: string | null
signals:
  green: [string]
  yellow: [string]
  red: [string]
confidence:
  current_phase: number | null
  overall: low | medium | high | unknown
risk:
  riskiest_assumption: string | null
  top_failure_mode: string | null
  drift_status: unknown | confirmed | narrowed | changed
logs:
  trauma: [object]
  decisions: [object]
  questions_open: [string]
routing:
  persona: prelaunch_builder | active_founder | scaling_team | audit_user | unknown
  mode: quick_start | research_mode | full_mode | copy_mode | audit_mode | recovery_mode
  platform: string | null
  intent: string | null
  last_router_reason: string | null
artifact_registry:
  intake_memo: object | null
  icp_card: object | null
  market_map: object | null
  channel_scorecard: object | null
  thesis_card: object | null
  venue_card: object | null
  venue_scorecard: object | null
  signal_ledger: object | null
  research_memo: object | null
  copy_pack: object | null
  decision_memo: object | null
  strategy_map: object | null
experiment_ledger:
  active: [object]
  archived: [object]
platform:
  name: string | null
  install_status: unknown | pending | installed | verified | failed
  load_order_verified: boolean
session:
  schema_version: string
  kb_synced: boolean
  last_sync: string | null
  confidence_delta: number | null

graph_memory:
  stored_separately_in: vector_graph_memory.json
  authoritative: false
  nodes: [object]
  edges: [object]
  sync_history: [object]
```

## 2) Phase contract

Every phase must declare:

- required inputs
- optional inputs
- required outputs
- exit criteria
- fallback path
- owner (orchestrator or a sub-skill)
- evidence threshold

## 3) Decision policy schema

```yaml
decision:
  if:
    - condition: string
      threshold: string
  then:
    action: string
    reason: string
  else:
    action: string
    reason: string
```

## 4) Benchmark schema

```yaml
benchmark:
  channel: string
  stage: 0→1 | 1→10 | 10→100
  volume:
    target_attempts: number
    minimum_attempts: number
  success_signals:
    - response
    - conversation
    - ask
    - sale
  failure_signals:
    - zero_response_after_threshold
    - wrong_icp
    - weak_angle
  notes: string
```

## 4b) Research memo schema

```yaml
research_memo:
  question: string
  evidence_table:
    - id: string
      source: string
      source_url: string | null
      provider: string | null
      provider_run_id: string | null
      raw_payload_ref: string | null
      source_type: official_docs | github | search_result | browser_capture | crm_note | internal_note | community_post | social_signal | benchmark | other
      kind: competitor | substitute | workflow_competitor | attention_competitor | channel_presence | venue_fit | trust_signal | pricing | customer_language | experiment | other
      claim: string
      observed_fact: boolean
      relevance: string
      strength: weak | medium | strong
      collected_at: string
      stale_after_days: number
      notes: string
  channel_observations:
    - channel: string
      confidence: 0..1
      observation_mode: observed | inferred
      source_provider: string | null
      provider_run_id: string | null
      icp_presence: -2..2
      trust_match: -2..2
      speed_to_signal: -2..2
      cost_to_test: -2..2
      founder_advantage: -2..2
      evidence_ids: [string]
      benchmark_key: string | null
  venue_observations:
    - venue: string
      confidence: 0..1
      observation_mode: observed | inferred
      source_provider: string | null
      provider_run_id: string | null
      trust_requirement_fit: -2..2
      checkout_fit: -2..2
      speed_to_launch: -2..2
      audience_match: -2..2
      evidence_ids: [string]

## 4c) Research automation tools

```yaml
vector_source_capture:
  purpose: append auditable sources into research_memo.evidence_table
  freshness_policy: stale_after_days defaults from source_type
vector_competitor_map:
  purpose: reconcile competitors, substitutes, workflow competitors, and attention competitors
vector_channel_evidence:
  purpose: attach evidence ids plus benchmark_key to an evidence-backed channel observation
vector_graph_sync:
  purpose: project authoritative snapshot state into advisory graph memory
vector_graph_query:
  purpose: query provenance-linked graph memory without overriding workflow state
scoring_mode:
  default_without_evidence: heuristic fallback
  with_fresh_evidence: evidence-first blend
```

## 5) Registry metadata schema

```yaml
registry_metadata:
  schema: vector_registry_metadata/v1
  package_name: string
  package_version: string
  runtime_version: string
  transports:
    local: stdio
    remote: streamable_http
  auth:
    scheme: bearer
    key_prefix: vsk_
    remote_headers: [Authorization, x-vector-project-id, x-vector-session-owner]
  capability_mode:
    restricted_mode_env: VECTOR_TOOLSETS
    safe_mode_env: VECTOR_SAFE_MODE
    default_toolsets: [string]
    optional_toolsets: [string]
    toolsets: [object]
  install_surfaces: [object]
  compatibility: [object]
  self_test_commands: object
```

## 4e) Graph memory schema

```yaml
graph_memory:
  version: string
  updated_at: string
  nodes:
    - id: string
      entity_type: icp_entity | competitor_entity | substitute_entity | workflow_competitor_entity | attention_competitor_entity | channel_entity | venue_entity | thesis_revision | signal_observation | experiment | trust_signal_expectation
      label: string
      summary: string
      attributes: object
      provenance:
        - source_kind: snapshot_state | captured_evidence
          source_ref: string
          phase: intake | icp | market | channel | thesis | venue | signal | recovery
          recorded_at: string
          evidence_ids: [string]
          provider_run_ids: [string]
  edges:
    - id: string
      edge_type: targets_channel | converts_at | competes_for_attention | replaces_workflow | observed_in_signal | tested_in_experiment | expects_trust_signal | validated_by_evidence | records_revision
      from: string
      to: string
      provenance: [object]
  sync_history:
    - id: string
      action: string
      phase: intake | icp | market | channel | thesis | venue | signal | recovery
      source_snapshot_version: string
      node_count: number
      edge_count: number
      recorded_at: string
```
```

## 4d) Experiment ledger entry schema

```yaml
experiment_entry:
  when: string
  action: string
  note: string
  phase: intake | icp | market | channel | thesis | venue | signal | recovery
  milestone: string
  channel: string
  venue: string
  sample_size: number | null
  green_count: number | null
  yellow_count: number | null
  red_count: number | null
  drift_status: unknown | confirmed | narrowed | changed | observed
  decision_impact: string
  next_action: string
```

## 5) Session contract

A session must also carry:
- mode
- persona
- platform
- artifact registry
- version
- decision history
- ledger sync status

## Vietnamese note

Nếu một file khác lặp lại schema này, file này thắng. Đây là nguồn luật chính.
