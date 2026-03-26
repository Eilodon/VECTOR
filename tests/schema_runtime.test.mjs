import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Client } from '../vector/mcp_server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StdioClientTransport } from '../vector/mcp_server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';

const serverEntry = path.join(process.cwd(), 'vector/mcp_server/dist/index.js');

test('runtime preserves canonical v2.0.0 state fields on load and save', async () => {
  const kbRoot = await mkdtemp(path.join(os.tmpdir(), 'vector-schema-runtime-'));
  const projectId = 'schema_runtime';
  const projectDir = path.join(kbRoot, projectId);
  const statePath = path.join(projectDir, 'vector_state.json');

  await mkdir(projectDir, { recursive: true });
  await writeFile(statePath, `${JSON.stringify({
    version: '2.0.0',
    updated_at: '2026-03-25T00:00:00.000Z',
    phase: 'channel',
    milestone: 'M3',
    stage: '1→10',
    icp_confirmed: true,
    product_description: 'Schema preservation product',
    product: {
      name: 'Schema Preservation Product',
      summary: 'Schema preservation product',
      price: null,
      live_status: 'prelaunch',
      category: 'gtm',
    },
    builder_background: null,
    icp_hypothesis: 'Solo founders',
    target_user: 'Solo founders',
    job_statement: 'Reach early buyers with less waste.',
    riskiest_assumption: 'Cold outbound still works.',
    market_memo: null,
    market: {
      stage_confirmed: '1→10',
      market_category: 'gtm tooling',
      category_stance: 'reframing',
      competitor_map: {
        direct: ['Founder OS'],
        substitutes: ['DIY spreadsheet'],
        workflow_competitors: ['CRM routine'],
        attention_competitors: ['LinkedIn creators'],
      },
      gold_zone_channels: ['cold email'],
      red_ocean: ['seo'],
      white_space_notes: 'Low-density direct founder outreach.',
      why_now_pressure: 'Founders need faster loops.',
      next_research_question: 'Which direct channel yields replies fastest?',
      last_updated: '2026-03-25T00:00:00.000Z',
    },
    research_memo: null,
    request_registry: {},
    founder_edge_audit: [{
      channel: 'cold email',
      network_presence: true,
      track_record: true,
      credibility_recognizable: true,
      speed_advantage: false,
      warm_door_opener: false,
      score: 3,
      notes: 'Warm outbound adjacency.',
    }],
    channel_selected: 'cold email',
    channel_scores: [],
    venue_selected: null,
    thesis_card: null,
    venue_card: null,
    sales_copy: null,
    routing: {
      persona: 'prelaunch_builder',
      mode: 'full_mode',
      platform: 'local',
      intent: 'preserve schema',
      last_router_reason: 'schema_runtime_test',
    },
    artifact_registry: {
      intake_memo: null,
      icp_card: null,
      market_map: null,
      channel_scorecard: null,
      founder_edge_audit_result: null,
      thesis_card: null,
      venue_card: null,
      venue_scorecard: null,
      signal_ledger: null,
      research_memo: null,
      copy_pack: null,
      objection_map: null,
      decision_memo: null,
      strategy_map: null,
    },
    experiment_ledger: { active: [], archived: [] },
    platform: { name: 'local', install_status: 'verified', load_order_verified: true },
    session: { schema_version: 'v2.0.0', kb_synced: false, last_sync: null, confidence_delta: null },
    product_meta: { category: 'gtm' },
    icp: {
      hypothesis: 'Solo founders',
      confirmed: true,
      who: 'Solo founders',
      problem: 'Weak first pipeline',
      trigger_moment: 'Pipeline stalls',
      desired_outcome: 'Predictable first revenue loop',
      watering_holes: ['LinkedIn'],
      wtp_signal: 'They pay for teardown help',
      evidence: ['founder asks'],
      drift_status: 'observed',
      evidence_tags: {
        who: 'observed',
        problem: 'observed',
        trigger_moment: 'inferred',
        wtp_signal: 'benchmarked',
        forces: 'observed',
      },
      confidence: 'medium',
      top_unknown: 'How many replies in first week?',
      next_experiment: 'Send 20 targeted emails.',
      forces: {
        push: 'Pipeline pain',
        pull: 'Faster first revenue',
        anxiety: 'Fear of spammy outreach',
        habit: 'Continue manual referrals',
      },
    },
    distribution: {
      channel_selected: 'cold email',
      channel_score: 81,
      channel_score_raw: {
        icp_match: 4,
        builder_advantage: 3,
        speed_to_signal: 5,
        cost_to_test: 4,
        scalability: 2,
      },
      venue_selected: null,
      primary_angle: 'Founder-led teardown',
      growth_multiplier: 'Repeatable outbound loop',
      growth_multiplier_type: 'A',
      unlock_condition: '3 qualified replies',
      alternatives: ['community'],
    },
    objection_map: {
      primary_objection: 'I do not trust this yet',
      objection_type: 'anxiety',
      copy_job: 'Increase credibility fast',
      placement: 'above CTA',
      secondary_objection: 'Too busy to act',
    },
    recovery_log: [{
      milestone: 'M2',
      drift_type: 'wrong_channel',
      return_phase: 'channel',
      correction_applied: 'Switched from SEO to direct outreach',
      date: '2026-03-24T00:00:00.000Z',
    }],
    gates: {
      intake_cleared: true,
      icp_cleared: true,
      market_cleared: true,
      channel_cleared: false,
      thesis_cleared: false,
      venue_cleared: false,
    },
    confidence: { current_phase: 0.6, overall: 'medium' },
    risk: { riskiest_assumption: 'Cold outbound still works.', top_failure_mode: 'Weak trust', drift_status: 'observed' },
    logs: { trauma: [], decisions: [], questions_open: [], processed_requests: [] },
    signals: { green: [], yellow: [], red: [] },
    icp_drift: 'observed',
    trauma_log: [],
    next_action: 'Run channel scoring.',
    history: [],
  }, null, 2)}\n`, 'utf8');

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    cwd: process.cwd(),
    env: {
      VECTOR_LICENSE_KEY: 'vsk_test_schema_runtime',
      VECTOR_PROJECT_ID: projectId,
      VECTOR_KB_PATH: kbRoot,
    },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'vector-schema-runtime-test', version: '1.0.0' });

  try {
    await client.connect(transport);
    await client.callTool({ name: 'vector_state_snapshot', arguments: {} });

    const persisted = JSON.parse(await readFile(statePath, 'utf8'));
    assert.equal(persisted.market.category_stance, 'reframing');
    assert.deepEqual(persisted.market.competitor_map.direct, ['Founder OS']);
    assert.equal(persisted.icp.evidence_tags.forces, 'observed');
    assert.equal(persisted.icp.forces.anxiety, 'Fear of spammy outreach');
    assert.equal(persisted.distribution.growth_multiplier_type, 'A');
    assert.equal(persisted.objection_map.copy_job, 'Increase credibility fast');
    assert.equal(persisted.recovery_log[0].drift_type, 'wrong_channel');
    assert.equal(persisted.gates.market_cleared, true);
    assert.ok(Object.prototype.hasOwnProperty.call(persisted.artifact_registry, 'objection_map'));
  } finally {
    await transport.close().catch(() => {});
    await rm(kbRoot, { recursive: true, force: true });
  }
});

test('runtime reconciles contradictory gates and rolls phase back on load', async () => {
  const kbRoot = await mkdtemp(path.join(os.tmpdir(), 'vector-schema-reconcile-'));
  const projectId = 'schema_reconcile';
  const projectDir = path.join(kbRoot, projectId);
  const statePath = path.join(projectDir, 'vector_state.json');

  await mkdir(projectDir, { recursive: true });
  await writeFile(statePath, `${JSON.stringify({
    version: '2.0.0',
    updated_at: '2026-03-25T00:00:00.000Z',
    phase: 'venue',
    milestone: 'M4',
    stage: '10→100',
    icp_confirmed: true,
    product_description: 'Reconcile product',
    product: { name: 'Reconcile Product', summary: 'Reconcile Product', price: null, live_status: 'prelaunch', category: null },
    builder_background: null,
    icp_hypothesis: 'Solo founders',
    target_user: 'Solo founders',
    job_statement: 'Need a repeatable first GTM loop.',
    riskiest_assumption: 'Cold outbound is viable.',
    market_memo: null,
    market: {
      stage_confirmed: '1→10',
      market_category: 'gtm',
      category_stance: 'reframing',
      competitor_map: { direct: ['Founder OS'], substitutes: [], workflow_competitors: [], attention_competitors: [] },
      gold_zone_channels: ['cold email'],
      red_ocean: [],
      white_space_notes: 'Whitespace exists.',
      why_now_pressure: 'Need traction now.',
      next_research_question: null,
      last_updated: '2026-03-25T00:00:00.000Z',
    },
    research_memo: null,
    request_registry: {},
    founder_edge_audit: [],
    channel_selected: null,
    channel_scores: [],
    venue_selected: null,
    thesis_card: null,
    venue_card: null,
    sales_copy: null,
    routing: { persona: 'prelaunch_builder', mode: 'full_mode', platform: 'local', intent: null, last_router_reason: null },
    artifact_registry: {
      intake_memo: null,
      icp_card: null,
      market_map: null,
      channel_scorecard: null,
      founder_edge_audit_result: null,
      thesis_card: null,
      venue_card: null,
      venue_scorecard: null,
      signal_ledger: null,
      research_memo: null,
      copy_pack: null,
      objection_map: null,
      decision_memo: null,
      strategy_map: null,
    },
    experiment_ledger: { active: [], archived: [] },
    platform: { name: 'local', install_status: 'verified', load_order_verified: true },
    session: { schema_version: 'v2.0.0', kb_synced: false, last_sync: null, confidence_delta: null },
    product_meta: { category: null },
    icp: {
      hypothesis: 'Solo founders',
      confirmed: true,
      who: 'Solo founders',
      problem: 'Need a repeatable first GTM loop.',
      trigger_moment: null,
      desired_outcome: null,
      watering_holes: [],
      wtp_signal: null,
      evidence: [],
      drift_status: 'observed',
      evidence_tags: { who: 'observed', problem: 'observed', trigger_moment: 'speculative', wtp_signal: 'speculative', forces: 'observed' },
      confidence: 'medium',
      top_unknown: null,
      next_experiment: null,
      forces: {
        push: 'Pipeline pain',
        pull: 'Faster revenue',
        anxiety: 'Fear of spam',
        habit: 'Default to referrals',
      },
    },
    distribution: {
      channel_selected: null,
      channel_score: null,
      channel_score_raw: null,
      venue_selected: null,
      primary_angle: null,
      growth_multiplier: null,
      growth_multiplier_type: null,
      unlock_condition: null,
      alternatives: [],
    },
    objection_map: {
      primary_objection: null,
      objection_type: null,
      copy_job: null,
      placement: null,
      secondary_objection: null,
    },
    recovery_log: [{
      milestone: 'M3',
      drift_type: 'wrong_channel',
      return_phase: 'channel',
      correction_applied: 'Re-score channels before thesis lock.',
      date: '2026-03-25T00:00:00.000Z',
    }],
    gates: {
      intake_cleared: true,
      icp_cleared: true,
      market_cleared: true,
      channel_cleared: true,
      thesis_cleared: false,
      venue_cleared: false,
    },
    confidence: { current_phase: 0.76, overall: 'medium' },
    risk: { riskiest_assumption: 'Cold outbound is viable.', top_failure_mode: null, drift_status: 'observed' },
    logs: { trauma: [], decisions: [], questions_open: [], processed_requests: [] },
    signals: { green: [], yellow: [], red: [] },
    icp_drift: 'observed',
    trauma_log: [],
    next_action: null,
    history: [],
  }, null, 2)}\n`, 'utf8');

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    cwd: process.cwd(),
    env: {
      VECTOR_LICENSE_KEY: 'vsk_test_schema_reconcile',
      VECTOR_PROJECT_ID: projectId,
      VECTOR_KB_PATH: kbRoot,
    },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'vector-schema-reconcile-test', version: '1.0.0' });

  try {
    await client.connect(transport);
    await client.callTool({ name: 'vector_state_snapshot', arguments: {} });

    const persisted = JSON.parse(await readFile(statePath, 'utf8'));
    assert.equal(persisted.phase, 'channel');
    assert.equal(persisted.gates.channel_cleared, false);
    assert.equal(persisted.next_action, 'Re-score channels before thesis lock.');
  } finally {
    await transport.close().catch(() => {});
    await rm(kbRoot, { recursive: true, force: true });
  }
});
