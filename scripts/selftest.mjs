import path from 'node:path';
import { runGenericLocalSelfTest, runGenericRemoteSelfTest, runHostSelfTest } from './lib/runtime_selftest.mjs';
import { LOCAL_INSTALL_HOSTS } from './lib/host_fixtures.mjs';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function printSummary(result) {
  console.log(`[selftest] mode=${result.mode}`);
  if (result.host) {
    console.log(`[selftest] host=${result.host}`);
  }
  if (result.config_path) {
    console.log(`[selftest] config=${result.config_path}`);
  }
  if (result.project_id) {
    console.log(`[selftest] project_id=${result.project_id}`);
  }
  if (Array.isArray(result.toolsets) && result.toolsets.length) {
    console.log(`[selftest] toolsets=${result.toolsets.join(',')}`);
  }
  if (typeof result.safe_mode === 'boolean') {
    console.log(`[selftest] safe_mode=${result.safe_mode}`);
  }
  if (Array.isArray(result.remote_headers)) {
    console.log(`[selftest] remote_headers=${result.remote_headers.join(',')}`);
  }
  if (result.runtime_dir) {
    console.log(`[selftest] runtime_dir=${result.runtime_dir}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.mode ?? (args.host ? 'host' : 'local');

  if (args['list-hosts']) {
    console.log(LOCAL_INSTALL_HOSTS.join('\n'));
    return;
  }

  if (mode === 'host') {
    if (!args.host) {
      throw new Error('Host self-test requires --host <cursor|cline|windsurf|github_copilot>.');
    }
    const result = await runHostSelfTest(args.host, {
      outputDir: args['output-dir'] ? path.resolve(args['output-dir']) : undefined,
      projectId: args['project-id'],
      licenseKey: args['license-key'],
      toolsets: args.toolsets,
      safeMode: typeof args['safe-mode'] === 'string' ? args['safe-mode'] : undefined,
    });
    printSummary(result);
    return;
  }

  if (mode === 'remote') {
    const result = await runGenericRemoteSelfTest();
    printSummary(result);
    return;
  }

  if (mode === 'local') {
    const result = await runGenericLocalSelfTest({
      projectId: args['project-id'],
      licenseKey: args['license-key'],
      toolsets: args.toolsets,
      safeMode: args['safe-mode'],
    });
    printSummary(result);
    return;
  }

  throw new Error(`Unknown self-test mode '${mode}'. Use local, remote, or host.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
