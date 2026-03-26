import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'manifest.json');
const ignoredDirs = new Set(['.git', 'node_modules', 'dist']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
      continue;
    }
    const relPath = path.relative(repoRoot, fullPath).replaceAll('\\', '/');
    files.push(relPath);
  }
  return files;
}

async function loadManifest() {
  return JSON.parse(await readFile(manifestPath, 'utf8'));
}

function withGeneratedFields(manifest, files) {
  return {
    ...manifest,
    files,
    file_count: files.length,
  };
}

function compareArrays(actual, expected) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  return {
    missingFromManifest: actual.filter((item) => !expectedSet.has(item)),
    missingFromWorkspace: expected.filter((item) => !actualSet.has(item)),
  };
}

async function main() {
  const command = process.argv[2] ?? 'check';
  const manifest = await loadManifest();
  const files = (await walk(repoRoot)).sort();

  if (command === 'write') {
    const nextManifest = withGeneratedFields(manifest, files);
    await writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, 'utf8');
    console.log(`manifest.json updated with ${files.length} files`);
    return;
  }

  if (command !== 'check' && command !== 'print') {
    throw new Error(`Unknown command '${command}'. Use 'check', 'write', or 'print'.`);
  }

  if (command === 'print') {
    console.log(JSON.stringify(files, null, 2));
    return;
  }

  const expectedFiles = Array.isArray(manifest.files) ? manifest.files : [];
  const diff = compareArrays(files, expectedFiles);
  assert.equal(manifest.file_count, expectedFiles.length, 'manifest.file_count does not match manifest.files.length');
  assert.deepEqual(diff.missingFromManifest, [], `Workspace files missing from manifest: ${diff.missingFromManifest.join(', ')}`);
  assert.deepEqual(diff.missingFromWorkspace, [], `Manifest files missing from workspace: ${diff.missingFromWorkspace.join(', ')}`);
  assert.deepEqual(expectedFiles, files, 'manifest.files must match the generated workspace file list order');
  console.log(`manifest.json matches generated file list (${files.length} files)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
