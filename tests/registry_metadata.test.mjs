import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('..', import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), 'utf8'));
}

test('registry metadata matches generated contract', () => {
  execFileSync(process.execPath, ['scripts/registry_metadata.mjs', 'check'], {
    cwd: new URL('..', import.meta.url),
    stdio: 'pipe',
  });
});

test('registry metadata publishes transport, auth, toolset, and host install facts', async () => {
  const metadata = await readJson('vector/registry/server_metadata.json');

  assert.equal(metadata.schema, 'vector_registry_metadata/v1');
  assert.equal(metadata.package_version, 'v2.0.0');
  assert.equal(metadata.runtime_version, 'v2.0.0');
  assert.equal(metadata.transports.local, 'stdio');
  assert.equal(metadata.transports.remote, 'streamable_http');
  assert.equal(metadata.auth.key_prefix, 'vsk_');
  assert.ok(metadata.auth.supported_credentials.includes('oauth_access_token'));
  assert.equal(metadata.auth.resource_server.provider, 'auth0');
  assert.equal(metadata.auth.resource_server.default_required_scope, 'vector:cloud');
  assert.equal(metadata.auth.session_policy.registry_store, 'VECTOR_KB_STORE');
  assert.equal(metadata.auth.session_policy.defaults.pro, 5);
  assert.equal(metadata.auth.session_policy.anomaly_policy, 'review-first');
  assert.deepEqual(metadata.auth.remote_headers, [
    'Authorization',
    'x-vector-project-id',
    'x-vector-session-owner',
  ]);
  assert.ok(Array.isArray(metadata.capability_mode.toolsets));
  assert.ok(metadata.capability_mode.toolsets.some((toolset) => toolset.name === 'core'));
  assert.ok(metadata.capability_mode.toolsets.some((toolset) => toolset.name === 'copy'));
  assert.ok(Array.isArray(metadata.install_surfaces));
  assert.ok(metadata.install_surfaces.some((surface) => surface.host === 'cursor'));
  assert.equal(metadata.self_test_commands.cursor, 'pnpm run selftest -- --host cursor');
  assert.equal(metadata.maturity.product_stage, 'maturing_runtime');
  assert.ok(metadata.maturity.implemented_now.includes('host installer and host-facing self-test'));
  assert.ok(metadata.maturity.implemented_now.includes('optional Auth0 JWT validation for remote runtime'));
  assert.ok(metadata.maturity.implemented_now.includes('principal-scoped session registry with concurrent-session caps'));
  assert.ok(metadata.maturity.roadmap_only.includes('real host OAuth/PKCE rollout evidence'));
});
