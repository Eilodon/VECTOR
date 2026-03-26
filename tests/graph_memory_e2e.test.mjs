import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Client } from '../vector/mcp_server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StdioClientTransport } from '../vector/mcp_server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';

const serverEntry = path.join(process.cwd(), 'vector/mcp_server/dist/index.js');

test('graph memory sync writes provenance-linked advisory nodes without changing snapshot authority', async () => {
  const kbRoot = await mkdtemp(path.join(os.tmpdir(), 'vector-graph-e2e-'));
  const projectId = 'graph_e2e';
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    cwd: process.cwd(),
    env: {
      VECTOR_LICENSE_KEY: 'vsk_test_graph_e2e',
      VECTOR_PROJECT_ID: projectId,
      VECTOR_KB_PATH: kbRoot,
    },
    stderr: 'pipe',
  });

  const client = new Client({ name: 'vector-graph-e2e-test', version: '1.0.0' });
  try {
    await client.connect(transport);

    await client.callTool({
      name: 'vector_intake',
      arguments: {
        request_id: `graph-intake-${Date.now()}`,
        product_description: 'GTM teardown sprint',
        icp_hypothesis: 'Solo SaaS founders stuck on first outbound loop',
        is_live: false,
      },
    });
    await client.callTool({
      name: 'vector_icp_jtbd',
      arguments: {
        target_user: 'Solo SaaS founders',
        job_statement: 'When pipeline stalls, founders need a repeatable outbound loop to reach qualified buyers.',
        riskiest_assumption: 'Cold outbound is still the fastest path to first qualified conversations.',
        evidence: ['Repeated founder asks for outbound teardown support'],
        trigger_moment: 'Referrals and ad hoc pipeline work stop converting reliably.',
        desired_outcome: 'A repeatable first outbound loop that generates qualified replies.',
        push: 'Pipeline inconsistency is painful and visible.',
        pull: 'A teardown-led outbound loop could create faster traction.',
        anxiety: 'Cold outreach may damage trust.',
        habit: 'Manual referrals feel safer than testing new outbound systems.',
        evidence_tags: {
          who: 'observed',
          problem: 'observed',
          trigger_moment: 'inferred',
          wtp_signal: 'speculative',
          forces: 'inferred',
        },
        confidence: 'medium',
        top_unknown: 'How quickly trust can be established in cold outreach.',
        next_experiment: 'Send 20 teardown-first outbound messages.',
      },
    });
    await client.callTool({
      name: 'vector_market_terrain',
      arguments: {
        stage_confirmed: '1→10',
        market_category: 'Founder GTM support',
        category_stance: 'reframing',
        competitors: ['Founder OS'],
        substitutes: ['DIY spreadsheets'],
        workflow_competitors: ['CRM clean-up routines'],
        attention_competitors: ['LinkedIn creators'],
        gold_zone_channels: ['cold email', 'community'],
        red_ocean: ['SEO'],
        white_space_notes: 'Whitespace exists in direct response paths where founder trust is visible.',
        why_now_pressure: 'Founders need learning loops before they hire a team.',
        next_research_question: 'Which channel creates qualified replies with the least trust friction?',
      },
    });
    await client.callTool({
      name: 'vector_research_search',
      arguments: {
        query: 'founder outbound cold email teardown first revenue',
        provider: 'fixture_search',
        source_whitelist: ['benchmark.vector.gt', 'community.example', 'docs.vector.gt'],
        max_results: 3,
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
    await client.callTool({
      name: 'vector_channel_score',
      arguments: {
        channels: ['community', 'cold email'],
        stage_hint: 'prelaunch',
      },
    });
    await client.callTool({
      name: 'vector_thesis',
      arguments: {
        primary_channel: 'cold email',
        why_this_channel: 'Provider-backed evidence shows the fastest route to first qualified replies.',
        angle: 'Founder-led outbound teardown',
        growth_multiplier: 'Repeatable teardown-to-sprint funnel',
        unlock_condition: 'At least 3 qualified replies in the first 20 sends',
        evidence_used: ['fixture-cold-email-1', 'fixture-cold-email-2'],
      },
    });
    await client.callTool({
      name: 'vector_venue',
      arguments: {
        sales_venue: 'landing page',
        entry_offer: 'Free teardown',
        core_offer: 'Paid implementation sprint',
        trust_signal_needed: 'Case-study style teardown',
        venue_risk: 'Trust gap before first booked call',
        icp_drift_check: 'Reject agencies and non-founder replies',
        primary_cta: 'Book the teardown',
      },
    });
    await client.callTool({
      name: 'vector_signal_review',
      arguments: {
        green: ['2 qualified replies', '1 booked teardown'],
        yellow: ['One founder asked for more proof'],
        sample_size: 5,
        notes: ['Initial signal is positive'],
      },
    });

    const graphPath = path.join(kbRoot, projectId, 'vector_graph_memory.json');
    const autoGraph = JSON.parse(await readFile(graphPath, 'utf8'));
    assert.ok(autoGraph.sync_history.some((entry) => typeof entry.action === 'string' && entry.action.startsWith('auto:')));

    const sync = await client.callTool({
      name: 'vector_graph_sync',
      arguments: {
        reason: 'WS3 acceptance test',
      },
    });
    const syncText = sync.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.match(syncText, /Graph Memory Sync/);
    assert.match(syncText, /Snapshot phase remains authoritative: signal/);

    const query = await client.callTool({
      name: 'vector_graph_query',
      arguments: {
        search: 'cold email',
        limit: 10,
      },
    });
    const queryText = query.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.match(queryText, /Graph Memory Query/);
    assert.match(queryText, /channel:cold_email/);

    const statePath = path.join(kbRoot, projectId, 'vector_state.json');
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    const graph = JSON.parse(await readFile(graphPath, 'utf8'));

    assert.equal(state.phase, 'signal');
    assert.equal(state.channel_selected, 'cold email');
    assert.ok(Array.isArray(graph.nodes));
    assert.ok(Array.isArray(graph.edges));
    assert.ok(graph.nodes.some((node) => node.entity_type === 'thesis_revision'));
    assert.ok(graph.nodes.some((node) => node.entity_type === 'competitor_entity'));
    assert.ok(graph.nodes.some((node) => node.entity_type === 'channel_entity'));
    assert.ok(graph.nodes.some((node) => node.entity_type === 'venue_entity'));
    assert.ok(graph.nodes.some((node) => node.entity_type === 'signal_observation'));
    assert.ok(graph.nodes.some((node) => node.entity_type === 'experiment'));
    assert.ok(graph.nodes.some((node) => node.entity_type === 'trust_signal_expectation'));
    assert.ok(graph.edges.some((edge) => edge.edge_type === 'targets_channel'));
    assert.ok(graph.edges.some((edge) => edge.edge_type === 'converts_at'));
    assert.ok(graph.edges.some((edge) => edge.edge_type === 'expects_trust_signal'));
    assert.ok(graph.edges.some((edge) => edge.edge_type === 'observed_in_signal'));
    assert.ok(graph.nodes.every((node) => Array.isArray(node.provenance) && node.provenance.length >= 1));
    assert.ok(graph.edges.every((edge) => Array.isArray(edge.provenance) && edge.provenance.length >= 1));
  } finally {
    await transport.close().catch(() => {});
    await rm(kbRoot, { recursive: true, force: true });
  }
});
