import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createVectorRuntime, type VectorGraphStore, type VectorRuntimeInstance, type VectorStateStore, type VectorRuntimeOptions } from "../../mcp_server/core.js";
import { authorizeRemoteRequest, enforceSessionPolicy, RemoteAuthError, type RemoteAuthContext } from "./auth.js";
import { enforceRateLimit, getTierRateLimit } from "./ratelimit.js";

const VECTOR_VERSION = "2.0.0";
const STATE_KEY = "vector_state";
const GRAPH_KEY = "vector_graph_memory";
const BACKUP_INDEX_KEY = "vector_backups";
const SESSION_METADATA_KEY = "session_metadata";
export const VECTOR_PROJECT_HEADER = "x-vector-project-id";
export const VECTOR_SESSION_OWNER_HEADER = "x-vector-session-owner";
const VECTOR_AUTH_SCHEME_HEADER = "x-vector-auth-scheme";
const VECTOR_AUTH_PRINCIPAL_HEADER = "x-vector-auth-principal";
const VECTOR_AUTH_SUBJECT_HEADER = "x-vector-auth-subject";
const VECTOR_AUTH_SCOPES_HEADER = "x-vector-auth-scopes";

export interface Env {
  VECTOR_KB_STORE: KVNamespace;
  LICENSE_STORE: KVNamespace;
  MCP_DO: DurableObjectNamespace;
  VECTOR_AUTH_ISSUER?: string;
  VECTOR_AUTH_AUDIENCE?: string;
  VECTOR_AUTH_JWKS_JSON?: string;
  VECTOR_AUTH_REQUIRED_SCOPE?: string;
  VECTOR_ALLOW_LICENSE_FALLBACK?: string;
  VECTOR_AUTH_SESSION_IDLE_TTL_MS?: string;
  VECTOR_AUTH_MAX_SESSIONS_DEFAULT?: string;
  VECTOR_AUTH_MAX_SESSIONS_LICENSE?: string;
  VECTOR_AUTH_MAX_SESSIONS_BASIC?: string;
  VECTOR_AUTH_MAX_SESSIONS_PRO?: string;
  VECTOR_AUTH_MAX_SESSIONS_CUSTOM?: string;
  VECTOR_AUTH_MAX_SESSIONS_ENTERPRISE?: string;
  VECTOR_AUTH_ANOMALY_LOG_LIMIT?: string;
}

type BackupIndex = Array<{ key: string; label: string; created_at: string }>;
type SessionMetadata = {
  auth_scheme: "license" | "oauth_access_token";
  auth_principal: string;
  auth_subject: string | null;
  auth_scopes: string[];
  license_key: string | null;
  project_id: string;
  session_owner: string;
  created_at: string;
  last_seen_at: string;
};

export function sanitizeOwnershipValue(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  if (!/^[a-zA-Z0-9:_-]{3,128}$/.test(trimmed)) {
    throw new Error(`${label} must use only letters, numbers, colon, underscore, or hyphen.`);
  }
  return trimmed;
}

async function hashSegment(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, "0")).join("");
}

async function buildPrincipalNamespace(auth: RemoteAuthContext): Promise<string> {
  if (auth.scheme === "license" && auth.licenseKey) {
    return `license:${auth.licenseKey}`;
  }
  return `oauth:${(await hashSegment(auth.principal)).slice(0, 24)}`;
}

export async function resolveSessionOwnership(request: Request, auth: RemoteAuthContext): Promise<{ durableObjectName: string; metadata: SessionMetadata }> {
  const projectId = sanitizeOwnershipValue(request.headers.get(VECTOR_PROJECT_HEADER) ?? "", VECTOR_PROJECT_HEADER);
  const sessionOwner = sanitizeOwnershipValue(request.headers.get(VECTOR_SESSION_OWNER_HEADER) ?? "", VECTOR_SESSION_OWNER_HEADER);
  const principalNamespace = await buildPrincipalNamespace(auth);
  return {
    durableObjectName: `${principalNamespace}:${projectId}:${sessionOwner}`,
    metadata: {
      auth_scheme: auth.scheme,
      auth_principal: auth.principal,
      auth_subject: auth.subject ?? null,
      auth_scopes: auth.scopes,
      license_key: auth.licenseKey ?? null,
      project_id: projectId,
      session_owner: sessionOwner,
      created_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    },
  };
}

async function readBackupIndex(storage: DurableObjectStorage): Promise<BackupIndex> {
  return (await storage.get<BackupIndex>(BACKUP_INDEX_KEY)) ?? [];
}

export class McpDurableObject {
  private transport: WebStandardStreamableHTTPServerTransport;
  private boot: Promise<void>;
  private runtimeOptions: VectorRuntimeOptions;
  private runtime: VectorRuntimeInstance;

  constructor(private state: DurableObjectState, private env: Env) {
    const stateStore: VectorStateStore = {
      load: async () => (await this.state.storage.get<Record<string, unknown>>(STATE_KEY)) ?? null,
      save: async (runtimeState) => {
        await this.state.storage.put(STATE_KEY, runtimeState);
      },
      saveBackup: async (runtimeState, previousPhase, nextPhase) => {
        const createdAt = new Date().toISOString();
        const label = `do_${previousPhase}_to_${nextPhase}_${Date.now()}`;
        const key = `backup:${label}`;
        const backups = await readBackupIndex(this.state.storage);
        backups.push({ key, label, created_at: createdAt });
        await this.state.storage.put(key, runtimeState);
        await this.state.storage.put(BACKUP_INDEX_KEY, backups.slice(-25));
      },
      restoreLatestBackup: async () => {
        const backups = await readBackupIndex(this.state.storage);
        const latest = backups[backups.length - 1];
        if (!latest) {
          return null;
        }
        const runtimeState = await this.state.storage.get<Record<string, unknown>>(latest.key);
        if (!runtimeState) {
          return null;
        }
        return { label: latest.label, state: runtimeState as any };
      },
    };
    const graphStore: VectorGraphStore = {
      load: async () => (await this.state.storage.get<Record<string, unknown>>(GRAPH_KEY)) ?? null,
      save: async (graph) => {
        await this.state.storage.put(GRAPH_KEY, graph);
      },
    };

    this.transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    this.runtimeOptions = {
      version: VECTOR_VERSION,
      runtimeLabel: "cloudflare-durable-object",
      stateStore,
      graphStore,
      telemetry: async (event, meta) => {
        console.log(JSON.stringify({ event, ...meta }));
      },
      logger: console,
    };
    this.runtime = createVectorRuntime(this.runtimeOptions);

    this.boot = this.state.blockConcurrencyWhile(async () => {
      await this.runtime.initialize();
      await this.runtime.connect(this.transport);
    });
  }

  async fetch(request: Request): Promise<Response> {
    await this.boot;
    const url = new URL(request.url);
    if (url.pathname !== "/mcp") {
      return new Response("Not Found", { status: 404 });
    }
    const projectId = request.headers.get(VECTOR_PROJECT_HEADER);
    const sessionOwner = request.headers.get(VECTOR_SESSION_OWNER_HEADER);
    const authScheme = request.headers.get(VECTOR_AUTH_SCHEME_HEADER);
    const authPrincipal = request.headers.get(VECTOR_AUTH_PRINCIPAL_HEADER);
    const authSubject = request.headers.get(VECTOR_AUTH_SUBJECT_HEADER);
    const authScopes = request.headers.get(VECTOR_AUTH_SCOPES_HEADER);
    if (projectId && sessionOwner && authScheme && authPrincipal) {
      await this.state.storage.put(SESSION_METADATA_KEY, {
        auth_scheme: authScheme,
        auth_principal: authPrincipal,
        auth_subject: authSubject,
        auth_scopes: authScopes ? authScopes.split(" ").filter(Boolean) : [],
        license_key: authScheme === "license" ? authPrincipal : null,
        project_id: projectId,
        session_owner: sessionOwner,
        created_at: (await this.state.storage.get<SessionMetadata>(SESSION_METADATA_KEY))?.created_at ?? new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      });
    }
    return this.transport.handleRequest(request);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/healthz") {
      const oauthConfigured = Boolean(env.VECTOR_AUTH_ISSUER && env.VECTOR_AUTH_AUDIENCE);
      const licenseFallback = env.VECTOR_ALLOW_LICENSE_FALLBACK !== "false";
      return new Response(JSON.stringify({
        status: "ok",
        version: VECTOR_VERSION,
        transport: "streamable-http",
        auth: {
          oauth_configured: oauthConfigured,
          license_fallback: licenseFallback,
        },
        ts: new Date().toISOString(),
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.pathname === "/metrics") {
      const metrics = [
        `# HELP vector_info VECTOR server info`,
        `# TYPE vector_info gauge`,
        `vector_info{version="${VECTOR_VERSION}",transport="streamable-http"} 1`,
        ``,
        `# HELP vector_requests_total Total MCP requests`,
        `# TYPE vector_requests_total counter`,
        `vector_requests_total{transport="streamable-http"} 0`,
        ``,
        `# HELP vector_auth_configured Whether OAuth is configured`,
        `# TYPE vector_auth_configured gauge`,
        `vector_auth_configured{issuer="${env.VECTOR_AUTH_ISSUER ? 'configured' : 'none'}"} ${env.VECTOR_AUTH_ISSUER ? 1 : 0}`,
      ].join("\n");
      
      return new Response(metrics + "\n", {
        status: 200,
        headers: { "content-type": "text/plain; version=0.0.4" },
      });
    }
    if (url.pathname !== "/mcp") {
      return new Response("Not Found", { status: 404 });
    }

    let authContext: RemoteAuthContext;
    try {
      authContext = await authorizeRemoteRequest(request, env);
    } catch (error) {
      if (error instanceof RemoteAuthError) {
        return new Response(error.message, { status: error.status });
      }
      throw error;
    }

    let ownership;
    try {
      ownership = await resolveSessionOwnership(request, authContext);
    } catch (error) {
      return new Response(`Bad Request: ${error instanceof Error ? error.message : "invalid session ownership"}`, { status: 400 });
    }

    try {
      await enforceSessionPolicy(request, env, authContext, {
        durableObjectName: ownership.durableObjectName,
        projectId: ownership.metadata.project_id,
        sessionOwner: ownership.metadata.session_owner,
      });
    } catch (error) {
      if (error instanceof RemoteAuthError) {
        return new Response(error.message, { status: error.status });
      }
      throw error;
    }

    // Enforce per-request rate limiting
    try {
      await enforceRateLimit(env, authContext, {
        requestsPerMinute: getTierRateLimit(authContext.tier),
      });
    } catch (error) {
      if (error instanceof RemoteAuthError) {
        return new Response(error.message, { status: error.status });
      }
      throw error;
    }

    const id = env.MCP_DO.idFromName(ownership.durableObjectName);
    const stub = env.MCP_DO.get(id);
    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.set(VECTOR_AUTH_SCHEME_HEADER, authContext.scheme);
    forwardedHeaders.set(VECTOR_AUTH_PRINCIPAL_HEADER, authContext.licenseKey ?? authContext.principal);
    if (authContext.subject) {
      forwardedHeaders.set(VECTOR_AUTH_SUBJECT_HEADER, authContext.subject);
    }
    if (authContext.scopes.length > 0) {
      forwardedHeaders.set(VECTOR_AUTH_SCOPES_HEADER, authContext.scopes.join(" "));
    }

    const response = await stub.fetch(new Request(request, { headers: forwardedHeaders }));

    const nextHeaders = new Headers(response.headers);
    nextHeaders.set(VECTOR_PROJECT_HEADER, ownership.metadata.project_id);
    nextHeaders.set(VECTOR_SESSION_OWNER_HEADER, ownership.metadata.session_owner);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: nextHeaders,
    });
  },
};
