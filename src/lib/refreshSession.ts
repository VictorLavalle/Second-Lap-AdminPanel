import { verifySignedToken } from "@/lib/sessionCookie";
import {
  parseRefreshId,
  rotateSessionCookies,
  type SessionCookieSpec,
} from "@/lib/authSession";

// Pure-ish refresh logic, extracted from the HTTP handler so the transparent
// refresh / rotation-invalidation / expiry scenarios can be unit-tested without
// Next request plumbing. Node runtime only.

export type RefreshOutcome =
  | { ok: true; cookies: SessionCookieSpec[] }
  | { ok: false };

// Given the current refresh cookie value, verifies it, rotates the chain and
// returns a fresh cookie pair. Any invalid/expired/rotated token yields ok:false
// so the caller can clear cookies and bounce to /login.
export async function refreshSession(
  refreshCookie: string | undefined,
): Promise<RefreshOutcome> {
  const payload = await verifySignedToken(refreshCookie);
  if (!payload?.rid) {
    return { ok: false };
  }

  const identity = parseRefreshId(payload.rid);
  if (!identity) {
    return { ok: false };
  }

  const cookies = await rotateSessionCookies(
    payload.enc,
    identity.sessionId,
    identity.rid,
  );
  if (!cookies) {
    return { ok: false };
  }
  return { ok: true, cookies };
}
