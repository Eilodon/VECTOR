import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(__dirname, '../..');

export const DEFAULT_LICENSE_KEY = 'vsk_replace_me';
export const LOCAL_SERVER_COMMAND = 'node';
export const LOCAL_SERVER_ARGS = ['vector/mcp_server/dist/index.js'];

export const HOST_DEFINITIONS = {
  cursor: {
    label: 'Cursor',
    statusTarget: 'verified-local',
    runtimeModes: ['local'],
    defaultProjectId: 'cursor_local',
    defaultToolsets: ['core', 'research', 'strategy', 'copy'],
    defaultSafeMode: true,
    fixtureBaseDir: 'vector/integrations/cursor',
    installSurface: 'local MCP / stdio or local subprocess',
    primaryConfigRelPath: '.cursor/mcp.json',
    templateFiles: [
      {
        templatePath: 'vector/integrations/templates/cursor.mcp.json.template',
        outputPath: '.cursor/mcp.json',
      },
    ],
  },
  cline: {
    label: 'Cline',
    statusTarget: 'verified-local',
    runtimeModes: ['local'],
    defaultProjectId: 'cline_local',
    defaultToolsets: ['core', 'research', 'strategy', 'copy'],
    defaultSafeMode: true,
    fixtureBaseDir: 'vector/integrations/cline',
    installSurface: 'local MCP server',
    primaryConfigRelPath: 'cline_mcp_settings.json',
    templateFiles: [
      {
        templatePath: 'vector/integrations/templates/cline_mcp_settings.json.template',
        outputPath: 'cline_mcp_settings.json',
      },
    ],
  },
  windsurf: {
    label: 'Windsurf',
    statusTarget: 'verified-local',
    runtimeModes: ['local'],
    defaultProjectId: 'windsurf_local',
    defaultToolsets: ['core', 'research', 'strategy', 'copy'],
    defaultSafeMode: true,
    fixtureBaseDir: 'vector/integrations/windsurf',
    installSurface: 'local MCP server',
    primaryConfigRelPath: 'mcp_config.json',
    templateFiles: [
      {
        templatePath: 'vector/integrations/templates/windsurf_mcp_config.json.template',
        outputPath: 'mcp_config.json',
      },
    ],
  },
  github_copilot: {
    label: 'GitHub Copilot',
    statusTarget: 'verified-local',
    runtimeModes: ['local'],
    defaultProjectId: 'copilot_local',
    defaultToolsets: ['core', 'research', 'strategy', 'copy'],
    defaultSafeMode: true,
    fixtureBaseDir: 'vector/integrations/github_copilot',
    installSurface: 'repo-local MCP tool provider',
    primaryConfigRelPath: '.copilot/mcp-config.json',
    templateFiles: [
      {
        templatePath: 'vector/integrations/templates/github_copilot.mcp-config.json.template',
        outputPath: '.copilot/mcp-config.json',
      },
      {
        templatePath: 'vector/integrations/templates/github_copilot.vector_gtm.agent.md.template',
        outputPath: '.github/agents/vector_gtm.agent.md',
      },
    ],
  },
};

export const LOCAL_INSTALL_HOSTS = Object.keys(HOST_DEFINITIONS);

function normalizeToolsets(toolsets, fallback) {
  const source = Array.isArray(toolsets)
    ? toolsets
    : typeof toolsets === 'string'
      ? toolsets.split(',')
      : fallback;
  return [...new Set(source.map((item) => item.trim()).filter(Boolean))];
}

function normalizeBoolean(value, fallback) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    if (/^(1|true|yes|on)$/i.test(value)) return true;
    if (/^(0|false|no|off)$/i.test(value)) return false;
  }
  return fallback;
}

export function resolveHostDefinition(host) {
  const normalized = host?.trim();
  const definition = normalized ? HOST_DEFINITIONS[normalized] : null;
  if (!definition) {
    throw new Error(`Unknown host '${host}'. Supported hosts: ${LOCAL_INSTALL_HOSTS.join(', ')}.`);
  }
  return { host: normalized, ...definition };
}

export function buildHostTemplateContext(host, options = {}) {
  const definition = resolveHostDefinition(host);
  const toolsets = normalizeToolsets(options.toolsets, definition.defaultToolsets);
  const safeMode = normalizeBoolean(options.safeMode, definition.defaultSafeMode);
  return {
    host,
    hostLabel: definition.label,
    runtimeMode: options.runtime ?? definition.runtimeModes[0],
    licenseKey: options.licenseKey ?? DEFAULT_LICENSE_KEY,
    projectId: options.projectId ?? definition.defaultProjectId,
    toolsets,
    safeMode: safeMode ? 'true' : 'false',
    safeModeBoolean: Boolean(safeMode),
    toolsetsCsv: toolsets.join(','),
    serverCommand: options.serverCommand ?? LOCAL_SERVER_COMMAND,
    serverArgsJson: JSON.stringify(options.serverArgs ?? LOCAL_SERVER_ARGS),
  };
}

function renderTemplate(template, context) {
  return template
    .replaceAll('__VECTOR_LICENSE_KEY__', context.licenseKey)
    .replaceAll('__VECTOR_PROJECT_ID__', context.projectId)
    .replaceAll('__VECTOR_TOOLSETS__', context.toolsetsCsv)
    .replaceAll('__VECTOR_SAFE_MODE__', context.safeMode)
    .replaceAll('__VECTOR_SERVER_COMMAND__', context.serverCommand)
    .replaceAll('__VECTOR_SERVER_ARGS_JSON__', context.serverArgsJson)
    .replaceAll('__VECTOR_HOST_LABEL__', context.hostLabel);
}

export async function renderHostFiles(host, options = {}) {
  const definition = resolveHostDefinition(host);
  const context = buildHostTemplateContext(host, options);
  return Promise.all(
    definition.templateFiles.map(async (file) => {
      const templatePath = path.join(repoRoot, file.templatePath);
      const template = await readFile(templatePath, 'utf8');
      return {
        outputPath: file.outputPath,
        contents: renderTemplate(template, context),
      };
    }),
  );
}

export async function writeRenderedHostFiles(baseDir, renderedFiles, overwrite = true) {
  const written = [];
  for (const file of renderedFiles) {
    const targetPath = path.join(baseDir, file.outputPath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    if (!overwrite) {
      try {
        await readFile(targetPath, 'utf8');
        throw new Error(`Refusing to overwrite existing file: ${targetPath}`);
      } catch (error) {
        if (error?.code !== 'ENOENT') {
          throw error;
        }
      }
    }
    await writeFile(targetPath, file.contents, 'utf8');
    written.push(targetPath);
  }
  return written;
}

export function fixtureBaseDirForHost(host) {
  return path.join(repoRoot, resolveHostDefinition(host).fixtureBaseDir);
}
