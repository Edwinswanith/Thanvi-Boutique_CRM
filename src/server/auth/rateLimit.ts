/**
 * Simple fixed-window limiter for login attempts. In-memory, so it is per
 * server instance — swap for Redis/Upstash when running more than one instance.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, now = Date.now()): { allowed: boolean; retryAfterSec: number } {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (bucket.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  buckets.set(key, { ...bucket, count: bucket.count + 1 });
  return { allowed: true, retryAfterSec: 0 };
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
