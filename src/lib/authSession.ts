import { encryptCredentials } from "@/lib/session";
import { signToken } from "@/lib/sessionCookie";
import { issueRefreshChain, rotateRefreshChain } from "@/lib/refreshStore";
import {
  REFRESH_COOKIE,
  REFRESH_TTL_MS,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "@/lib/authConstants";

// Node-runtime orchestration that ties credential encryption, cookie signing
// and the rotating refresh store together. Imported only by Route Handlers.

export {
  REFRESH_COOKIE,
  REFRESH_TTL_MS,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "@/lib/authConstants";

export interface SessionCookieSpec {
  name: string;
  value: string;
  maxAgeSeconds: number;
}

// Shared cookie hardening: httpOnly, Secure, SameSite=Strict, Path=/.
export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "strict" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

// Builds a fresh session + refresh cookie pair for a brand-new login.
export async function createSessionCookies(
  credentials: string,
): Promise<SessionCookieSpec[]> {
  const enc = encryptCredentials(credentials);
  const { sessionId, rid } = issueRefreshChain(REFRESH_TTL_MS);
  return buildCookiePair(enc, sessionId, rid);
}

// Rotates the refresh chain and reissues both cookies. Returns null when the
// presented refresh is unknown, expired or already rotated (reuse).
export async function rotateSessionCookies(
  enc: string,
  sessionId: string,
  presentedRid: string,
): Promise<SessionCookieSpec[] | null> {
  const nextRid = rotateRefreshChain(sessionId, presentedRid, REFRESH_TTL_MS);
  if (!nextRid) {
    return null;
  }
  return buildCookiePair(enc, sessionId, nextRid);
}

async function buildCookiePair(
  enc: string,
  sessionId: string,
  rid: string,
): Promise<SessionCookieSpec[]> {
  const sessionToken = await signToken({
    enc,
    exp: Date.now() + SESSION_TTL_MS,
  });
  const refreshToken = await signToken({
    enc,
    exp: Date.now() + REFRESH_TTL_MS,
    rid: `${sessionId}:${rid}`,
  });
  return [
    {
      name: SESSION_COOKIE,
      value: sessionToken,
      maxAgeSeconds: Math.floor(SESSION_TTL_MS / 1000),
    },
    {
      name: REFRESH_COOKIE,
      value: refreshToken,
      maxAgeSeconds: Math.floor(REFRESH_TTL_MS / 1000),
    },
  ];
}

// Splits the composite "sessionId:rid" refresh identity back into its parts.
export function parseRefreshId(
  rid: string | undefined,
): { sessionId: string; rid: string } | null {
  if (!rid) {
    return null;
  }
  const separatorIndex = rid.indexOf(":");
  if (separatorIndex <= 0 || separatorIndex === rid.length - 1) {
    return null;
  }
  return {
    sessionId: rid.slice(0, separatorIndex),
    rid: rid.slice(separatorIndex + 1),
  };
}
