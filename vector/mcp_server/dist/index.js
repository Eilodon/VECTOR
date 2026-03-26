import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { access, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { join } from "node:path";
import * as os from "node:os";
import { createVectorRuntime } from "./core.js";
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
function parseCapabilityToolsets(raw) {
    if (!raw?.trim()) {
        return undefined;
    }
    return raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}
function parseSafeMode(raw) {
    return /^(1|true|yes|on)$/i.test(raw ?? "");
}
async function ensureDir(path) {
    await mkdir(path, { recursive: true });
}
async function pathExists(path) {
    try {
        await access(path, fsConstants.F_OK);
        return true;
    }
    catch {
        return false;
    }
}
const localStateStore = {
    async load() {
        await ensureDir(RUNTIME_DIR);
        if (!(await pathExists(STATE_FILE))) {
            return null;
        }
        const raw = await readFile(STATE_FILE, "utf-8");
        return JSON.parse(raw);
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
        return {
            label: latest,
            state: JSON.parse(raw),
        };
    },
};
const localGraphStore = {
    async load() {
        await ensureDir(RUNTIME_DIR);
        if (!(await pathExists(GRAPH_FILE))) {
            return null;
        }
        const raw = await readFile(GRAPH_FILE, "utf-8");
        return JSON.parse(raw);
    },
    async save(graph) {
        await ensureDir(RUNTIME_DIR);
        const tmp = `${GRAPH_FILE}.tmp`;
        await writeFile(tmp, `${JSON.stringify(graph, null, 2)}\n`, "utf-8");
        await rename(tmp, GRAPH_FILE);
    },
};
async function logTelemetry(event, meta) {
    try {
        await ensureDir(LOG_DIR);
        await writeFile(join(LOG_DIR, "telemetry.jsonl"), JSON.stringify({ timestamp: new Date().toISOString(), event, project_id: PROJECT_ID, ...meta }) + "\n", { flag: "a" });
    }
    catch { }
}
async function main() {
    const requestedToolsets = parseCapabilityToolsets(process.env.VECTOR_TOOLSETS);
    const runtime = createVectorRuntime({
        version: VECTOR_VERSION,
        runtimeLabel: RUNTIME_DIR,
        stateStore: localStateStore,
        graphStore: localGraphStore,
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
main().catch((error) => {
    console.error("[VECTOR] Fatal server error:", error);
    process.exit(1);
});
