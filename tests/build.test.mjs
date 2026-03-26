import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import test from 'node:test';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const hasPnpm = spawnSync(pnpm, ['-v'], { stdio: 'ignore' }).status === 0;

test('mcp server typechecks and builds', { skip: !hasPnpm }, () => {
  execFileSync(pnpm, ['--dir', 'vector/mcp_server', 'run', 'typecheck'], { stdio: 'inherit' });
  execFileSync(pnpm, ['--dir', 'vector/mcp_server', 'run', 'build'], { stdio: 'inherit' });
  assert.ok(true);
});

test('cloud worker typechecks', { skip: !hasPnpm }, () => {
  execFileSync(pnpm, ['--dir', 'vector/cloud_worker', 'run', 'typecheck'], { stdio: 'inherit' });
  assert.ok(true);
});
