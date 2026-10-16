import { verifySignedToken } from "@/lib/sessionCookie";
import { decryptCredentials } from "@/lib/session";
import { refreshSession } from "@/lib/refreshSession";
import { readCookie } from "@/lib/cookies";
import {
  REFRESH_COOKIE,
  SESSION_COOKIE,
  type SessionCookieSpec,
} from "@/lib/authSession";

// Resolves the admin Basic credential for a BFF data request, transparently
// refreshing when the session token has expired but the refresh token is still
// valid. Node runtime only (decrypts via node:crypto).
//
// Returns the decrypted credential plus any cookies that must be written back to
// the response (present only when a refresh happened). A null result means the
// caller must respond 401 and clear cookies — the client then redirects to
// /login.

export interface ResolvedCredentials {
  credentials: string;
  refreshedCookies: SessionCookieSpec[];
}

export async function resolveAdminCredentials(
  cookieHeader: string | null,
): Promise<ResolvedCredentials | null> {
  const sessionPayload = await verifySignedToken(
    readCookie(cookieHeader, SESSION_COOKIE),
  );
  if (sessionPayload) {
    return {
      credentials: decryptCredentials(sessionPayload.enc),
      refreshedCookies: [],
    };
  }

  // Session expired or missing: attempt a transparent refresh.
  const refreshCookie = readCookie(cookieHeader, REFRESH_COOKIE);
  const outcome = await refreshSession(refreshCookie);
  if (!outcome.ok) {
    return null;
  }

  const sessionCookie = outcome.cookies.find(
    (cookie) => cookie.name === SESSION_COOKIE,
  );
  if (!sessionCookie) {
    return null;
  }
  const refreshedPayload = await verifySignedToken(sessionCookie.value);
  if (!refreshedPayload) {
    return null;
  }

  return {
    credentials: decryptCredentials(refreshedPayload.enc),
    refreshedCookies: outcome.cookies,
  };
}
