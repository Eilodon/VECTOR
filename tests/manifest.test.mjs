import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('..', import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), 'utf8'));
}

test('manifest matches the generated workspace contract', () => {
  execFileSync(process.execPath, ['scripts/manifest.mjs', 'check'], {
    cwd: new URL('..', import.meta.url),
    stdio: 'pipe',
  });
});

test('manifest and package versions are aligned', async () => {
  const manifest = await readJson('manifest.json');
  const pkg = await readJson('vector/mcp_server/package.json');

  const cloudPkg = await readJson('vector/cloud_worker/package.json');

  assert.equal(manifest.version, 'v2.0.0');
  assert.equal(pkg.version, '2.0.0');
  assert.equal(cloudPkg.version, '2.0.0');
  assert.equal(pkg.name, 'vector-mcp-server');
  assert.ok(Array.isArray(manifest.files));
  assert.ok(manifest.files.includes('vector/skills/design/SKILL.md'));
  assert.ok(manifest.files.includes('.github/workflows/ci.yml'));
  assert.ok(manifest.files.includes('vector/docs/INTEGRATION_STATUS.md'));
  assert.ok(manifest.files.includes('vector/platforms/github_copilot.md'));
});
