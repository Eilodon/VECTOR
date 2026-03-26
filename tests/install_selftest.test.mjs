import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const rootPath = path.resolve(new URL('..', import.meta.url).pathname);

function runNode(args) {
  return execFileSync(process.execPath, args, {
    cwd: rootPath,
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

test('host installer generates Cursor config with explicit toolsets and safe mode', async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'vector-install-cursor-'));
  try {
    const installOutput = runNode(['scripts/install_vector.mjs', '--host', 'cursor', '--output-dir', outputDir]);
    assert.match(installOutput, /\[install\] host=cursor/);

    const configPath = path.join(outputDir, '.cursor', 'mcp.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    assert.equal(config.mcpServers.vector.env.VECTOR_PROJECT_ID, 'cursor_local');
    assert.equal(config.mcpServers.vector.env.VECTOR_TOOLSETS, 'core,research,strategy,copy');
    assert.equal(config.mcpServers.vector.env.VECTOR_SAFE_MODE, 'true');
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test('host self-test succeeds for generated Cursor config', async () => {
  const output = runNode(['scripts/selftest.mjs', '--host', 'cursor']);
  assert.match(output, /\[selftest\] mode=host/);
  assert.match(output, /\[selftest\] host=cursor/);
  assert.match(output, /\[selftest\] safe_mode=true/);
});

test('remote self-test succeeds for the generic hosted profile', async () => {
  const output = runNode(['scripts/selftest.mjs', '--mode', 'remote']);
  assert.match(output, /\[selftest\] mode=remote/);
  assert.match(output, /\[selftest\] remote_headers=Authorization,x-vector-project-id,x-vector-session-owner/);
});
