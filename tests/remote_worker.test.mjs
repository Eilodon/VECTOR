import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { webcrypto } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Client } from '../vector/mcp_server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StreamableHTTPClientTransport } from '../vector/mcp_server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js';
import { SignJWT, exportJWK, generateKeyPair } from '../vector/cloud_worker/node_modules/jose/dist/webapi/index.js';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

globalThis.crypto ??= webcrypto;

class MemoryKVNamespace {
  constructor(seed = {}) {
    this.map = new Map(Object.entries(seed));
  }

  async get(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  async put(key, value) {
    this.map.set(key, value);
  }
}

class MemoryDurableObjectStorage {
  constructor() {
    this.map = new Map();
  }

  async get(key) {
    return this.map.has(key) ? this.map.get(key) : undefined;
  }

  async put(key, value) {
    this.map.set(key, value);
  }
}

class MemoryDurableObjectState {
  constructor() {
    this.storage = new MemoryDurableObjectStorage();
  }

  blockConcurrencyWhile(fn) {
    return Promise.resolve(fn());
  }
}

async function compileCloudWorkerForTest() {
  const tmpRoot = await mkdtemp(path.join(process.cwd(), 'vector', 'cloud_worker', '.tmp-remote-worker-'));
  const buildRoot = path.join(tmpRoot, 'bundle');
  const outDir = path.join(buildRoot, 'vector', 'cloud_worker');

  await mkdir(buildRoot, { recursive: true });
  await writeFile(path.join(buildRoot, 'package.json'), '{\n  "type": "module"\n}\n', 'utf8');

  execFileSync(
    pnpm,
    ['--dir', 'vector/cloud_worker', 'exec', 'tsc', '--outDir', outDir],
    { cwd: process.cwd(), stdio: 'pipe' },
  );

  const modulePath = path.join(outDir, 'cloud_worker', 'src', 'index.js');
  const workerModule = await import(`file://${modulePath}`);
  return {
    tmpRoot,
    workerModule,
  };
}

function createWorkerEnv(workerModule) {
  const instances = new Map();
  const licenseStore = new MemoryKVNamespace({
    vsk_remote_test: 'active',
  });

  const env = {
    VECTOR_KB_STORE: new MemoryKVNamespace(),
    LICENSE_STORE: licenseStore,
    MCP_DO: {
      idFromName(name) {
        return name;
      },
      get(id) {
        return {
          async fetch(request) {
            if (!instances.has(id)) {
              instances.set(id, new workerModule.McpDurableObject(new MemoryDurableObjectState(), env));
            }
            return instances.get(id).fetch(request);
          },
        };
      },
    },
  };

  return { env, instances };
}

async function readStoredJson(kv, key) {
  const raw = await kv.get(key);
  return raw ? JSON.parse(raw) : null;
}

async function createOAuthFixture(overrides = {}) {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = 'vector-test-key';
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';

  const issuer = 'https://vector-auth.example/';
  const audience = 'https://vector.api';
  const scope = overrides.scope ?? 'vector:cloud';
  const token = await new SignJWT({
    scope,
    permissions: scope ? scope.split(/\s+/).filter(Boolean) : [],
    'https://vector.gt/tier': 'pro',
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'vector-test-key' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(overrides.subject ?? 'auth0|vector_user_123')
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);

  return {
    token,
    issuer,
    audience,
    jwksJson: JSON.stringify({ keys: [publicJwk] }),
  };
}

function createFetch(workerModule, env) {
  return async (input, init) => {
    const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
    return workerModule.default.fetch(request, env);
  };
}

async function rateLimitKey(principal) {
  const bytes = new TextEncoder().encode(principal);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, '0')).join('');
  return `vector:ratelimit:${hash}`;
}

async function connectRemoteClient(workerModule, env, headers) {
  const transport = new StreamableHTTPClientTransport(new URL('https://vector.test/mcp'), {
    fetch: createFetch(workerModule, env),
    requestInit: {
      headers,
    },
  });
  const client = new Client({ name: 'vector-remote-test', version: '1.0.0' });
  await client.connect(transport);
  return { client, transport };
}

test('remote worker requires explicit session ownership headers', async () => {
  const { tmpRoot, workerModule } = await compileCloudWorkerForTest();
  const { env } = createWorkerEnv(workerModule);
  try {
    const response = await workerModule.default.fetch(new Request('https://vector.test/mcp', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer vsk_remote_test',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
    }), env);

    assert.equal(response.status, 400);
    assert.match(await response.text(), /x-vector-project-id/i);
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
});

test('remote worker rejects unknown or inactive license keys', async () => {
  const { tmpRoot, workerModule } = await compileCloudWorkerForTest();
  const { env } = createWorkerEnv(workerModule);
  try {
    const response = await workerModule.default.fetch(new Request('https://vector.test/mcp', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer vsk_unknown_test',
        [workerModule.VECTOR_PROJECT_HEADER]: 'remote_project_auth',
        [workerModule.VECTOR_SESSION_OWNER_HEADER]: 'owner_auth',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
    }), env);

    assert.equal(response.status, 403);
    assert.match(await response.text(), /inactive VECTOR license key/i);
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
});

test('remote worker accepts Auth0-style OAuth access tokens when configured', async () => {
  const { tmpRoot, workerModule } = await compileCloudWorkerForTest();
  const { env } = createWorkerEnv(workerModule);
  const oauth = await createOAuthFixture();
  env.VECTOR_AUTH_ISSUER = oauth.issuer;
  env.VECTOR_AUTH_AUDIENCE = oauth.audience;
  env.VECTOR_AUTH_JWKS_JSON = oauth.jwksJson;
  env.VECTOR_ALLOW_LICENSE_FALLBACK = 'false';

  let client;
  let transport;
  try {
    ({ client, transport } = await connectRemoteClient(workerModule, env, {
      Authorization: `Bearer ${oauth.token}`,
      [workerModule.VECTOR_PROJECT_HEADER]: 'oauth_project',
      [workerModule.VECTOR_SESSION_OWNER_HEADER]: 'owner_oauth',
    }));

    const snapshot = await client.callTool({ name: 'vector_state_snapshot', arguments: {} });
    const text = snapshot.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.match(text, /Phase: intake/);

    const intake = await client.callTool({
      name: 'vector_intake',
      arguments: {
        request_id: `oauth-smoke-${Date.now()}`,
        product_description: 'OAuth remote runtime product',
        icp_hypothesis: 'Founders authenticated through OAuth',
        is_live: false,
      },
    });
    const intakeText = intake.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.match(intakeText, /VECTOR Intake Card/);
  } finally {
    await transport?.close().catch(() => {});
    await rm(tmpRoot, { recursive: true, force: true });
  }
});

test('remote worker rejects OAuth access tokens that miss the required scope', async () => {
  const { tmpRoot, workerModule } = await compileCloudWorkerForTest();
  const { env } = createWorkerEnv(workerModule);
  const oauth = await createOAuthFixture({ scope: 'openid profile' });
  env.VECTOR_AUTH_ISSUER = oauth.issuer;
  env.VECTOR_AUTH_AUDIENCE = oauth.audience;
  env.VECTOR_AUTH_JWKS_JSON = oauth.jwksJson;
  env.VECTOR_ALLOW_LICENSE_FALLBACK = 'false';

  try {
    const response = await workerModule.default.fetch(new Request('https://vector.test/mcp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${oauth.token}`,
        [workerModule.VECTOR_PROJECT_HEADER]: 'oauth_project_denied',
        [workerModule.VECTOR_SESSION_OWNER_HEADER]: 'owner_oauth_denied',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
    }), env);

    assert.equal(response.status, 403);
    assert.match(await response.text(), /missing required scope/i);
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
});

test('remote worker enforces concurrent-session caps per authenticated principal', async () => {
  const { tmpRoot, workerModule } = await compileCloudWorkerForTest();
  const { env } = createWorkerEnv(workerModule);
  const oauth = await createOAuthFixture({ subject: 'auth0|vector_cap_test', scope: 'vector:cloud' });
  env.VECTOR_AUTH_ISSUER = oauth.issuer;
  env.VECTOR_AUTH_AUDIENCE = oauth.audience;
  env.VECTOR_AUTH_JWKS_JSON = oauth.jwksJson;
  env.VECTOR_ALLOW_LICENSE_FALLBACK = 'false';
  env.VECTOR_AUTH_MAX_SESSIONS_PRO = '1';

  let firstTransport;
  try {
    ({ transport: firstTransport } = await connectRemoteClient(workerModule, env, {
        Authorization: `Bearer ${oauth.token}`,
        [workerModule.VECTOR_PROJECT_HEADER]: 'cap_project',
        [workerModule.VECTOR_SESSION_OWNER_HEADER]: 'owner_one',
      }));

    await assert.rejects(
      connectRemoteClient(workerModule, env, {
        Authorization: `Bearer ${oauth.token}`,
        [workerModule.VECTOR_PROJECT_HEADER]: 'cap_project',
        [workerModule.VECTOR_SESSION_OWNER_HEADER]: 'owner_two',
      }),
      /concurrent session limit/i,
    );

    const anomalyKeys = Array.from(env.VECTOR_KB_STORE.map.keys()).filter((key) => key.startsWith('vector:auth:anomalies:'));
    assert.equal(anomalyKeys.length, 1);
    const events = await readStoredJson(env.VECTOR_KB_STORE, anomalyKeys[0]);
    assert.ok(events.some((event) => event.event === 'concurrent_session_cap_exceeded'));
  } finally {
    await firstTransport?.close().catch(() => {});
    await rm(tmpRoot, { recursive: true, force: true });
  }
});

test('remote worker logs anomaly events for device and IP drift without blocking the active session', async () => {
  const { tmpRoot, workerModule } = await compileCloudWorkerForTest();
  const { env } = createWorkerEnv(workerModule);
  const oauth = await createOAuthFixture({ subject: 'auth0|vector_anomaly_test', scope: 'vector:cloud' });
  env.VECTOR_AUTH_ISSUER = oauth.issuer;
  env.VECTOR_AUTH_AUDIENCE = oauth.audience;
  env.VECTOR_AUTH_JWKS_JSON = oauth.jwksJson;
  env.VECTOR_ALLOW_LICENSE_FALLBACK = 'false';

  let firstTransport;
  try {
    ({ transport: firstTransport } = await connectRemoteClient(workerModule, env, {
        Authorization: `Bearer ${oauth.token}`,
        [workerModule.VECTOR_PROJECT_HEADER]: 'anomaly_project',
        [workerModule.VECTOR_SESSION_OWNER_HEADER]: 'owner_same',
        'user-agent': 'VectorTest/1.0 DeviceA',
        'x-forwarded-for': '10.0.0.22',
      }));

    const followup = await workerModule.default.fetch(new Request('https://vector.test/mcp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${oauth.token}`,
        [workerModule.VECTOR_PROJECT_HEADER]: 'anomaly_project',
        [workerModule.VECTOR_SESSION_OWNER_HEADER]: 'owner_same',
        'user-agent': 'VectorTest/1.0 DeviceB',
        'x-forwarded-for': '10.9.8.7',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 99, method: 'initialize', params: {} }),
    }), env);
    assert.notEqual(followup.status, 429);

    const anomalyKeys = Array.from(env.VECTOR_KB_STORE.map.keys()).filter((key) => key.startsWith('vector:auth:anomalies:'));
    assert.equal(anomalyKeys.length, 1);
    const events = await readStoredJson(env.VECTOR_KB_STORE, anomalyKeys[0]);
    assert.ok(events.some((event) => event.event === 'device_fingerprint_changed'));
    assert.ok(events.some((event) => event.event === 'ip_range_changed'));
  } finally {
    await firstTransport?.close().catch(() => {});
    await rm(tmpRoot, { recursive: true, force: true });
  }
});

test('remote worker returns 429 when per-principal request rate limit is exceeded', async () => {
  const { tmpRoot, workerModule } = await compileCloudWorkerForTest();
  const { env } = createWorkerEnv(workerModule);
  const principal = 'vsk_remote_test';
  const key = await rateLimitKey(principal);
  await env.VECTOR_KB_STORE.put(key, JSON.stringify({
    count: 60,
    window_start: new Date().toISOString(),
  }));

  try {
    const response = await workerModule.default.fetch(new Request('https://vector.test/mcp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${principal}`,
        [workerModule.VECTOR_PROJECT_HEADER]: 'rate_limit_project',
        [workerModule.VECTOR_SESSION_OWNER_HEADER]: 'owner_rate_limit',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
    }), env);

    assert.equal(response.status, 429);
    assert.match(await response.text(), /rate limit \(60\/min\) exceeded/i);
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
});

test('remote streamable-http smoke covers mutate path, read path, and multi-session isolation', async () => {
  const { tmpRoot, workerModule } = await compileCloudWorkerForTest();
  const { env } = createWorkerEnv(workerModule);

  const ownerAHeaders = {
    Authorization: 'Bearer vsk_remote_test',
    [workerModule.VECTOR_PROJECT_HEADER]: 'remote_project_a',
    [workerModule.VECTOR_SESSION_OWNER_HEADER]: 'owner_a',
  };
  const ownerBHeaders = {
    Authorization: 'Bearer vsk_remote_test',
    [workerModule.VECTOR_PROJECT_HEADER]: 'remote_project_a',
    [workerModule.VECTOR_SESSION_OWNER_HEADER]: 'owner_b',
  };

  let clientA;
  let transportA;
  let clientB;
  let transportB;
  try {
    ({ client: clientA, transport: transportA } = await connectRemoteClient(workerModule, env, ownerAHeaders));

    const initial = await clientA.callTool({ name: 'vector_state_snapshot', arguments: {} });
    const initialText = initial.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.match(initialText, /Phase: intake/);

    const requestId = `remote-smoke-${Date.now()}`;
    const first = await clientA.callTool({
      name: 'vector_intake',
      arguments: {
        request_id: requestId,
        product_description: 'Remote smoke GTM product',
        icp_hypothesis: 'Founders testing remote MCP runtime',
        is_live: false,
      },
    });
    const second = await clientA.callTool({
      name: 'vector_intake',
      arguments: {
        request_id: requestId,
        product_description: 'Remote smoke GTM product',
        icp_hypothesis: 'Founders testing remote MCP runtime',
        is_live: false,
      },
    });
    const firstText = first.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    const secondText = second.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.equal(secondText, firstText);
    assert.match(firstText, /VECTOR Intake Card/);

    const persisted = await clientA.callTool({ name: 'vector_state_snapshot', arguments: {} });
    const persistedText = persisted.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.match(persistedText, /Phase: icp/);
    assert.match(persistedText, /Remote smoke GTM product/);

    ({ client: clientB, transport: transportB } = await connectRemoteClient(workerModule, env, ownerBHeaders));
    const isolated = await clientB.callTool({ name: 'vector_state_snapshot', arguments: {} });
    const isolatedText = isolated.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.match(isolatedText, /Phase: intake/);
    assert.doesNotMatch(isolatedText, /Remote smoke GTM product/);

    await clientB.callTool({
      name: 'vector_intake',
      arguments: {
        request_id: `remote-smoke-b-${Date.now()}`,
        product_description: 'Remote smoke GTM product B',
        icp_hypothesis: 'Founders testing isolated session ownership',
        is_live: false,
      },
    });

    const persistedA = await clientA.callTool({ name: 'vector_state_snapshot', arguments: {} });
    const persistedAText = persistedA.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.match(persistedAText, /Remote smoke GTM product/);
    assert.doesNotMatch(persistedAText, /Remote smoke GTM product B/);
  } finally {
    await transportA?.close().catch(() => {});
    await transportB?.close().catch(() => {});
    await rm(tmpRoot, { recursive: true, force: true });
  }
});
