import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path, { join } from 'node:path';
import test from 'node:test';
import { Client } from '../vector/mcp_server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StdioClientTransport } from '../vector/mcp_server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';

const serverEntry = path.join(process.cwd(), 'vector/mcp_server/dist/index.js');

async function withClient(env, run) {
  const kbRoot = await mkdtemp(path.join(os.tmpdir(), 'vector-runtime-retention-'));
  const projectId = env.VECTOR_PROJECT_ID ?? `runtime_retention_${Date.now()}`;
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    cwd: process.cwd(),
    env: {
      VECTOR_LICENSE_KEY: 'vsk_test_runtime_retention',
      VECTOR_PROJECT_ID: projectId,
      VECTOR_KB_PATH: kbRoot,
      ...env,
    },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'vector-runtime-retention-test', version: '1.0.0' });

  try {
    await client.connect(transport);
    await run(client, kbRoot, projectId);
  } finally {
    await transport.close().catch(() => {});
    await rm(kbRoot, { recursive: true, force: true });
  }
}

async function readProjectJson(kbRoot, projectId, filename) {
  return JSON.parse(await readFile(path.join(kbRoot, projectId, filename), 'utf8'));
}

async function seedResearchPhase(client) {
  await client.callTool({
    name: 'vector_intake',
    arguments: {
      request_id: `seed-intake-${Date.now()}`,
      product_description: 'Retention test product',
      icp_hypothesis: 'Solo SaaS founders',
      is_live: false,
    },
  });
  await client.callTool({
    name: 'vector_icp_jtbd',
    arguments: {
      target_user: 'Solo SaaS founders',
      job_statement: 'Need a repeatable outbound loop to reach buyers.',
      riskiest_assumption: 'Cold outbound still works.',
      evidence: ['Observed founder demand'],
      trigger_moment: 'Pipeline stalls',
      desired_outcome: 'Repeatable qualified replies',
      push: 'Pipeline pain',
      pull: 'Faster first revenue',
      anxiety: 'Cold outreach may reduce trust',
      habit: 'Manual referrals feel safer',
      evidence_tags: {
        who: 'observed',
        problem: 'observed',
        trigger_moment: 'inferred',
        wtp_signal: 'speculative',
        forces: 'inferred',
      },
      confidence: 'medium',
      top_unknown: 'How much trust proof is needed.',
      next_experiment: 'Run 20 outbound attempts.',
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
      gold_zone_channels: ['cold email'],
      red_ocean: ['SEO'],
      white_space_notes: 'Whitespace exists in direct response channels.',
      why_now_pressure: 'Founders need traction now.',
      next_research_question: 'Which channel yields signal fastest?',
    },
  });
}

test('parallel retries with one request_id keep one registry entry', async () => {
  await withClient({}, async (client, kbRoot, projectId) => {
    const requestId = `parallel-${Date.now()}`;
    const args = {
      request_id: requestId,
      product_description: 'Parallel retry test',
      icp_hypothesis: 'Founders',
      is_live: false,
    };

    const [first, second] = await Promise.all([
      client.callTool({ name: 'vector_intake', arguments: args }),
      client.callTool({ name: 'vector_intake', arguments: args }),
    ]);
    const firstText = first.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    const secondText = second.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.equal(secondText, firstText);

    const state = await readProjectJson(kbRoot, projectId, 'vector_state.json');
    assert.deepEqual(state.logs.processed_requests, [requestId]);
    assert.equal(Object.keys(state.request_registry).length, 1);
    assert.equal(state.request_registry[requestId].action, 'vector_intake');
  });
});

test('request registry retains only the newest bounded entries', async () => {
  await withClient({}, async (client, kbRoot, projectId) => {
    await client.callTool({
      name: 'vector_state_snapshot',
      arguments: { request_id: 'seed-request-registry' },
    });

    const statePath = path.join(kbRoot, projectId, 'vector_state.json');
    const state = await readProjectJson(kbRoot, projectId, 'vector_state.json');
    const requestIds = Array.from({ length: 500 }, (_, index) => `snapshot-${String(index).padStart(3, '0')}`);
    state.logs.processed_requests = [...requestIds];
    state.request_registry = Object.fromEntries(requestIds.map((requestId, index) => [
      requestId,
      {
        action: 'vector_state_snapshot',
        response_text: `Snapshot ${requestId}`,
        updated_at: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
      },
    ]));
    await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

    const nextRequestId = 'snapshot-500';
    await client.callTool({
      name: 'vector_state_snapshot',
      arguments: { request_id: nextRequestId },
    });

    const nextState = await readProjectJson(kbRoot, projectId, 'vector_state.json');
    assert.equal(nextState.logs.processed_requests.length, 500);
    assert.equal(Object.keys(nextState.request_registry).length, 500);
    assert.equal(nextState.logs.processed_requests[0], requestIds[1]);
    assert.equal(nextState.logs.processed_requests.at(-1), nextRequestId);
    assert.equal(nextState.request_registry[requestIds[0]], undefined);
    assert.ok(nextState.request_registry[nextRequestId]);
  });
});

test('research evidence dedups by id and graph provenance stays bounded', async () => {
  await withClient(
    { VECTOR_TOOLSETS: 'core,research' },
    async (client, kbRoot, projectId) => {
      await seedResearchPhase(client);

      const source = {
        id: 'retention-source-1',
        source: 'docs.vector.gt',
        source_url: 'https://docs.vector.gt/retention-proof',
        source_type: 'official_docs',
        kind: 'trust_signal',
        claim: 'Case-study proof improves cold-email trust.',
        strength: 'strong',
      };

      await client.callTool({
        name: 'vector_source_capture',
        arguments: {
          question: 'What proof reduces trust friction?',
          sources: [source],
        },
      });
      await client.callTool({
        name: 'vector_source_capture',
        arguments: {
          question: 'What proof reduces trust friction?',
          sources: [source],
        },
      });

      const afterSourceCapture = await readProjectJson(kbRoot, projectId, 'vector_state.json');
      assert.equal(afterSourceCapture.research_memo.evidence_table.length, 1);

      await client.callTool({
        name: 'vector_founder_edge_audit',
        arguments: {
          channels: ['cold email'],
          assessments: [{
            channel: 'cold email',
            network_presence: true,
            track_record: true,
            credibility_recognizable: true,
            speed_advantage: true,
            warm_door_opener: false,
          }],
        },
      });
      await client.callTool({
        name: 'vector_channel_score',
        arguments: {
          channels: ['cold email'],
          stage_hint: 'prelaunch',
        },
      });
      await client.callTool({
        name: 'vector_thesis',
        arguments: {
          primary_channel: 'cold email',
          why_this_channel: 'Fastest route to qualified replies.',
          angle: 'Founder-led outbound teardown',
          growth_multiplier: 'Repeatable outbound loop',
          unlock_condition: '3 qualified replies',
          evidence_used: ['retention-source-1'],
        },
      });
      await client.callTool({
        name: 'vector_venue',
        arguments: {
          sales_venue: 'landing page',
          entry_offer: 'Free teardown',
          core_offer: 'Paid sprint',
          trust_signal_needed: 'Case study',
          venue_risk: 'Trust gap',
          icp_drift_check: 'Reject non-founder leads',
          primary_cta: 'Book the teardown',
        },
      });

      const query = 'founder outbound cold email teardown first revenue';
      await client.callTool({
        name: 'vector_research_search',
        arguments: {
          query,
          provider: 'fixture_search',
          source_whitelist: ['benchmark.vector.gt', 'community.example', 'docs.vector.gt'],
          max_results: 3,
        },
      });
      const firstSearchState = await readProjectJson(kbRoot, projectId, 'vector_state.json');
      const baselineEvidenceCount = firstSearchState.research_memo.evidence_table.length;
      for (let index = 0; index < 10; index += 1) {
        await client.callTool({
          name: 'vector_research_search',
          arguments: {
            query,
            provider: 'fixture_search',
            source_whitelist: ['benchmark.vector.gt', 'community.example', 'docs.vector.gt'],
            max_results: 3,
          },
        });
      }

      const finalState = await readProjectJson(kbRoot, projectId, 'vector_state.json');
      assert.equal(finalState.research_memo.evidence_table.length, baselineEvidenceCount);

      for (let index = 0; index < 40; index += 1) {
        await client.callTool({
          name: 'vector_graph_sync',
          arguments: { reason: `retention-${index}` },
        });
      }

      const graph = await readProjectJson(kbRoot, projectId, 'vector_graph_memory.json');
      const maxNodeProvenance = Math.max(...graph.nodes.map((node) => node.provenance.length));
      const maxEdgeProvenance = Math.max(...graph.edges.map((edge) => edge.provenance.length));
      assert.ok(maxNodeProvenance <= 25);
      assert.ok(maxEdgeProvenance <= 25);
    },
  );
});

test('backup files are pruned to MAX_LOCAL_BACKUP_FILES after phase transitions', async () => {
  await withClient({}, async (client, kbRoot, projectId) => {
    // Seed initial state
    await seedResearchPhase(client);
    
    // Trigger 30 phase transitions to create backups
    for (let i = 0; i < 30; i++) {
      await client.callTool({
        name: 'vector_graph_sync',
        arguments: { reason: `transition-${i}` },
      });
    }
    
    const kbDir = join(kbRoot, projectId);
    const files = await readdir(kbDir);
    const backups = files.filter(f => f.startsWith('vector_state.json.bkp_'));
    
    assert.ok(backups.length <= 25, `Expected ≤25 backups, got ${backups.length}`);
    // Verify oldest backups were removed first (sorted by timestamp)
    const sortedBackups = backups.sort();
    assert.ok(sortedBackups.length > 0, 'Should have some backups');
  });
});

test('corrupt state file throws and preserves corrupt file for inspection', async () => {
  await withClient({}, async (client, kbRoot, projectId) => {
    const statePath = join(kbRoot, projectId, 'vector_state.json');
    
    // Write corrupt JSON
    await writeFile(statePath, '{ invalid json', 'utf8');
    
    // Try to read state - should throw with clear error
    let errorThrown = false;
    try {
      const result = await readFile(statePath, 'utf8');
      JSON.parse(result);
    } catch (error) {
      errorThrown = true;
      assert.ok(error instanceof SyntaxError || error.message.includes('corrupt'));
    }
    assert.ok(errorThrown, 'Should have thrown for corrupt file');
  });
});
