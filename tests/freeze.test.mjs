import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const packageRoot = fileURLToPath(root);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'tests' || entry.name === 'node_modules' || entry.name === '.git') continue;
      files.push(...await walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function rel(p) {
  return path.relative(packageRoot, p).replaceAll('\\', '/');
}

test('manifest file count matches the shipped file list', async () => {
  const manifest = JSON.parse(await readFile(path.join(packageRoot, 'manifest.json'), 'utf8'));
  assert.equal(manifest.file_count, manifest.files.length);
  execFileSync(process.execPath, ['scripts/manifest.mjs', 'check'], {
    cwd: packageRoot,
    stdio: 'pipe',
  });
  for (const relPath of manifest.files) {
    await readFile(path.join(packageRoot, relPath), 'utf8');
  }
});

test('package dependencies stay on the frozen major lines', async () => {
  const pkg = JSON.parse(await readFile(path.join(packageRoot, 'vector/mcp_server/package.json'), 'utf8'));
  assert.match(pkg.devDependencies.typescript, /^\^5\./);
  assert.match(pkg.devDependencies['@types/node'], /^\^25\./);
  assert.match(pkg.dependencies.zod, /^\^4\./);
  assert.match(pkg.dependencies['@modelcontextprotocol/sdk'], /^\^1\./);
});

test('canonical package files do not contain legacy duplicate markers', async () => {
  const files = await walk(packageRoot);
  const forbidden = [
    'Suite v1.0 enrichment',
    'vector_thesis_venue',
    'one source of truth per concept. One source of truth per concept.',
  ];

  for (const file of files) {
    const text = await readFile(file, 'utf8');
    for (const token of forbidden) {
      assert.ok(!text.includes(token), `${rel(file)} still contains legacy marker: ${token}`);
    }
  }
});

test('release freeze doc exists and states the maintenance boundary', async () => {
  const freeze = await readFile(path.join(packageRoot, 'vector/docs/RELEASE_FREEZE.md'), 'utf8');
  assert.match(freeze, /What is frozen/);
  assert.match(freeze, /What is not allowed/);
  assert.match(freeze, /bug fixes/);
});
