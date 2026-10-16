import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, clearRateLimits } from "./rateLimit";

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
