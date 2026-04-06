import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const ignoredDirs = new Set(['.git', 'node_modules', 'dist']);

const englishProtectedFiles = [
  'README.md',
  'vector/docs/FAQ.md',
  'vector/docs/GUIDE.md',
  'vector/docs/WS5_WS6_IMPLEMENTATION_CHECKLIST.md',
  'vector/docs/adr/0001-vector-next-architecture.md',
];

const bannedEnglishOnlyMarkers = [
  /Vietnamese note/i,
];

const vietnameseCharacterPattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const bannedAbsolutePathPatterns = [
  /\]\((?:\/home\/|\/Users\/|[A-Za-z]:\\)/,
  /\/home\/[^/\s]+\/[^)\s]*/,
  /\/Users\/[^/\s]+\/[^)\s]*/,
];

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
    files.push(path.relative(repoRoot, fullPath).replaceAll('\\', '/'));
  }
  return files;
}

async function readText(relPath) {
  return readFile(path.join(repoRoot, relPath), 'utf8');
}

function assertNoAbsoluteMachinePaths(relPath, source, errors) {
  for (const pattern of bannedAbsolutePathPatterns) {
    if (pattern.test(source)) {
      errors.push(`${relPath}: contains a machine-local absolute path`);
      return;
    }
  }
}

function assertEnglishOnlyProtectedFile(relPath, source, errors) {
  for (const pattern of bannedEnglishOnlyMarkers) {
    if (pattern.test(source)) {
      errors.push(`${relPath}: contains a banned bilingual marker`);
      return;
    }
  }
  if (vietnameseCharacterPattern.test(source)) {
    errors.push(`${relPath}: contains Vietnamese characters but is inside the English-only protected set`);
  }
}

async function main() {
  const files = await walk(repoRoot);
  const markdownFiles = files.filter((file) => file.endsWith('.md'));
  const errors = [];

  for (const relPath of markdownFiles) {
    const source = await readText(relPath);
    assertNoAbsoluteMachinePaths(relPath, source, errors);
  }

  for (const relPath of englishProtectedFiles) {
    const source = await readText(relPath);
    assertEnglishOnlyProtectedFile(relPath, source, errors);
  }

  if (errors.length) {
    throw new Error(`Repository hygiene check failed:\n- ${errors.join('\n- ')}`);
  }

  console.log(`Repository hygiene checks passed (${markdownFiles.length} markdown files scanned, ${englishProtectedFiles.length} protected English-only files)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
