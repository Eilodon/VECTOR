import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Client } from '../vector/mcp_server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StdioClientTransport } from '../vector/mcp_server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';

const serverEntry = path.join(process.cwd(), 'vector/mcp_server/dist/index.js');

test('provider-backed search path writes provenance and drives evidence-first channel scoring', async () => {
  const kbRoot = await mkdtemp(path.join(os.tmpdir(), 'vector-research-e2e-'));
  const projectId = 'research_e2e';
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    cwd: process.cwd(),
    env: {
      VECTOR_LICENSE_KEY: 'vsk_test_research_e2e',
      VECTOR_PROJECT_ID: projectId,
      VECTOR_KB_PATH: kbRoot,
      VECTOR_TOOLSETS: 'core,research',
    },
    stderr: 'pipe',
  });

  const client = new Client({ name: 'vector-research-e2e-test', version: '1.0.0' });
  try {
    await client.connect(transport);

    const providers = await client.callTool({ name: 'vector_list_research_providers', arguments: {} });
    const providersText = providers.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.match(providersText, /fixture_search/);
    assert.match(providersText, /tavily_search/);
    assert.match(providersText, /exa_search/);

    await client.callTool({
      name: 'vector_intake',
      arguments: {
        request_id: `research-intake-${Date.now()}`,
        product_description: 'Outbound teardown sprint',
        icp_hypothesis: 'Solo SaaS founders with inconsistent pipeline',
        is_live: false,
      },
    });
    await client.callTool({
      name: 'vector_icp_jtbd',
      arguments: {
        target_user: 'Solo SaaS founders',
        job_statement: 'When pipeline stalls, founders need a repeatable outbound loop to reach qualified buyers.',
        riskiest_assumption: 'Cold outbound is still the fastest path to first qualified conversations.',
        evidence: ['Multiple founders asked for outbound teardown help'],
        trigger_moment: 'Manual pipeline work stops producing enough conversations.',
        desired_outcome: 'A fast, repeatable path to first qualified conversations.',
        push: 'Pipeline inconsistency creates immediate pressure.',
        pull: 'A teardown-led outbound loop promises faster first revenue.',
        anxiety: 'Cold email might feel low-trust or too spammy.',
        habit: 'Founders stick to referrals and ad hoc outreach.',
        evidence_tags: {
          who: 'observed',
          problem: 'observed',
          trigger_moment: 'inferred',
          wtp_signal: 'speculative',
          forces: 'inferred',
        },
        confidence: 'medium',
        top_unknown: 'How strong the trust barrier is for cold outbound.',
        next_experiment: 'Run 20 teardown-led outbound attempts.',
      },
    });
    await client.callTool({
      name: 'vector_market_terrain',
      arguments: {
        stage_confirmed: '1→10',
        market_category: 'Founder GTM execution support',
        category_stance: 'reframing',
        competitors: ['Founder OS'],
        substitutes: ['DIY spreadsheets'],
        workflow_competitors: ['CRM clean-up routines'],
        attention_competitors: ['LinkedIn creators'],
        gold_zone_channels: ['cold email', 'community'],
        red_ocean: ['SEO'],
        white_space_notes: 'Founders need direct response loops more than broad awareness plays.',
        why_now_pressure: 'Early-stage teams need repeatable traction before they can scale hiring.',
        next_research_question: 'Which direct response channel yields the cleanest signal first?',
      },
    });
    await client.callTool({
      name: 'vector_founder_edge_audit',
      arguments: {
        channels: ['community', 'cold email'],
        assessments: [
          {
            channel: 'community',
            network_presence: false,
            track_record: false,
            credibility_recognizable: true,
            speed_advantage: false,
            warm_door_opener: false,
          },
          {
            channel: 'cold email',
            network_presence: true,
            track_record: true,
            credibility_recognizable: true,
            speed_advantage: true,
            warm_door_opener: false,
          },
        ],
      },
    });

    const search = await client.callTool({
      name: 'vector_research_search',
      arguments: {
        query: 'founder outbound cold email teardown first revenue',
        provider: 'fixture_search',
        source_whitelist: ['benchmark.vector.gt', 'community.example', 'docs.vector.gt'],
        max_results: 3,
      },
    });
    const searchText = search.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.match(searchText, /Provider fixture_search returned/);
    assert.match(searchText, /Preview cold email:/);

    const scored = await client.callTool({
      name: 'vector_channel_score',
      arguments: {
        channels: ['community', 'cold email'],
        stage_hint: 'prelaunch',
      },
    });
    const scoredText = scored.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.match(scoredText, /cold email/);

    const statePath = path.join(kbRoot, projectId, 'vector_state.json');
    const state = JSON.parse(await readFile(statePath, 'utf8'));

    assert.equal(state.phase, 'thesis');
    assert.equal(state.channel_selected, 'cold email');
    assert.equal(state.founder_edge_audit.length, 2);
    assert.equal(state.research_memo.provider_runs.length, 1);
    assert.ok(state.research_memo.evidence_table.length >= 2);
    assert.equal(state.research_memo.provider_runs[0].provider, 'fixture_search');
    assert.ok(state.research_memo.evidence_table.every((item) => item.provider === 'fixture_search'));

    const coldEmailObservation = state.research_memo.channel_observations.find((item) => item.channel === 'cold email');
    assert.ok(coldEmailObservation);
    assert.equal(coldEmailObservation.source_provider, 'fixture_search');
    assert.ok(coldEmailObservation.evidence_ids.length >= 1);

    const rankedChannels = state.channel_scores.map((item) => item.channel);
    assert.equal(rankedChannels[0], 'cold email');
    assert.match(state.channel_scores[0].evidence.join('\n'), /evidence-first blend/);
    assert.match(state.channel_scores[0].evidence.join('\n'), /Fresh evidence count:/);
  } finally {
    await transport.close().catch(() => {});
    await rm(kbRoot, { recursive: true, force: true });
  }
});
