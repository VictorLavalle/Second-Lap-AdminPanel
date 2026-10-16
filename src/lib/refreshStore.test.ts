import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearRefreshStore,
  issueRefreshChain,
  revokeRefreshChain,
  rotateRefreshChain,
} from "./refreshStore";

const TTL = 60_000;

beforeEach(() => {
  clearRefreshStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("refresh store rotation", () => {
  it("rotates when the presented rid is current and invalidates the old one", () => {
    const { sessionId, rid } = issueRefreshChain(TTL);

    const nextRid = rotateRefreshChain(sessionId, rid, TTL);
    expect(nextRid).not.toBeNull();
    expect(nextRid).not.toBe(rid);

    // Reusing the original rid now fails (it was invalidated by rotation).
    expect(rotateRefreshChain(sessionId, rid, TTL)).toBeNull();
  });

  it("rejects an unknown session", () => {
    expect(rotateRefreshChain("missing", "whatever", TTL)).toBeNull();
  });

  it("kills the chain when a rotated token is reused", () => {
    const { sessionId, rid } = issueRefreshChain(TTL);
    const nextRid = rotateRefreshChain(sessionId, rid, TTL);

    // Reuse of the old rid wipes the chain, so even the new rid stops working.
    expect(rotateRefreshChain(sessionId, rid, TTL)).toBeNull();
    expect(rotateRefreshChain(sessionId, nextRid as string, TTL)).toBeNull();
  });

  it("rejects an expired chain", () => {
    vi.useFakeTimers();
    const { sessionId, rid } = issueRefreshChain(1_000);

    vi.advanceTimersByTime(1_001);
    expect(rotateRefreshChain(sessionId, rid, TTL)).toBeNull();
  });

  it("revokes a chain on logout", () => {
    const { sessionId, rid } = issueRefreshChain(TTL);

    revokeRefreshChain(sessionId);
    expect(rotateRefreshChain(sessionId, rid, TTL)).toBeNull();
  });
});
