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

// Evaluates a per-key limit and a shared global limit together. Returns blocked
// if EITHER is exceeded, with the larger Retry-After. The global cap bounds the
// total request rate so forging a fresh X-Forwarded-For per request (which
// would otherwise open a new per-key bucket each time) cannot bypass the
// brute-force defense.
export function checkRateLimitWithGlobal(
  key: string,
  perKey: RateLimitOptions,
  globalKey: string,
  global: RateLimitOptions,
  now: number = Date.now(),
): RateLimitResult {
  const perKeyResult = checkRateLimit(key, perKey, now);
  const globalResult = checkRateLimit(globalKey, global, now);

  if (perKeyResult.allowed && globalResult.allowed) {
    return { allowed: true, retryAfterSeconds: 0 };
  }
  return {
    allowed: false,
    retryAfterSeconds: Math.max(
      perKeyResult.retryAfterSeconds,
      globalResult.retryAfterSeconds,
    ),
  };
}

// Test-only hook to reset state between runs.
export function clearRateLimits(): void {
  windows.clear();
}
