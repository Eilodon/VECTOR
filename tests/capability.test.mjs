import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Client } from '../vector/mcp_server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StdioClientTransport } from '../vector/mcp_server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';

const serverEntry = path.join(process.cwd(), 'vector/mcp_server/dist/index.js');

async function withClient(env, run) {
  const kbRoot = await mkdtemp(path.join(os.tmpdir(), 'vector-capability-'));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    cwd: process.cwd(),
    env: {
      VECTOR_LICENSE_KEY: 'vsk_test_capability',
      VECTOR_PROJECT_ID: `capability_${Date.now()}`,
      VECTOR_KB_PATH: kbRoot,
      ...env,
    },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'vector-capability-test', version: '1.0.0' });

  try {
    await client.connect(transport);
    await run(client);
  } finally {
    await transport.close().catch(() => {});
    await rm(kbRoot, { recursive: true, force: true });
  }
}

test('restricted capability mode only exposes tools from enabled toolsets', async () => {
  await withClient(
    {
      VECTOR_TOOLSETS: 'core',
    },
    async (client) => {
      const tools = await client.listTools();
      const names = tools.tools.map((tool) => tool.name);

      assert.ok(names.includes('vector_intake'));
      assert.ok(names.includes('vector_state_snapshot'));
      assert.ok(names.includes('vector_list_toolsets'));
      assert.ok(names.includes('vector_list_toolset_tools'));
      assert.ok(!names.includes('vector_research_memo'));
      assert.ok(!names.includes('vector_update_state'));

      const toolsets = await client.callTool({ name: 'vector_list_toolsets', arguments: {} });
      const toolsetText = toolsets.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
      assert.match(toolsetText, /core: enabled/);
      assert.match(toolsetText, /research: disabled/);

      const coreListing = await client.callTool({ name: 'vector_list_toolset_tools', arguments: { toolset: 'core' } });
      const coreText = coreListing.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
      assert.match(coreText, /vector_intake/);
      assert.match(coreText, /vector_state_snapshot/);
    },
  );
});

test('safe mode blocks mutating admin tools even when the admin toolset is enabled', async () => {
  await withClient(
    {
      VECTOR_TOOLSETS: 'core,admin',
      VECTOR_SAFE_MODE: '1',
    },
    async (client) => {
      const tools = await client.listTools();
      const names = tools.tools.map((tool) => tool.name);

      assert.ok(names.includes('vector_update_state'));
      assert.ok(names.includes('vector_undo'));

      const blocked = await client.callTool({
        name: 'vector_update_state',
        arguments: {
          next_action: 'should be blocked in safe mode',
        },
      });
      const blockedText = blocked.content.map((item) => item.type === 'text' ? item.text : '').join('\n');

      assert.equal(blocked.isError, true);
      assert.match(blockedText, /safe_mode blocks 'vector_update_state'/);
    },
  );
});
