import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('..', import.meta.url);

async function readText(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('channel and venue scoring can use research memo adjustments', async () => {
  const runtime = await readText('vector/mcp_server/core.ts');
  assert.match(runtime, /researchChannelAdjustment/);
  assert.match(runtime, /researchVenueAdjustment/);
  assert.match(runtime, /VECTOR_STATE\.research_memo/);
});

test('research automation tools and freshness policy exist', async () => {
  const runtime = await readText('vector/mcp_server/core.ts');
  const providerContract = await readText('vector/mcp_server/research_provider_contract.ts');
  assert.match(runtime, /"vector_source_capture"/);
  assert.match(runtime, /"vector_research_search"/);
  assert.match(runtime, /"vector_list_research_providers"/);
  assert.match(runtime, /"vector_competitor_map"/);
  assert.match(runtime, /"vector_channel_evidence"/);
  assert.match(runtime, /SOURCE_FRESHNESS_DAYS/);
  assert.match(runtime, /evidence-first blend/);
  assert.match(runtime, /benchmark_key/);
  assert.match(providerContract, /"search"/);
  assert.match(providerContract, /"crawl"/);
  assert.match(providerContract, /"extract"/);
  assert.match(providerContract, /"browser_session"/);
  assert.match(providerContract, /"deep_research_job"/);
});

test('runtime writes experiment ledger rows and gates copy behind venue', async () => {
  const runtime = await readText('vector/mcp_server/core.ts');
  assert.match(runtime, /experiment_ledger/);
  assert.match(runtime, /vector_signal_review/);
  assert.match(runtime, /vector_sales_copy/);
  assert.match(runtime, /Sales copy requires both thesis_card and venue_card/);
  assert.match(runtime, /const nextPhase: z\.infer<typeof PhaseSchema> = "venue"/);
});

test('production search providers derive structured observations from generic search results', async () => {
  const previousFetch = global.fetch;
  const previousKey = process.env.TAVILY_API_KEY;
  process.env.TAVILY_API_KEY = 'tavily_test_key';
  global.fetch = async () => new Response(JSON.stringify({
    results: [
      {
        title: 'Founder outbound teardown benchmark',
        url: 'https://example.com/founder-outbound-teardown',
        content: 'Solo founders need a teardown before buying. Cold email plus a landing page works better when case-study proof is visible.',
        published_date: '2026-03-24T00:00:00.000Z',
      },
    ],
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

  try {
    const providers = await import(new URL('../vector/mcp_server/dist/research_providers.js', import.meta.url).href);
    const provider = providers.getSearchProvider('tavily_search');
    const response = await provider.search({
      query: 'founder outbound cold email teardown landing page proof',
      source_whitelist: [],
      max_results: 3,
    });

    assert.equal(response.results.length, 1);
    assert.equal(response.results[0].kind, 'channel_presence');
    assert.ok(response.results[0].channel_signals.some((item) => item.channel === 'cold email'));
    assert.ok(response.results[0].venue_signals.some((item) => item.venue === 'landing page'));
    assert.ok(response.results[0].trust_signals.length >= 1);
    assert.ok(response.results[0].customer_language.length >= 1);
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) {
      delete process.env.TAVILY_API_KEY;
    } else {
      process.env.TAVILY_API_KEY = previousKey;
    }
  }
});
