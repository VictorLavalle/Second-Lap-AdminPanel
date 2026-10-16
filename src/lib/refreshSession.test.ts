import { beforeEach, describe, expect, it } from "vitest";
import {
  REFRESH_COOKIE,
  SESSION_COOKIE,
  createSessionCookies,
} from "./authSession";
import { refreshSession } from "./refreshSession";
import { verifySignedToken } from "./sessionCookie";
import { decryptCredentials } from "./session";
import { clearRefreshStore } from "./refreshStore";

const credentials = Buffer.from("admin:secret").toString("base64");

function pick(cookies: { name: string; value: string }[], name: string): string {
  return cookies.find((cookie) => cookie.name === name)?.value ?? "";
}

beforeEach(() => {
  clearRefreshStore();
});

describe("transparent refresh", () => {
  it("rotates the refresh token and reissues a fresh session without re-login", async () => {
    const initial = await createSessionCookies(credentials);
    const refreshToken = pick(initial, REFRESH_COOKIE);

    const outcome = await refreshSession(refreshToken);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    const newSession = pick(outcome.cookies, SESSION_COOKIE);
    const newRefresh = pick(outcome.cookies, REFRESH_COOKIE);

    // A usable new session token is issued transparently.
    const sessionPayload = await verifySignedToken(newSession);
    expect(sessionPayload).not.toBeNull();
    // Credentials still decrypt to the original Basic token.
    expect(decryptCredentials(sessionPayload?.enc as string)).toBe(credentials);
    // The refresh token was rotated (new rid), not reused.
    const oldRid = (await verifySignedToken(refreshToken))?.rid;
    const newRid = (await verifySignedToken(newRefresh))?.rid;
    expect(newRid).not.toBe(oldRid);
  });
});

describe("rotation invalidation", () => {
  it("rejects reuse of an already-rotated refresh token and forces re-login", async () => {
    const initial = await createSessionCookies(credentials);
    const originalRefresh = pick(initial, REFRESH_COOKIE);

    // First refresh succeeds and rotates the chain.
    const first = await refreshSession(originalRefresh);
    expect(first.ok).toBe(true);

    // Reusing the original (now rotated) refresh token must fail.
    const replay = await refreshSession(originalRefresh);
    expect(replay.ok).toBe(false);
  });

  it("kills the chain so the rotated token also stops working after a replay", async () => {
    const initial = await createSessionCookies(credentials);
    const originalRefresh = pick(initial, REFRESH_COOKIE);

    const first = await refreshSession(originalRefresh);
    expect(first.ok).toBe(true);
    const rotatedRefresh = first.ok ? pick(first.cookies, REFRESH_COOKIE) : "";

    // Replay of the old token wipes the chain (treated as compromise)...
    await refreshSession(originalRefresh);
    // ...so even the legitimately rotated token no longer refreshes.
    const afterReplay = await refreshSession(rotatedRefresh);
    expect(afterReplay.ok).toBe(false);
  });
});

describe("expiry", () => {
  it("rejects a missing or signatureless refresh token", async () => {
    expect((await refreshSession(undefined)).ok).toBe(false);
    expect((await refreshSession("garbage")).ok).toBe(false);
  });

  it("rejects a signed token whose rid is malformed", async () => {
    const { signToken } = await import("./sessionCookie");
    const token = await signToken({
      enc: "cipher",
      exp: Date.now() + 10_000,
      rid: "no-colon-here",
    });

    expect((await refreshSession(token)).ok).toBe(false);
  });
});
