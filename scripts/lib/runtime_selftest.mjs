import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '../../vector/mcp_server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StdioClientTransport } from '../../vector/mcp_server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import { StreamableHTTPClientTransport } from '../../vector/mcp_server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js';
import { renderHostFiles, resolveHostDefinition, writeRenderedHostFiles, repoRoot } from './host_fixtures.mjs';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const localServerEntry = path.join(repoRoot, 'vector/mcp_server/dist/index.js');

function summarizeToolsets(csv) {
  return csv.split(',').map((item) => item.trim()).filter(Boolean);
}

async function pathExists(targetPath) {
  try {
    await access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function runLocalFlow(config, options = {}) {
  const kbRoot = await mkdtemp(path.join(os.tmpdir(), 'vector-selftest-kb-'));
  const requestId = options.requestId ?? `selftest-${Date.now()}`;
  const env = {
    ...process.env,
    ...(config.env ?? {}),
    VECTOR_KB_PATH: kbRoot,
    ...(options.envOverrides ?? {}),
  };
  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args,
    cwd: repoRoot,
    env,
    stderr: 'pipe',
  });
  const client = new Client({ name: 'vector-selftest', version: '1.0.0' });

  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.ok(tools.tools.some((tool) => tool.name === 'vector_state_snapshot'));
    assert.ok(tools.tools.some((tool) => tool.name === 'vector_intake'));

    const snapshot = await client.callTool({ name: 'vector_state_snapshot', arguments: {} });
    const snapshotText = snapshot.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.match(snapshotText, /VECTOR State Snapshot/);

    const intakeArgs = {
      request_id: requestId,
      product_description: `${options.label ?? 'Self-test'} GTM product`,
      icp_hypothesis: 'Founders validating VECTOR installation',
      is_live: false,
      platform: options.platform ?? 'selftest',
    };
    const first = await client.callTool({ name: 'vector_intake', arguments: intakeArgs });
    const second = await client.callTool({ name: 'vector_intake', arguments: intakeArgs });
    const firstText = first.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    const secondText = second.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.equal(secondText, firstText);

    const statePath = path.join(kbRoot, env.VECTOR_PROJECT_ID, 'vector_state.json');
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    assert.equal(state.phase, 'icp');
    assert.deepEqual(state.logs.processed_requests, [requestId]);
    assert.equal(state.request_registry[requestId].action, 'vector_intake');

    return {
      mode: 'local',
      project_id: env.VECTOR_PROJECT_ID,
      toolsets: summarizeToolsets(env.VECTOR_TOOLSETS ?? ''),
      safe_mode: /^(1|true|yes|on)$/i.test(env.VECTOR_SAFE_MODE ?? ''),
      runtime_dir: path.dirname(statePath),
    };
  } finally {
    await transport.close().catch(() => {});
    await rm(kbRoot, { recursive: true, force: true });
  }
}

async function loadGeneratedHostConfig(host, outputDir) {
  const definition = resolveHostDefinition(host);
  const configPath = path.join(outputDir, definition.primaryConfigRelPath);
  const raw = await readFile(configPath, 'utf8');
  const config = JSON.parse(raw);
  const server = config?.mcpServers?.vector;
  assert.ok(server, `${configPath} must define mcpServers.vector`);
  return { configPath, server };
}

export async function runHostSelfTest(host, options = {}) {
  const definition = resolveHostDefinition(host);
  const baseDir = options.outputDir ?? await mkdtemp(path.join(os.tmpdir(), `vector-host-${host}-`));
  const shouldCleanup = !options.outputDir;

  try {
    const rendered = await renderHostFiles(host, {
      projectId: options.projectId ?? definition.defaultProjectId,
      licenseKey: options.licenseKey,
      toolsets: options.toolsets,
      safeMode: options.safeMode,
    });
    await writeRenderedHostFiles(baseDir, rendered, true);
    const { configPath, server } = await loadGeneratedHostConfig(host, baseDir);
    const result = await runLocalFlow(server, {
      label: definition.label,
      platform: host,
      envOverrides: options.envOverrides,
    });
    return {
      ...result,
      mode: 'host',
      host,
      config_path: configPath,
      generated_files: rendered.map((file) => path.join(baseDir, file.outputPath)),
    };
  } finally {
    if (shouldCleanup) {
      await rm(baseDir, { recursive: true, force: true });
    }
  }
}

export async function runGenericLocalSelfTest(options = {}) {
  return runLocalFlow({
    command: process.execPath,
    args: [localServerEntry],
    env: {
      VECTOR_LICENSE_KEY: options.licenseKey ?? 'vsk_selftest_local',
      VECTOR_PROJECT_ID: options.projectId ?? 'selftest_local',
      VECTOR_TOOLSETS: options.toolsets ?? 'core,research,strategy,copy',
      VECTOR_SAFE_MODE: options.safeMode ?? 'true',
    },
  }, {
    label: 'Generic local',
    platform: 'selftest-local',
  });
}

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

async function compileCloudWorkerForSelfTest() {
  const tmpRoot = await mkdtemp(path.join(repoRoot, 'vector', 'cloud_worker', '.tmp-selftest-worker-'));
  const buildRoot = path.join(tmpRoot, 'bundle');
  const outDir = path.join(buildRoot, 'vector', 'cloud_worker');

  await mkdir(buildRoot, { recursive: true });
  await writeFile(path.join(buildRoot, 'package.json'), '{\n  "type": "module"\n}\n', 'utf8');

  execFileSync(
    pnpm,
    ['--dir', 'vector/cloud_worker', 'exec', 'tsc', '--outDir', outDir],
    { cwd: repoRoot, stdio: 'pipe' },
  );

  const modulePath = path.join(outDir, 'cloud_worker', 'src', 'index.js');
  return {
    tmpRoot,
    workerModule: await import(`file://${modulePath}`),
  };
}

function createWorkerEnv(workerModule) {
  const instances = new Map();
  const licenseStore = new MemoryKVNamespace({
    vsk_remote_selftest: 'active',
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

  return { env };
}

function createFetch(workerModule, env) {
  return async (input, init) => {
    const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
    return workerModule.default.fetch(request, env);
  };
}

async function connectRemoteClient(workerModule, env, headers) {
  const transport = new StreamableHTTPClientTransport(new URL('https://vector.test/mcp'), {
    fetch: createFetch(workerModule, env),
    requestInit: { headers },
  });
  const client = new Client({ name: 'vector-remote-selftest', version: '1.0.0' });
  await client.connect(transport);
  return { client, transport };
}

export async function runGenericRemoteSelfTest() {
  const { tmpRoot, workerModule } = await compileCloudWorkerForSelfTest();
  const { env } = createWorkerEnv(workerModule);
  const ownerAHeaders = {
    Authorization: 'Bearer vsk_remote_selftest',
    [workerModule.VECTOR_PROJECT_HEADER]: 'remote_selftest',
    [workerModule.VECTOR_SESSION_OWNER_HEADER]: 'owner_a',
  };
  const ownerBHeaders = {
    Authorization: 'Bearer vsk_remote_selftest',
    [workerModule.VECTOR_PROJECT_HEADER]: 'remote_selftest',
    [workerModule.VECTOR_SESSION_OWNER_HEADER]: 'owner_b',
  };

  let clientA;
  let transportA;
  let clientB;
  let transportB;
  try {
    const badRequest = await workerModule.default.fetch(new Request('https://vector.test/mcp', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer vsk_remote_selftest',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
    }), env);
    assert.equal(badRequest.status, 400);

    ({ client: clientA, transport: transportA } = await connectRemoteClient(workerModule, env, ownerAHeaders));
    const requestId = `remote-selftest-${Date.now()}`;
    await clientA.callTool({
      name: 'vector_intake',
      arguments: {
        request_id: requestId,
        product_description: 'Remote self-test GTM product',
        icp_hypothesis: 'Operators testing hosted VECTOR MCP',
        is_live: false,
      },
    });

    const persisted = await clientA.callTool({ name: 'vector_state_snapshot', arguments: {} });
    const persistedText = persisted.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.match(persistedText, /Phase: icp/);

    ({ client: clientB, transport: transportB } = await connectRemoteClient(workerModule, env, ownerBHeaders));
    const isolated = await clientB.callTool({ name: 'vector_state_snapshot', arguments: {} });
    const isolatedText = isolated.content.map((item) => item.type === 'text' ? item.text : '').join('\n');
    assert.match(isolatedText, /Phase: intake/);

    return {
      mode: 'remote',
      project_id: 'remote_selftest',
      remote_headers: [
        'Authorization',
        workerModule.VECTOR_PROJECT_HEADER,
        workerModule.VECTOR_SESSION_OWNER_HEADER,
      ],
      isolation_verified: true,
    };
  } finally {
    await transportA?.close().catch(() => {});
    await transportB?.close().catch(() => {});
    await rm(tmpRoot, { recursive: true, force: true });
  }
}
