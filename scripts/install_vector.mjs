import path from 'node:path';
import { LOCAL_INSTALL_HOSTS, renderHostFiles, resolveHostDefinition, writeRenderedHostFiles } from './lib/host_fixtures.mjs';

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

function printUsage() {
  console.log('Usage: node scripts/install_vector.mjs --host <cursor|cline|windsurf|github_copilot> [--output-dir <path>] [--project-id <id>] [--license-key <key>] [--toolsets <csv>] [--safe-mode <true|false>]');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args['list-hosts']) {
    console.log(LOCAL_INSTALL_HOSTS.join('\n'));
    return;
  }

  if (!args.host) {
    printUsage();
    throw new Error('Missing required --host argument.');
  }

  const definition = resolveHostDefinition(args.host);
  const outputDir = path.resolve(args['output-dir'] ?? process.cwd());
  const rendered = await renderHostFiles(args.host, {
    runtime: args.runtime ?? definition.runtimeModes[0],
    projectId: args['project-id'],
    licenseKey: args['license-key'],
    toolsets: args.toolsets,
    safeMode: args['safe-mode'],
  });
  const written = await writeRenderedHostFiles(outputDir, rendered, true);

  console.log(`[install] host=${args.host}`);
  console.log(`[install] output_dir=${outputDir}`);
  console.log(`[install] status_target=${definition.statusTarget}`);
  console.log('[install] files=');
  for (const file of written) {
    console.log(`- ${file}`);
  }
  console.log('[install] next_steps=');
  console.log(`- Run: pnpm run selftest -- --host ${args.host}${args['output-dir'] ? ` --output-dir ${outputDir}` : ''}`);
  console.log(`- Capture a real ${definition.label} run in ${path.join(definition.fixtureBaseDir, 'VERIFICATION.md')} before promoting adapter status.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
