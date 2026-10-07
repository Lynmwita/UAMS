/**
 * Lightweight In-Memory Sliding Window Rate Limiter
 * Protects authentication endpoints from brute-force password guessing and credential stuffing.
 */

interface RateLimitRecord {
  timestamps: number[];
}

// Global registry preserved across development hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __uams_rate_limit_registry: Map<string, RateLimitRecord> | undefined;
}

const rateLimitRegistry: Map<string, RateLimitRecord> =
  global.__uams_rate_limit_registry || (global.__uams_rate_limit_registry = new Map());

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export function checkRateLimit(
  key: string,
  maxRequests = 5,
  windowSeconds = 60
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const cutoff = now - windowMs;

  let record = rateLimitRegistry.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitRegistry.set(key, record);
  }

  // Filter out timestamps outside the active sliding window
  record.timestamps = record.timestamps.filter((ts) => ts > cutoff);

  if (record.timestamps.length >= maxRequests) {
    const oldestTimestamp = record.timestamps[0];
    const resetSeconds = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetSeconds,
    };
  }

  // Record this attempt
  record.timestamps.push(now);
  const remaining = Math.max(0, maxRequests - record.timestamps.length);

  return {
    allowed: true,
    limit: maxRequests,
    remaining,
    resetSeconds: windowSeconds,
  };
}

export function resetRateLimit(key: string): void {
  rateLimitRegistry.delete(key);
}
