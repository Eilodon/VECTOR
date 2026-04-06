/**
 * Rate Limiting Module for VECTOR Cloud Worker
 * 
 * Provides per-principal request rate limiting using sliding window algorithm
 * backed by Cloudflare KV store.
 */

import { RemoteAuthEnv, RemoteAuthContext, RemoteAuthError } from "./auth.js";

export interface RateLimitConfig {
  requestsPerMinute: number;
}

type RateLimitBucket = {
  count: number;
  window_start: string;
};

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

/**
 * Enforce rate limit for a principal
 * @throws RemoteAuthError with 429 status if limit exceeded
 */
export async function enforceRateLimit(
  env: RemoteAuthEnv,
  auth: RemoteAuthContext,
  config: RateLimitConfig,
): Promise<void> {
  const principalHash = await hashValue(auth.principal);
  const key = `vector:ratelimit:${principalHash}`;
  const now = Date.now();
  const windowMs = 60_000;

  const bucket = (await readJsonValue<RateLimitBucket>(env.VECTOR_KB_STORE, key)) ?? {
    count: 0,
    window_start: new Date(now).toISOString(),
  };

  const windowStart = Date.parse(bucket.window_start);
  const nextBucket = now - windowStart > windowMs
    ? { count: 1, window_start: new Date(now).toISOString() }
    : { ...bucket, count: bucket.count + 1 };

  await writeJsonValue(env.VECTOR_KB_STORE, key, nextBucket);

  if (nextBucket.count > config.requestsPerMinute) {
    throw new RemoteAuthError(
      429, 
      `Too Many Requests: rate limit (${config.requestsPerMinute}/min) exceeded. `
      + `Try again in ${Math.ceil((windowStart + windowMs - now) / 1000)}s.`
    );
  }
}

/**
 * Get rate limit for tier
 */
export function getTierRateLimit(tier?: string | null): number {
  const limits: Record<string, number> = {
    license: 60,
    basic: 60,
    pro: 120,
    custom: 180,
    enterprise: 300,
  };
  return limits[tier ?? 'license'] ?? 60;
}
