import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  HOST_DEFINITIONS,
  fixtureBaseDirForHost,
  renderHostFiles,
} from './lib/host_fixtures.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const integrationStatusPath = path.join(repoRoot, 'vector/docs/INTEGRATION_STATUS.md');

async function readText(relPath) {
  return readFile(path.join(repoRoot, relPath), 'utf8');
}

function parseStatusTable(source) {
  const rows = source
    .split('\n')
    .filter((line) => line.startsWith('|') && !line.startsWith('|---'))
    .slice(1);
  return new Map(
    rows.map((row) => {
      const columns = row.split('|').slice(1, -1).map((item) => item.trim());
      return [columns[0], columns[1]];
    }),
  );
}

function verificationRecordPath(host) {
  return path.join(HOST_DEFINITIONS[host].fixtureBaseDir, 'VERIFICATION.md');
}

function expectedStatusForHost(host) {
  return host === 'github_copilot' ? 'GitHub Copilot' : HOST_DEFINITIONS[host].label;
}

function parseRecordStatus(record, recordPath) {
  const status = record.match(/^Status:\s*(.+)$/m)?.[1]?.trim();
  assert.ok(status, `${recordPath} must declare a Status line`);
  return status;
}

function parseEvidenceFields(record, recordPath) {
  const section = record.match(/Host-specific run evidence:\n([\s\S]*?)\nPromotion gate:/);
  assert.ok(section, `${recordPath} must include a host evidence section`);
  return section[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => {
      const separator = line.indexOf(':');
      assert.ok(separator !== -1, `${recordPath} evidence line must use 'label: value' format`);
      return {
        label: line.slice(2, separator).trim(),
        value: line.slice(separator + 1).trim(),
      };
    });
}

async function main() {
  const statusTable = parseStatusTable(await readText('vector/docs/INTEGRATION_STATUS.md'));

  for (const [host, definition] of Object.entries(HOST_DEFINITIONS)) {
    const rendered = await renderHostFiles(host, {});
    const fixtureBaseDir = fixtureBaseDirForHost(host);

    for (const file of rendered) {
      const actualPath = path.join(fixtureBaseDir, file.outputPath);
      const actual = await readFile(actualPath, 'utf8');
      assert.equal(actual, file.contents, `${actualPath} must match the generated host template output`);
    }

    const recordPath = verificationRecordPath(host);
    const record = await readFile(recordPath, 'utf8');
    assert.match(record, /Generated fixture command:/, `${recordPath} must describe the installer command`);
    assert.match(record, /Self-test command:/, `${recordPath} must describe the self-test command`);
    assert.match(record, /Host-specific run evidence:/, `${recordPath} must include host-specific evidence fields`);
    assert.match(record, /Promotion gate:/, `${recordPath} must include a promotion gate`);
    const recordStatus = parseRecordStatus(record, recordPath);
    assert.ok(
      ['documented', definition.statusTarget].includes(recordStatus),
      `${recordPath} status must be documented or ${definition.statusTarget}`,
    );
    const evidenceFields = parseEvidenceFields(record, recordPath);
    assert.ok(evidenceFields.length >= 4, `${recordPath} must capture multiple host-run evidence fields`);
    if (recordStatus === definition.statusTarget) {
      for (const field of evidenceFields) {
        assert.ok(field.value, `${recordPath} must fill '${field.label}' before promotion to ${definition.statusTarget}`);
      }
    }

    const status = statusTable.get(expectedStatusForHost(host));
    assert.equal(status, recordStatus, `${definition.label} status table must match ${recordPath}`);
  }

  console.log(`Integration fixtures and verification records verified (${Object.keys(HOST_DEFINITIONS).length} local hosts)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
