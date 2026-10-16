// In-memory fixed-window rate limiter guarding the BFF's /login and /refresh
// endpoints against brute force. Single-instance by design, consistent with the
// in-memory refresh store; a server restart clears all counters. Keyed by
// client IP (or any caller-provided key).

interface Window {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

const windows = new Map<string, Window>();

export function checkRateLimit(
  key: string,
  options: RateLimitOptions,
  now: number = Date.now(),
): RateLimitResult {
  const existing = windows.get(key);

  if (!existing || now >= existing.resetAt) {
    windows.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= options.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

// Test-only hook to reset state between runs.
export function clearRateLimits(): void {
  windows.clear();
}
