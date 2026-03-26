import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Client } from '../vector/mcp_server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StdioClientTransport } from '../vector/mcp_server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';

const serverEntry = path.join(process.cwd(), 'vector/mcp_server/dist/index.js');

test('local stdio smoke test can call VECTOR tools end-to-end with idempotent retry', async () => {
  const kbRoot = await mkdtemp(path.join(os.tmpdir(), 'vector-smoke-'));
  const projectId = 'smoke_local';
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    cwd: process.cwd(),
    env: {
      VECTOR_LICENSE_KEY: 'vsk_test_local_smoke',
      VECTOR_PROJECT_ID: projectId,
      VECTOR_KB_PATH: kbRoot,
    },
    stderr: 'pipe',
  });

  const client = new Client({ name: 'vector-smoke-test', version: '1.0.0' });
  try {
    await client.connect(transport);

    const tools = await client.listTools();
    assert.ok(tools.tools.some((tool) => tool.name === 'vector_state_snapshot'));
    assert.ok(tools.tools.some((tool) => tool.name === 'vector_intake'));

    const snapshot = await client.callTool({ name: 'vector_state_snapshot', arguments: {} });
    assert.ok(snapshot.content.some((item) => item.type === 'text' && item.text.includes('VECTOR State Snapshot')));

    const requestId = `smoke-${Date.now()}`;
    const intakeArgs = {
      request_id: requestId,
      product_description: 'Smoke test GTM product',
      icp_hypothesis: 'Indie founders validating a first GTM loop',
      is_live: false,
      platform: 'local-smoke',
    };

    const first = await client.callTool({ name: 'vector_intake', arguments: intakeArgs });
    const second = await client.callTool({ name: 'vector_intake', arguments: intakeArgs });
    const firstText = first.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    const secondText = second.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.equal(secondText, firstText);
    assert.match(firstText, /VECTOR Intake Card/);

    const statePath = path.join(kbRoot, projectId, 'vector_state.json');
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    assert.equal(state.phase, 'icp');
    assert.equal(state.product.summary, 'Smoke test GTM product');
    assert.deepEqual(state.logs.processed_requests, [requestId]);
    assert.equal(state.request_registry[requestId].action, 'vector_intake');
    assert.match(state.request_registry[requestId].response_text, /VECTOR Intake Card/);
  } finally {
    await transport.close().catch(() => {});
    await rm(kbRoot, { recursive: true, force: true });
  }
});

test('local stdio smoke test enforces thesis -> venue -> signal workflow and writes experiment ledger', async () => {
  const kbRoot = await mkdtemp(path.join(os.tmpdir(), 'vector-workflow-'));
  const projectId = 'workflow_local';
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    cwd: process.cwd(),
    env: {
      VECTOR_LICENSE_KEY: 'vsk_test_local_workflow',
      VECTOR_PROJECT_ID: projectId,
      VECTOR_KB_PATH: kbRoot,
    },
    stderr: 'pipe',
  });

  const client = new Client({ name: 'vector-workflow-test', version: '1.0.0' });
  try {
    await client.connect(transport);

    await client.callTool({
      name: 'vector_intake',
      arguments: {
        request_id: `workflow-intake-${Date.now()}`,
        product_description: 'Workflow smoke product',
        icp_hypothesis: 'Solo founders running manual outbound',
        is_live: false,
      },
    });
    await client.callTool({
      name: 'vector_icp_jtbd',
      arguments: {
        target_user: 'Solo SaaS founders',
        job_statement: 'When outbound stalls, founders want a repeatable first traction loop so they can reach early buyers faster.',
        riskiest_assumption: 'Founders will respond to a founder-led outbound offer before they trust a full service package.',
        evidence: ['Observed repeated questions about first outbound motion'],
        trigger_moment: 'Pipeline softens and referrals stop compounding.',
        desired_outcome: 'Consistent qualified replies from a repeatable outbound loop.',
        push: 'Pipeline is inconsistent and referrals are drying up.',
        pull: 'A repeatable outbound loop could create first traction faster.',
        anxiety: 'Cold outbound may feel spammy and damage credibility.',
        habit: 'Founders keep falling back to manual referrals because it feels safer.',
        evidence_tags: {
          who: 'observed',
          problem: 'observed',
          trigger_moment: 'inferred',
          wtp_signal: 'speculative',
          forces: 'inferred',
        },
        confidence: 'medium',
        top_unknown: 'Whether founders will reply to a teardown-led outbound angle.',
        next_experiment: 'Send 20 targeted teardown offers.',
      },
    });
    await client.callTool({
      name: 'vector_market_terrain',
      arguments: {
        stage_confirmed: '1→10',
        market_category: 'Founder-led GTM support',
        category_stance: 'reframing',
        competitors: ['Founder OS'],
        substitutes: ['Manual spreadsheets'],
        workflow_competitors: ['Existing CRM workflow'],
        attention_competitors: ['LinkedIn creators'],
        gold_zone_channels: ['cold email', 'community'],
        red_ocean: ['SEO'],
        white_space_notes: 'Direct founder outreach is still under-served when trust is made explicit.',
        why_now_pressure: 'More founders need early traction loops before they can hire a team.',
        next_research_question: 'Which direct channel creates qualified replies fastest?',
      },
    });
    await client.callTool({
      name: 'vector_founder_edge_audit',
      arguments: {
        channels: ['cold email', 'community'],
        assessments: [
          {
            channel: 'cold email',
            network_presence: true,
            track_record: true,
            credibility_recognizable: true,
            speed_advantage: true,
            warm_door_opener: false,
          },
          {
            channel: 'community',
            network_presence: false,
            track_record: false,
            credibility_recognizable: true,
            speed_advantage: false,
            warm_door_opener: true,
          },
        ],
      },
    });
    await client.callTool({
      name: 'vector_channel_score',
      arguments: {
        channels: ['cold email', 'community'],
        stage_hint: 'prelaunch',
      },
    });
    await client.callTool({
      name: 'vector_thesis',
      arguments: {
        primary_channel: 'cold email',
        why_this_channel: 'Fastest path to first conversations with the current ICP.',
        angle: 'Founder-led outbound teardown',
        growth_multiplier: 'Repeatable personalized outbound system',
        unlock_condition: 'At least 3 qualified replies in the first 20 attempts',
      },
    });

    const stateAfterThesis = JSON.parse(await readFile(path.join(kbRoot, projectId, 'vector_state.json'), 'utf8'));
    assert.equal(stateAfterThesis.phase, 'venue');

    const prematureCopy = await client.callTool({
      name: 'vector_sales_copy',
      arguments: {
        angle: 'Founder-led outbound teardown',
        headline: 'Fix your first outbound loop',
        subheadline: 'A faster GTM teardown for solo founders.',
        body: 'Body copy',
        cta: 'Book now',
      },
    });
    assert.equal(prematureCopy.isError, true);
    assert.match(
      prematureCopy.content.map((item) => item.type === 'text' ? item.text : '').join('\n'),
      /venue_card/,
    );

    await client.callTool({
      name: 'vector_venue',
      arguments: {
        sales_venue: 'landing page',
        entry_offer: 'Free teardown',
        core_offer: 'Paid implementation sprint',
        trust_signal_needed: 'One case-study style teardown',
        venue_risk: 'Low trust before first call',
        icp_drift_check: 'Reject replies from agencies and non-founders',
        primary_cta: 'Book the teardown',
      },
    });
    const copy = await client.callTool({
      name: 'vector_sales_copy',
      arguments: {
        desired_conversion_step: 'Book the teardown',
        angle: 'Founder-led outbound teardown',
        headline: 'Fix your first outbound loop without sounding spammy',
        subheadline: 'A focused teardown for solo founders who need qualified replies, not more random activity.',
        body: 'We break down your current outbound motion, remove the obvious trust gaps, and give you a first test you can run this week.',
        cta: 'Book the teardown',
        objections: ['I do not want to sound spammy', 'I already rely on referrals'],
        followup_ladder: ['Share one teardown example', 'Offer a narrower first test'],
      },
    });
    const copyText = copy.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.match(copyText, /Sales Copy Pack/);
    assert.match(copyText, /Primary objection:/);
    assert.match(copyText, /Run vector_copy_review before shipping this copy/);

    const prematureRender = await client.callTool({
      name: 'vector_render_media',
      arguments: {
        artifact_type: 'banner',
        style_spec: { mood: 'clean', palette: 'trust-first' },
      },
    });
    assert.equal(prematureRender.isError, true);
    assert.match(
      prematureRender.content.map((item) => item.type === 'text' ? item.text : '').join('\n'),
      /vector_copy_review/,
    );

    const review = await client.callTool({
      name: 'vector_copy_review',
      arguments: {},
    });
    const reviewText = review.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.match(reviewText, /Copy Review/);
    assert.match(reviewText, /First test variant:/);

    const render = await client.callTool({
      name: 'vector_render_media',
      arguments: {
        artifact_type: 'banner',
        style_spec: { mood: 'clean', palette: 'trust-first' },
      },
    });
    const renderText = render.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.match(renderText, /Media Spec/);
    assert.match(renderText, /Copy review score:/);

    await client.callTool({
      name: 'vector_signal_review',
      arguments: {
        green: ['2 qualified replies', '1 booked teardown'],
        yellow: ['One reply asked for more proof'],
        sample_size: 5,
        notes: ['Initial signal looks promising'],
      },
    });

    const finalState = JSON.parse(await readFile(path.join(kbRoot, projectId, 'vector_state.json'), 'utf8'));
    assert.equal(finalState.phase, 'signal');
    assert.equal(finalState.founder_edge_audit.length, 2);
    assert.equal(finalState.venue_card.sales_venue, 'landing page');
    assert.equal(finalState.objection_map.primary_objection, 'I do not want to sound spammy');
    assert.ok(Array.isArray(finalState.sales_copy.qa_checklist));
    assert.ok(Array.isArray(finalState.sales_copy.message_matrix));
    assert.ok(finalState.copy_review);
    assert.equal(typeof finalState.copy_review.overall_score, 'number');
    assert.ok(finalState.experiment_ledger.active.length >= 1);
    const latestEntry = finalState.experiment_ledger.active.at(-1);
    assert.equal(latestEntry.phase, 'signal');
    assert.equal(latestEntry.venue, 'landing page');
    assert.equal(latestEntry.sample_size, 5);
  } finally {
    await transport.close().catch(() => {});
    await rm(kbRoot, { recursive: true, force: true });
  }
});
