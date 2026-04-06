import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { access, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { join } from "node:path";
import * as os from "node:os";
import { createVectorRuntime, type VectorGraphStore, type VectorStateStore } from "./core.js";

const licenseKey = process.env.VECTOR_LICENSE_KEY;
if (!licenseKey || !licenseKey.startsWith("vsk_")) {
  console.error("FATAL: Invalid or missing VECTOR_LICENSE_KEY. Setup Guide requires a key starting with 'vsk_'.");
  process.exit(1);
}

const rawProjectId = process.env.VECTOR_PROJECT_ID || "default_project";
const PROJECT_ID = rawProjectId.replace(/[^a-zA-Z0-9_\-]/g, "");
if (!PROJECT_ID) {
  console.error("FATAL: VECTOR_PROJECT_ID must contain valid alphanumeric characters.");
  process.exit(1);
}

const VECTOR_VERSION = "2.0.0";
const DEFAULT_KB_DIR = join(os.homedir(), ".vector", "kb");
const RUNTIME_DIR = process.env.VECTOR_KB_PATH ? join(process.env.VECTOR_KB_PATH, PROJECT_ID) : join(DEFAULT_KB_DIR, PROJECT_ID);
const STATE_FILE = join(RUNTIME_DIR, "vector_state.json");
const GRAPH_FILE = join(RUNTIME_DIR, "vector_graph_memory.json");
const LOG_DIR = join(os.homedir(), ".vector", "logs");
const TELEMETRY_LOG_FILE = join(LOG_DIR, "telemetry.jsonl");
const TELEMETRY_ROTATED_FILE = join(LOG_DIR, "telemetry.jsonl.1");
const TELEMETRY_ARCHIVED_FILE = join(LOG_DIR, "telemetry.jsonl.2");
const MAX_TELEMETRY_LOG_BYTES = 1_000_000;

function parseCapabilityToolsets(raw: string | undefined): string[] | undefined {
  if (!raw?.trim()) {
    return undefined;
  }
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSafeMode(raw: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test(raw ?? "");
}

async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const MAX_LOCAL_BACKUP_FILES = 25;

async function pruneBackups(): Promise<void> {
  const files = await readdir(RUNTIME_DIR);
  const backups = files
    .filter((f) => f.startsWith("vector_state.json.bkp_"))
    .sort();
  const toDelete = backups.slice(0, Math.max(0, backups.length - MAX_LOCAL_BACKUP_FILES));
  for (const old of toDelete) {
    await rm(join(RUNTIME_DIR, old), { force: true });
  }
}

const localStateStore: VectorStateStore = {
  async load() {
    await ensureDir(RUNTIME_DIR);
    if (!(await pathExists(STATE_FILE))) {
      return null;
    }
    const raw = await readFile(STATE_FILE, "utf-8");
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        const corruptPath = `${STATE_FILE}.corrupt_${Date.now()}`;
        await rename(STATE_FILE, corruptPath).catch(() => {});
        throw new Error(
          `[VECTOR] State file is corrupt and cannot be parsed. ` +
          `Moved to ${corruptPath} for inspection. ` +
          `Restore from a .bkp_* file or start fresh.`
        );
      }
      throw parseError;
    }
  },
  async save(state) {
    await ensureDir(RUNTIME_DIR);
    const tmp = `${STATE_FILE}.tmp`;
    await writeFile(tmp, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
    await rename(tmp, STATE_FILE);
  },
  async saveBackup(state, previousPhase, nextPhase) {
    await ensureDir(RUNTIME_DIR);
    const backupPath = `${STATE_FILE}.bkp_${previousPhase}_to_${nextPhase}_${Date.now()}`;
    await writeFile(backupPath, JSON.stringify(state, null, 2), "utf-8");
    await pruneBackups();
  },
  async restoreLatestBackup() {
    await ensureDir(RUNTIME_DIR);
    const files = await readdir(RUNTIME_DIR);
    const backups = files.filter((file) => file.startsWith("vector_state.json.bkp_")).sort();
    const latest = backups[backups.length - 1];
    if (!latest) {
      return null;
    }
    const raw = await readFile(join(RUNTIME_DIR, latest), "utf-8");
    try {
      return {
        label: latest,
        state: JSON.parse(raw) as Parameters<VectorStateStore["save"]>[0],
      };
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        const corruptPath = `${join(RUNTIME_DIR, latest)}.corrupt_${Date.now()}`;
        await rename(join(RUNTIME_DIR, latest), corruptPath).catch(() => {});
        throw new Error(
          `[VECTOR] Backup file ${latest} is corrupt and cannot be restored. ` +
          `Moved to ${corruptPath} for inspection. ` +
          `Try another backup file.`
        );
      }
      throw parseError;
    }
  },
};
const localGraphStore: VectorGraphStore = {
  async load() {
    await ensureDir(RUNTIME_DIR);
    if (!(await pathExists(GRAPH_FILE))) {
      return null;
    }
    const raw = await readFile(GRAPH_FILE, "utf-8");
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        const corruptPath = `${GRAPH_FILE}.corrupt_${Date.now()}`;
        await rename(GRAPH_FILE, corruptPath).catch(() => {});
        throw new Error(
          `[VECTOR] Graph memory file is corrupt and cannot be parsed. ` +
          `Moved to ${corruptPath} for inspection. ` +
          `Restore from backup or start fresh.`
        );
      }
      throw parseError;
    }
  },
  async save(graph) {
    await ensureDir(RUNTIME_DIR);
    const tmp = `${GRAPH_FILE}.tmp`;
    await writeFile(tmp, `${JSON.stringify(graph, null, 2)}\n`, "utf-8");
    await rename(tmp, GRAPH_FILE);
  },
};

async function logTelemetry(event: string, meta: Record<string, unknown>) {
  try {
    await ensureDir(LOG_DIR);
    try {
      const current = await stat(TELEMETRY_LOG_FILE);
      if (current.size >= MAX_TELEMETRY_LOG_BYTES) {
        if (await pathExists(TELEMETRY_ROTATED_FILE)) {
          await rm(TELEMETRY_ARCHIVED_FILE, { force: true });
          await rename(TELEMETRY_ROTATED_FILE, TELEMETRY_ARCHIVED_FILE);
        }
        await rename(TELEMETRY_LOG_FILE, TELEMETRY_ROTATED_FILE);
      }
    } catch {}
    await writeFile(
      TELEMETRY_LOG_FILE,
      JSON.stringify({ timestamp: new Date().toISOString(), event, project_id: PROJECT_ID, ...meta }) + "\n",
      { flag: "a" },
    );
  } catch {}
}

async function main() {
  const requestedToolsets = parseCapabilityToolsets(process.env.VECTOR_TOOLSETS);
  const runtime = createVectorRuntime({
    version: VECTOR_VERSION,
    runtimeLabel: RUNTIME_DIR,
    stateStore: localStateStore,
    graphStore: localGraphStore,
    readKbContent: async () => {
      try {
        return await readFile(join(RUNTIME_DIR, "KNOWLEDGE_BASE.md"), "utf-8");
      } catch {
        return null;
      }
    },
    capabilityMode: {
      ...(requestedToolsets ? { toolsets: requestedToolsets } : {}),
      safeMode: parseSafeMode(process.env.VECTOR_SAFE_MODE),
    },
    telemetry: logTelemetry,
    logger: console,
  });
  await runtime.initialize();
  const state = runtime.getState();
  const capability = runtime.getCapabilityMode();
  console.error(`[VECTOR] MCP Server starting on stdio | version=${VECTOR_VERSION}`);
  console.error(`[VECTOR] Runtime dir: ${RUNTIME_DIR}`);
  console.error(`[VECTOR] Loaded state phase=${state.phase} milestone=${state.milestone}`);
  console.error(`[VECTOR] Capability mode toolsets=${capability.toolsets.join(",")} safe_mode=${capability.safeMode}`);
  console.error(`[VECTOR] Operational notes:\n${runtime.roleHints()}`);
  await runtime.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  console.error("[VECTOR] Fatal server error:", error);
  process.exit(1);
});
