import { beforeEach, describe, expect, it } from "vitest";
import {
  checkRateLimit,
  checkRateLimitWithGlobal,
  clearRateLimits,
} from "./rateLimit";

const options = { limit: 3, windowMs: 1_000 };

beforeEach(() => {
  clearRateLimits();
});

describe("checkRateLimit", () => {
  it("allows requests up to the limit then blocks", () => {
    const now = 0;
    expect(checkRateLimit("ip", options, now).allowed).toBe(true);
    expect(checkRateLimit("ip", options, now).allowed).toBe(true);
    expect(checkRateLimit("ip", options, now).allowed).toBe(true);

    const blocked = checkRateLimit("ip", options, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
  });

  it("resets after the window elapses", () => {
    checkRateLimit("ip", options, 0);
    checkRateLimit("ip", options, 0);
    checkRateLimit("ip", options, 0);
    expect(checkRateLimit("ip", options, 0).allowed).toBe(false);

    expect(checkRateLimit("ip", options, 1_001).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    checkRateLimit("a", options, 0);
    checkRateLimit("a", options, 0);
    checkRateLimit("a", options, 0);
    expect(checkRateLimit("a", options, 0).allowed).toBe(false);
    expect(checkRateLimit("b", options, 0).allowed).toBe(true);
  });
});

describe("checkRateLimitWithGlobal", () => {
  const perKey = { limit: 2, windowMs: 1_000 };
  const global = { limit: 5, windowMs: 1_000 };

  it("blocks a single key once its per-key limit is hit, even under the global cap", () => {
    expect(checkRateLimitWithGlobal("ip1", perKey, "g", global, 0).allowed).toBe(true);
    expect(checkRateLimitWithGlobal("ip1", perKey, "g", global, 0).allowed).toBe(true);
    expect(checkRateLimitWithGlobal("ip1", perKey, "g", global, 0).allowed).toBe(false);
  });

  it("blocks once the global cap is exceeded even if every key is new (forged IPs)", () => {
    // Each request uses a brand-new per-key bucket, so per-key never trips; only
    // the global cap stops the flood.
    let blocked = false;
    for (let i = 0; i < 6; i += 1) {
      const result = checkRateLimitWithGlobal(`ip-${i}`, perKey, "g", global, 0);
      if (!result.allowed) {
        blocked = true;
        expect(result.retryAfterSeconds).toBe(1);
      }
    }
    expect(blocked).toBe(true);
  });

  it("allows when both per-key and global are under their limits", () => {
    expect(checkRateLimitWithGlobal("ip", perKey, "g", global, 0).allowed).toBe(true);
  });
});
