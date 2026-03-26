import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { HOST_DEFINITIONS } from './lib/host_fixtures.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'manifest.json');
const runtimeContractPath = path.join(repoRoot, 'vector/schemas/runtime_contract.yaml');
const capabilityContractPath = path.join(repoRoot, 'vector/mcp_server/capability_contract.ts');
const integrationStatusPath = path.join(repoRoot, 'vector/docs/INTEGRATION_STATUS.md');
const cloudWorkerPath = path.join(repoRoot, 'vector/cloud_worker/src/index.ts');
const metadataPath = path.join(repoRoot, 'vector/registry/server_metadata.json');

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readText(filePath) {
  return readFile(filePath, 'utf8');
}

function extractBlock(source, startPattern, endPattern) {
  const start = source.indexOf(startPattern);
  const end = source.indexOf(endPattern, start);
  if (start === -1 || end === -1) {
    throw new Error(`Failed to extract block between '${startPattern}' and '${endPattern}'.`);
  }
  return source.slice(start + startPattern.length, end);
}

function parseCapabilityContract(source) {
  const toolsetsBlock = extractBlock(source, 'export const CAPABILITY_TOOLSETS = {', '} as const;');
  const mutatingBlock = extractBlock(source, 'const MUTATING_TOOLS = new Set<string>([', ']);');
  const safeModeBlock = extractBlock(source, 'const SAFE_MODE_BLOCKED_TOOLS = new Set<string>([', ']);');

  const parseStringArray = (block) => Array.from(block.matchAll(/"([^"]+)"/g), (match) => match[1]);
  const parseToolsets = (block) => {
    const lines = block.split('\n');
    const result = {};
    let current = null;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      const toolsetMatch = line.match(/^([a-z_]+): \[$/);
      if (toolsetMatch) {
        current = toolsetMatch[1];
        result[current] = [];
        continue;
      }
      if (!current) continue;
      if (line === '],' || line === ']') {
        current = null;
        continue;
      }
      const toolMatch = line.match(/^"([^"]+)"/);
      if (toolMatch) {
        result[current].push(toolMatch[1]);
      }
    }
    return result;
  };

  return {
    toolsets: parseToolsets(toolsetsBlock),
    mutatingTools: parseStringArray(mutatingBlock),
    safeModeBlockedTools: parseStringArray(safeModeBlock),
  };
}

function parseRuntimeContract(source) {
  const version = source.match(/version:\s*(v[0-9.]+)/)?.[1];
  const localTransport = source.match(/local:\s*([a-z_]+)/)?.[1];
  const remoteTransport = source.match(/remote:\s*([a-z_]+)/)?.[1];
  const restrictedModeEnv = source.match(/restricted_mode_env:\s*([A-Z_]+)/)?.[1];
  const safeModeEnv = source.match(/safe_mode_env:\s*([A-Z_]+)/)?.[1];
  if (!version || !localTransport || !remoteTransport || !restrictedModeEnv || !safeModeEnv) {
    throw new Error('Failed to parse runtime contract metadata.');
  }
  return {
    version,
    transports: {
      local: localTransport,
      remote: remoteTransport,
    },
    capabilityMode: {
      restrictedModeEnv,
      safeModeEnv,
    },
  };
}

function parseIntegrationStatus(source) {
  const rows = source
    .split('\n')
    .filter((line) => line.startsWith('|') && !line.startsWith('|---'))
    .slice(1);
  const hosts = [];
  for (const row of rows) {
    const columns = row.split('|').slice(1, -1).map((item) => item.trim());
    if (columns.length < 4) continue;
    hosts.push({
      host: columns[0],
      status: columns[1],
      integration_shape: columns[2],
      notes: columns[3],
    });
  }
  return hosts;
}

function parseCloudWorkerAuth(source) {
  const projectHeader = source.match(/export const VECTOR_PROJECT_HEADER = "([^"]+)"/)?.[1];
  const sessionOwnerHeader = source.match(/export const VECTOR_SESSION_OWNER_HEADER = "([^"]+)"/)?.[1];
  if (!projectHeader || !sessionOwnerHeader) {
    throw new Error('Failed to parse cloud worker header constants.');
  }
  return {
    scheme: 'bearer',
    key_prefix: 'vsk_',
    supported_credentials: ['vector_license_key', 'oauth_access_token'],
    resource_server: {
      provider: 'auth0',
      env: {
        issuer: 'VECTOR_AUTH_ISSUER',
        audience: 'VECTOR_AUTH_AUDIENCE',
        jwks_json_override: 'VECTOR_AUTH_JWKS_JSON',
        required_scope: 'VECTOR_AUTH_REQUIRED_SCOPE',
        allow_license_fallback: 'VECTOR_ALLOW_LICENSE_FALLBACK',
      },
      default_required_scope: 'vector:cloud',
    },
    session_policy: {
      registry_store: 'VECTOR_KB_STORE',
      env: {
        idle_ttl_ms: 'VECTOR_AUTH_SESSION_IDLE_TTL_MS',
        max_sessions_default: 'VECTOR_AUTH_MAX_SESSIONS_DEFAULT',
        max_sessions_license: 'VECTOR_AUTH_MAX_SESSIONS_LICENSE',
        max_sessions_basic: 'VECTOR_AUTH_MAX_SESSIONS_BASIC',
        max_sessions_pro: 'VECTOR_AUTH_MAX_SESSIONS_PRO',
        max_sessions_custom: 'VECTOR_AUTH_MAX_SESSIONS_CUSTOM',
        max_sessions_enterprise: 'VECTOR_AUTH_MAX_SESSIONS_ENTERPRISE',
        anomaly_log_limit: 'VECTOR_AUTH_ANOMALY_LOG_LIMIT',
      },
      default_idle_ttl_ms: 14400000,
      defaults: {
        license: 2,
        basic: 2,
        pro: 5,
        custom: 10,
        enterprise: 20,
      },
      anomaly_policy: 'review-first',
    },
    remote_headers: ['Authorization', projectHeader, sessionOwnerHeader],
  };
}

function buildMetadata({ manifest, runtime, capability, compatibility, auth }) {
  const toolsets = Object.entries(capability.toolsets).map(([name, tools]) => ({
    name,
    tools,
    mutating_tools: tools.filter((tool) => capability.mutatingTools.includes(tool)),
    read_only_tools: tools.filter((tool) => !capability.mutatingTools.includes(tool)),
    safe_mode_blocked_tools: tools.filter((tool) => capability.safeModeBlockedTools.includes(tool)),
  }));

  const installSurfaces = Object.entries(HOST_DEFINITIONS).map(([host, definition]) => ({
    host,
    label: definition.label,
    runtime_modes: definition.runtimeModes,
    install_surface: definition.installSurface,
    default_project_id: definition.defaultProjectId,
    default_toolsets: definition.defaultToolsets,
    default_safe_mode: definition.defaultSafeMode,
    generated_files: definition.templateFiles.map((file) => file.outputPath),
  }));

  return {
    schema: 'vector_registry_metadata/v1',
    package_name: manifest.package,
    package_version: manifest.version,
    runtime_version: runtime.version,
    target_persona: manifest.target_persona,
    transports: runtime.transports,
    auth,
    capability_mode: {
      restricted_mode_env: runtime.capabilityMode.restrictedModeEnv,
      safe_mode_env: runtime.capabilityMode.safeModeEnv,
      default_toolsets: Object.keys(capability.toolsets),
      optional_toolsets: Object.keys(capability.toolsets),
      toolsets,
    },
    maturity: {
      product_stage: 'maturing_runtime',
      implemented_now: [
        'local stdio runtime',
        'remote streamable-http runtime',
        'bearer license validation with active license check',
        'optional Auth0 JWT validation for remote runtime',
        'principal-scoped session registry with concurrent-session caps',
        'review-first anomaly event logging for device and IP drift',
        'ownership headers for remote sessions',
        'capability-scoped toolsets',
        'provider-backed research with fixture and env-gated production connectors',
        'advisory graph memory with automatic sync on state mutation',
        'host installer and host-facing self-test',
      ],
      roadmap_only: [
        'token rotation and anomaly detection suite',
        'community KB export and anonymized aggregate insights',
        'real host OAuth/PKCE rollout evidence',
      ],
      verification_boundary: 'Generated fixtures and repo self-tests do not promote a host beyond documented without a real host run.',
    },
    install_surfaces: installSurfaces,
    compatibility,
    self_test_commands: {
      local_generic: 'pnpm run selftest -- --mode local',
      remote_generic: 'pnpm run selftest -- --mode remote',
      cursor: 'pnpm run selftest -- --host cursor',
      cline: 'pnpm run selftest -- --host cline',
      windsurf: 'pnpm run selftest -- --host windsurf',
      github_copilot: 'pnpm run selftest -- --host github_copilot',
    },
  };
}

async function generateMetadata() {
  const [manifest, runtimeSource, capabilitySource, integrationSource, cloudWorkerSource] = await Promise.all([
    readJson(manifestPath),
    readText(runtimeContractPath),
    readText(capabilityContractPath),
    readText(integrationStatusPath),
    readText(cloudWorkerPath),
  ]);

  return buildMetadata({
    manifest,
    runtime: parseRuntimeContract(runtimeSource),
    capability: parseCapabilityContract(capabilitySource),
    compatibility: parseIntegrationStatus(integrationSource),
    auth: parseCloudWorkerAuth(cloudWorkerSource),
  });
}

function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortJson(value[key])]),
    );
  }
  return value;
}

async function main() {
  const command = process.argv[2] ?? 'check';
  const generated = generateMetadata();

  if (command === 'print') {
    console.log(JSON.stringify(await generated, null, 2));
    return;
  }

  if (command === 'write') {
    await mkdir(path.dirname(metadataPath), { recursive: true });
    await writeFile(metadataPath, `${JSON.stringify(await generated, null, 2)}\n`, 'utf8');
    console.log(`registry metadata updated at ${path.relative(repoRoot, metadataPath)}`);
    return;
  }

  if (command !== 'check') {
    throw new Error(`Unknown command '${command}'. Use 'check', 'write', or 'print'.`);
  }

  const [actual, expected] = await Promise.all([generated, readJson(metadataPath)]);
  assert.deepEqual(sortJson(expected), sortJson(actual), 'vector/registry/server_metadata.json does not match generated metadata');
  console.log('registry metadata matches generated sources');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
