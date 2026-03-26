import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('..', import.meta.url);

async function readText(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('knowledge base stays YAML-only', async () => {
  const kb = await readText('vector/kb/KNOWLEDGE_BASE.md');
  assert.ok(kb.includes('```yaml'));
  assert.ok(!kb.includes('```json'));
  assert.match(kb, /distribution:\n/);
  assert.match(kb, /venue:\n/);
});

test('channel skill uses one scoring rubric', async () => {
  const channel = await readText('vector/skills/channel/SKILL.md');
  assert.match(channel, /ICP Match/);
  assert.match(channel, /Builder Advantage/);
  assert.match(channel, /Speed to Signal/);
  assert.match(channel, /Cost to Test/);
  assert.match(channel, /Scalability/);
  assert.ok(!/eight dimensions/i.test(channel));
});

test('thesis and venue templates include the missing fields', async () => {
  const thesis = await readText('vector/skills/thesis/SKILL.md');
  const venue = await readText('vector/skills/venue/SKILL.md');

  for (const field of ['Sales venue', 'Product architecture', 'Trust signal', 'ICP drift check']) {
    assert.match(thesis, new RegExp(field, 'i'));
  }
  assert.match(thesis, /venue risk/i);
  assert.match(venue, /TRUST SIGNAL NEEDED/);
  assert.match(venue, /VENUE RISK/);
  assert.match(venue, /ICP DRIFT CHECK/);
});

test('install prompts are step-by-step', async () => {
  const prompts = await readText('vector/prompts/AUTO_INSTALL_PROMPTS.md');
  assert.match(prompts, /Claude\.ai Projects/);
  assert.match(prompts, /Upload the files in this order/);
  assert.match(prompts, /Plain-language buyer note/);
});

test('root docs present VECTOR as v2.0.0 product with installer and self-test', async () => {
  const readme = await readText('README.md');
  const changelog = await readText('vector/docs/CHANGELOG.md');

  assert.match(readme, /VECTOR Suite v2\.0\.0/);
  assert.match(readme, /pnpm run host:install -- --host cursor/);
  assert.match(readme, /pnpm run selftest -- --host cursor/);
  assert.match(changelog, /\[2\.0\.0\]/);
});

test('setup guide splits implemented runtime behavior from roadmap architecture', async () => {
  const guide = await readText('VECTOR_MCP_SETUP_GUIDE.md');
  assert.match(guide, /Implemented now in this repo/);
  assert.match(guide, /Roadmap only, not shipped in this repo today/);
  assert.match(guide, /Auth0 first/);
  assert.match(guide, /OAuth 2\.1 \+ PKCE/);
  assert.match(guide, /community contribution\) \[roadmap\]/);
});

test('auth and community vNext plan chooses Auth0-first resource server rollout', async () => {
  const plan = await readText('vector/docs/AUTH_COMMUNITY_VNEXT_PLAN.md');
  assert.match(plan, /Chosen provider:\s+\*\*Auth0\*\*/);
  assert.match(plan, /VECTOR remains an OAuth Resource Server/);
  assert.match(plan, /vector_export_insight/);
});

test('runtime keeps thesis and venue as separate tools', async () => {
  const runtime = await readText('vector/mcp_server/core.ts');
  const contract = await import(new URL('vector/mcp_server/dist/workflow_contract.js', root).href);
  assert.match(runtime, /"vector_thesis"/);
  assert.match(runtime, /"vector_venue"/);
  assert.match(runtime, /from "\.\/workflow_contract\.js"/);
  assert.ok(!runtime.includes('vector_thesis_venue'));
  assert.deepEqual(contract.WORKFLOW_PHASES, ['intake', 'icp', 'market', 'channel', 'thesis', 'venue', 'signal', 'recovery']);
  assert.equal(contract.WORKFLOW_CONTRACT.tools.vector_channel_score.target_phase, 'thesis');
  assert.equal(contract.WORKFLOW_CONTRACT.tools.vector_thesis.target_phase, 'venue');
  assert.deepEqual(contract.WORKFLOW_CONTRACT.phases.venue.allowed_next, ['signal', 'recovery']);
});

test('runtime exposes a first-class research memo tool', async () => {
  const runtime = await readText('vector/mcp_server/core.ts');
  assert.match(runtime, /"vector_research_memo"/);
  assert.match(runtime, /ResearchMemoSchema/);
  assert.match(runtime, /research_memo/);
});

test('runtime exposes graph sync and query tools without making graph memory authoritative', async () => {
  const runtime = await readText('vector/mcp_server/core.ts');
  assert.match(runtime, /"vector_graph_sync"/);
  assert.match(runtime, /"vector_graph_query"/);
  assert.match(runtime, /Snapshot phase remains authoritative/);
  assert.match(runtime, /Do not treat graph query output as a workflow phase override/);
});

test('integration status doc tracks maturity levels', async () => {
  const status = await readText('vector/docs/INTEGRATION_STATUS.md');
  assert.match(status, /documented/);
  assert.match(status, /verified-local/);
  assert.match(status, /verified-remote/);
  assert.match(status, /deprecated/);
});

test('integration docs include smoke recipes and avoid unsupported maturity claims', async () => {
  const status = await readText('vector/docs/INTEGRATION_STATUS.md');
  const smoke = await readText('vector/docs/INTEGRATION_SMOKE_TESTS.md');
  const changelog = await readText('vector/docs/CHANGELOG.md');
  const cursor = await readText('vector/platforms/cursor.md');
  const manus = await readText('vector/platforms/manus.md');
  const windsurf = await readText('vector/platforms/windsurf.md');

  assert.match(smoke, /vector_state_snapshot/);
  assert.match(smoke, /vector_intake/);
  assert.match(smoke, /request_id/);
  assert.match(smoke, /tests\/smoke_local\.test\.mjs/);
  assert.match(smoke, /pnpm run host:install -- --host <host>/);
  assert.match(smoke, /pnpm run selftest -- --host <host>/);
  assert.match(status, /Legacy SSE remote path \| deprecated/);
  assert.match(status, /generated fixture templates/);
  assert.match(changelog, /Automated local MCP smoke test/);
  assert.ok(!cursor.includes('MCP-Enabled'));
  assert.ok(!manus.includes('MCP-Enabled'));
  assert.ok(!windsurf.includes('MCP-Enabled'));
});

test('local host fixtures exist for candidate verified-local adapters', async () => {
  const fixtures = [
    'vector/integrations/cursor/.cursor/mcp.json',
    'vector/integrations/cline/cline_mcp_settings.json',
    'vector/integrations/windsurf/mcp_config.json',
    'vector/integrations/github_copilot/.copilot/mcp-config.json',
    'vector/integrations/github_copilot/.github/agents/vector_gtm.agent.md',
    'vector/integrations/templates/cursor.mcp.json.template',
    'vector/integrations/templates/cline_mcp_settings.json.template',
    'vector/integrations/templates/windsurf_mcp_config.json.template',
    'vector/integrations/templates/github_copilot.mcp-config.json.template',
    'vector/integrations/templates/github_copilot.vector_gtm.agent.md.template',
    'vector/integrations/LOCAL_HOST_FIXTURES.md',
  ];

  for (const fixture of fixtures) {
    const text = await readText(fixture);
    assert.ok(
      text.includes('vector/mcp_server/dist/index.js')
      || text.includes('__VECTOR_SERVER_ARGS_JSON__')
      || text.includes('vector-gtm'),
    );
  }
});

test('local adapter verification records can promote to verified-local only with filled host evidence', async () => {
  const records = [
    'vector/integrations/cursor/VERIFICATION.md',
    'vector/integrations/cline/VERIFICATION.md',
    'vector/integrations/windsurf/VERIFICATION.md',
    'vector/integrations/github_copilot/VERIFICATION.md',
  ];

  for (const recordPath of records) {
    const text = await readText(recordPath);
    const statusMatch = text.match(/^Status:\s*(documented|verified-local)$/m);
    assert.ok(statusMatch, `${recordPath} must declare documented or verified-local`);
    assert.match(text, /tests\/smoke_local\.test\.mjs/);
    assert.match(text, /Generated fixture command:/);
    assert.match(text, /Self-test command:/);
    assert.match(text, /Promotion gate:/);
    if (statusMatch?.[1] === 'verified-local') {
      const evidenceBlock = text.match(/Host-specific run evidence:\n([\s\S]*?)\nPromotion gate:/)?.[1] ?? '';
      for (const line of evidenceBlock.split('\n').map((item) => item.trim()).filter((item) => item.startsWith('- '))) {
        const value = line.slice(line.indexOf(':') + 1).trim();
        assert.ok(value, `${recordPath} must fill every evidence field before verified-local`);
      }
    }
  }
});


test('examples contain concrete good and bad cases', async () => {
  const good = await readText('vector/examples/good_outputs.md');
  const bad = await readText('vector/examples/bad_outputs.md');

  assert.match(good, /VectorCRM Lite/);
  assert.match(good, /OpsKit for Notion/);
  assert.match(bad, /AI GTM OS/);
  assert.match(bad, /everything for everyone/i);
});
