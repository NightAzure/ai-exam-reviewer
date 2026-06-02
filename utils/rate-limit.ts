/**
 * Simple in-memory sliding-window rate limiter.
 * Works per-process (single instance). Suitable for low-traffic endpoints.
 * Replace with Upstash Redis rate limiter for multi-instance production deployments.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and record a request for a given key.
 * @param key      Unique identifier (e.g. IP address or user ID)
 * @param limit    Max requests per window
 * @param windowMs Window duration in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  return { allowed: existing.count <= limit, remaining, resetAt: existing.resetAt };
}

// Periodically purge expired entries to prevent memory growth.
// Runs every 5 minutes.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, win] of store.entries()) {
      if (win.resetAt <= now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}
