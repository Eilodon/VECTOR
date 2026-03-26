import { createLocalJWKSet, createRemoteJWKSet, errors, jwtVerify, type JWK, type JWTPayload } from "jose";

export interface RemoteAuthEnv {
  LICENSE_STORE: KVNamespace;
  VECTOR_KB_STORE: KVNamespace;
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

export interface RemoteAuthContext {
  scheme: "license" | "oauth_access_token";
  principal: string;
  licenseKey?: string;
  subject?: string;
  scopes: string[];
  tier?: string | null;
  organization?: string | null;
}

export class RemoteAuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "RemoteAuthError";
    this.status = status;
  }
}

export interface SessionOwnershipContext {
  durableObjectName: string;
  projectId: string;
  sessionOwner: string;
}

type SessionRegistry = {
  principal: string;
  scheme: RemoteAuthContext["scheme"];
  tier: string;
  max_sessions: number;
  session_idle_ttl_ms: number;
  updated_at: string;
  sessions: SessionRegistryEntry[];
  anomaly_counts: Record<string, number>;
};

type SessionRegistryEntry = {
  session_key: string;
  project_id: string;
  session_owner: string;
  device_hash: string;
  ip_range: string | null;
  first_seen_at: string;
  last_seen_at: string;
};

type AnomalyEvent = {
  event: string;
  at: string;
  principal: string;
  scheme: RemoteAuthContext["scheme"];
  tier: string;
  project_id: string;
  session_owner: string;
  session_key: string;
  device_hash: string;
  ip_range: string | null;
  detail: string;
};

type AuthConfig = {
  issuer: string | null;
  audience: string | null;
  jwksJson: string | null;
  requiredScopes: string[];
  allowLicenseFallback: boolean;
};

type SessionPolicyConfig = {
  idleTtlMs: number;
  anomalyLogLimit: number;
  maxSessionsDefault: number;
  maxSessionsLicense: number;
  maxSessionsByTier: Record<string, number>;
};

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === "") {
    return defaultValue;
  }
  return !["0", "false", "no", "off"].includes(value.trim().toLowerCase());
}

function normalizeIssuer(issuer: string): string {
  return issuer.endsWith("/") ? issuer : `${issuer}/`;
}

function parseIntegerEnv(value: string | undefined, defaultValue: number): number {
  if (value == null || value.trim() === "") {
    return defaultValue;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function normalizeTier(tier: string | null | undefined): string {
  return (tier ?? "").trim().toLowerCase() || "default";
}

function readAuthConfig(env: RemoteAuthEnv): AuthConfig {
  const issuer = env.VECTOR_AUTH_ISSUER?.trim() ? normalizeIssuer(env.VECTOR_AUTH_ISSUER.trim()) : null;
  const audience = env.VECTOR_AUTH_AUDIENCE?.trim() || null;
  const jwksJson = env.VECTOR_AUTH_JWKS_JSON?.trim() || null;
  const requiredScopes = (env.VECTOR_AUTH_REQUIRED_SCOPE ?? "vector:cloud")
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

  return {
    issuer,
    audience,
    jwksJson,
    requiredScopes,
    allowLicenseFallback: parseBooleanEnv(env.VECTOR_ALLOW_LICENSE_FALLBACK, true),
  };
}

function readSessionPolicyConfig(env: RemoteAuthEnv): SessionPolicyConfig {
  return {
    idleTtlMs: parseIntegerEnv(env.VECTOR_AUTH_SESSION_IDLE_TTL_MS, 4 * 60 * 60 * 1000),
    anomalyLogLimit: parseIntegerEnv(env.VECTOR_AUTH_ANOMALY_LOG_LIMIT, 100),
    maxSessionsDefault: parseIntegerEnv(env.VECTOR_AUTH_MAX_SESSIONS_DEFAULT, 2),
    maxSessionsLicense: parseIntegerEnv(env.VECTOR_AUTH_MAX_SESSIONS_LICENSE, 2),
    maxSessionsByTier: {
      basic: parseIntegerEnv(env.VECTOR_AUTH_MAX_SESSIONS_BASIC, 2),
      pro: parseIntegerEnv(env.VECTOR_AUTH_MAX_SESSIONS_PRO, 5),
      custom: parseIntegerEnv(env.VECTOR_AUTH_MAX_SESSIONS_CUSTOM, 10),
      enterprise: parseIntegerEnv(env.VECTOR_AUTH_MAX_SESSIONS_ENTERPRISE, 20),
    },
  };
}

function hasOAuthConfig(config: AuthConfig): boolean {
  return Boolean(config.issuer && config.audience);
}

function extractBearerToken(request: Request): string {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new RemoteAuthError(401, "Unauthorized: Missing bearer token.");
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw new RemoteAuthError(401, "Unauthorized: Missing bearer token.");
  }
  return token;
}

function scopesFromPayload(payload: JWTPayload): string[] {
  const fromScope = typeof payload.scope === "string"
    ? payload.scope.split(/\s+/).map((item) => item.trim()).filter(Boolean)
    : [];
  const fromPermissions = Array.isArray(payload.permissions)
    ? payload.permissions.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  return Array.from(new Set([...fromScope, ...fromPermissions]));
}

async function validateLicenseToken(token: string, env: RemoteAuthEnv): Promise<RemoteAuthContext> {
  const status = await env.LICENSE_STORE.get(token);
  if (status !== "active") {
    throw new RemoteAuthError(403, "Forbidden: inactive VECTOR license key.");
  }
  return {
    scheme: "license",
    principal: token,
    licenseKey: token,
    scopes: ["vector:license"],
    tier: "license",
  };
}

function buildKeySet(config: AuthConfig) {
  if (!config.issuer) {
    throw new RemoteAuthError(500, "OAuth issuer is not configured.");
  }
  if (config.jwksJson) {
    const jwks = JSON.parse(config.jwksJson) as { keys: JWK[] };
    return createLocalJWKSet(jwks);
  }
  return createRemoteJWKSet(new URL(".well-known/jwks.json", config.issuer));
}

async function validateOAuthAccessToken(token: string, config: AuthConfig): Promise<RemoteAuthContext> {
  if (!config.issuer || !config.audience) {
    throw new RemoteAuthError(401, "Unauthorized: OAuth resource server is not configured.");
  }

  try {
    const { payload } = await jwtVerify(token, buildKeySet(config), {
      issuer: config.issuer,
      audience: config.audience,
    });

    const scopes = scopesFromPayload(payload);
    const missingScope = config.requiredScopes.find((scope) => !scopes.includes(scope));
    if (missingScope) {
      throw new RemoteAuthError(403, `Forbidden: missing required scope '${missingScope}'.`);
    }

    const subject = typeof payload.sub === "string" ? payload.sub : null;
    if (!subject) {
      throw new RemoteAuthError(401, "Unauthorized: OAuth token missing subject.");
    }

    return {
      scheme: "oauth_access_token",
      principal: subject,
      subject,
      scopes,
      tier: typeof payload["https://vector.gt/tier"] === "string" ? payload["https://vector.gt/tier"] : null,
      organization: typeof payload.org_id === "string" ? payload.org_id : null,
    };
  } catch (error) {
    if (error instanceof RemoteAuthError) {
      throw error;
    }
    if (
      error instanceof errors.JOSEError
      || error instanceof TypeError
      || error instanceof SyntaxError
    ) {
      throw new RemoteAuthError(401, `Unauthorized: invalid OAuth access token (${error.message}).`);
    }
    throw error;
  }
}

export async function authorizeRemoteRequest(request: Request, env: RemoteAuthEnv): Promise<RemoteAuthContext> {
  const token = extractBearerToken(request);
  const config = readAuthConfig(env);

  if (token.startsWith("vsk_")) {
    if (!config.allowLicenseFallback && hasOAuthConfig(config)) {
      throw new RemoteAuthError(401, "Unauthorized: VECTOR license bearer disabled for this deployment; use an OAuth access token.");
    }
    return validateLicenseToken(token, env);
  }

  if (!hasOAuthConfig(config)) {
    throw new RemoteAuthError(401, "Unauthorized: OAuth access token provided but OAuth is not configured for this deployment.");
  }

  return validateOAuthAccessToken(token, config);
}

async function hashValue(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, "0")).join("");
}

async function readJsonValue<T>(store: KVNamespace, key: string): Promise<T | null> {
  const raw = await store.get<string>(key);
  if (raw == null) {
    return null;
  }
  return JSON.parse(raw) as T;
}

async function writeJsonValue(store: KVNamespace, key: string, value: unknown): Promise<void> {
  await store.put(key, JSON.stringify(value));
}

function extractClientIp(request: Request): string | null {
  const direct = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? null;
  return direct && direct.length > 0 ? direct : null;
}

function normalizeIpRange(ip: string | null): string | null {
  if (!ip) {
    return null;
  }
  if (ip.includes(".")) {
    const parts = ip.split(".");
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0/24` : ip;
  }
  if (ip.includes(":")) {
    return ip.split(":").slice(0, 4).join(":");
  }
  return ip;
}

async function buildDeviceFingerprint(request: Request): Promise<{ deviceHash: string; ipRange: string | null }> {
  const fingerprintSource = [
    request.headers.get("user-agent") ?? "",
    request.headers.get("sec-ch-ua-platform") ?? "",
    request.headers.get("accept-language") ?? "",
  ].join("|");
  return {
    deviceHash: await hashValue(fingerprintSource || "unknown_device"),
    ipRange: normalizeIpRange(extractClientIp(request)),
  };
}

function resolveMaxSessions(auth: RemoteAuthContext, config: SessionPolicyConfig): number {
  if (auth.scheme === "license") {
    return config.maxSessionsLicense;
  }
  const tier = normalizeTier(auth.tier);
  return config.maxSessionsByTier[tier] ?? config.maxSessionsDefault;
}

function registryKeyForPrincipal(hash: string): string {
  return `vector:auth:registry:${hash}`;
}

function anomalyKeyForPrincipal(hash: string): string {
  return `vector:auth:anomalies:${hash}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function appendAnomalyEvent(
  env: RemoteAuthEnv,
  principalHash: string,
  registry: SessionRegistry,
  event: AnomalyEvent,
  config: SessionPolicyConfig,
): Promise<void> {
  registry.anomaly_counts[event.event] = (registry.anomaly_counts[event.event] ?? 0) + 1;
  const key = anomalyKeyForPrincipal(principalHash);
  const existing = (await readJsonValue<AnomalyEvent[]>(env.VECTOR_KB_STORE, key)) ?? [];
  existing.push(event);
  await writeJsonValue(env.VECTOR_KB_STORE, key, existing.slice(-config.anomalyLogLimit));
}

function buildDefaultRegistry(auth: RemoteAuthContext, maxSessions: number, config: SessionPolicyConfig): SessionRegistry {
  return {
    principal: auth.principal,
    scheme: auth.scheme,
    tier: normalizeTier(auth.tier),
    max_sessions: maxSessions,
    session_idle_ttl_ms: config.idleTtlMs,
    updated_at: nowIso(),
    sessions: [],
    anomaly_counts: {},
  };
}

export async function enforceSessionPolicy(
  request: Request,
  env: RemoteAuthEnv,
  auth: RemoteAuthContext,
  session: SessionOwnershipContext,
): Promise<void> {
  const config = readSessionPolicyConfig(env);
  const principalHash = await hashValue(auth.principal);
  const registryKey = registryKeyForPrincipal(principalHash);
  const maxSessions = resolveMaxSessions(auth, config);
  const fingerprint = await buildDeviceFingerprint(request);
  const registry = (await readJsonValue<SessionRegistry>(env.VECTOR_KB_STORE, registryKey))
    ?? buildDefaultRegistry(auth, maxSessions, config);
  const cutoff = Date.now() - config.idleTtlMs;
  registry.sessions = registry.sessions.filter((entry) => Date.parse(entry.last_seen_at) >= cutoff);
  registry.max_sessions = maxSessions;
  registry.session_idle_ttl_ms = config.idleTtlMs;
  registry.updated_at = nowIso();

  const existing = registry.sessions.find((entry) => entry.session_key === session.durableObjectName);
  if (!existing && registry.sessions.length >= maxSessions) {
    await appendAnomalyEvent(env, principalHash, registry, {
      event: "concurrent_session_cap_exceeded",
      at: nowIso(),
      principal: auth.principal,
      scheme: auth.scheme,
      tier: normalizeTier(auth.tier),
      project_id: session.projectId,
      session_owner: session.sessionOwner,
      session_key: session.durableObjectName,
      device_hash: fingerprint.deviceHash,
      ip_range: fingerprint.ipRange,
      detail: `active_sessions=${registry.sessions.length}; max_sessions=${maxSessions}`,
    }, config);
    await writeJsonValue(env.VECTOR_KB_STORE, registryKey, registry);
    throw new RemoteAuthError(429, `Too Many Requests: concurrent session limit (${maxSessions}) exceeded for tier '${normalizeTier(auth.tier)}'.`);
  }

  if (existing) {
    if (existing.device_hash !== fingerprint.deviceHash) {
      await appendAnomalyEvent(env, principalHash, registry, {
        event: "device_fingerprint_changed",
        at: nowIso(),
        principal: auth.principal,
        scheme: auth.scheme,
        tier: normalizeTier(auth.tier),
        project_id: session.projectId,
        session_owner: session.sessionOwner,
        session_key: session.durableObjectName,
        device_hash: fingerprint.deviceHash,
        ip_range: fingerprint.ipRange,
        detail: `previous_device_hash=${existing.device_hash}`,
      }, config);
    }
    if (existing.ip_range !== fingerprint.ipRange) {
      await appendAnomalyEvent(env, principalHash, registry, {
        event: "ip_range_changed",
        at: nowIso(),
        principal: auth.principal,
        scheme: auth.scheme,
        tier: normalizeTier(auth.tier),
        project_id: session.projectId,
        session_owner: session.sessionOwner,
        session_key: session.durableObjectName,
        device_hash: fingerprint.deviceHash,
        ip_range: fingerprint.ipRange,
        detail: `previous_ip_range=${existing.ip_range ?? "none"}`,
      }, config);
    }
    existing.device_hash = fingerprint.deviceHash;
    existing.ip_range = fingerprint.ipRange;
    existing.last_seen_at = nowIso();
  } else {
    if (registry.sessions.some((entry) => entry.device_hash !== fingerprint.deviceHash)) {
      await appendAnomalyEvent(env, principalHash, registry, {
        event: "new_device_fingerprint",
        at: nowIso(),
        principal: auth.principal,
        scheme: auth.scheme,
        tier: normalizeTier(auth.tier),
        project_id: session.projectId,
        session_owner: session.sessionOwner,
        session_key: session.durableObjectName,
        device_hash: fingerprint.deviceHash,
        ip_range: fingerprint.ipRange,
        detail: "new session arrived from a different device fingerprint",
      }, config);
    }
    registry.sessions.push({
      session_key: session.durableObjectName,
      project_id: session.projectId,
      session_owner: session.sessionOwner,
      device_hash: fingerprint.deviceHash,
      ip_range: fingerprint.ipRange,
      first_seen_at: nowIso(),
      last_seen_at: nowIso(),
    });
  }

  await writeJsonValue(env.VECTOR_KB_STORE, registryKey, registry);
}
