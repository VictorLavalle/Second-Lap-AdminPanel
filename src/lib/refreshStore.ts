import { randomUUID } from "node:crypto";

// Rotating refresh-token store. Single-instance and in-memory by design:
// restarting the dev server invalidates all sessions and forces re-login. This
// keeps session secrets off the filesystem, minimizing attack surface for a
// local, single-admin tool. Node runtime only (uses node:crypto).
//
// Each refresh token carries a rotation id (rid). Only the current rid for a
// session is valid; rotating issues a fresh rid and invalidates the previous
// one, so a stolen-and-reused old refresh token is rejected.

interface RefreshRecord {
  currentRid: string;
  expiresAt: number;
}

const sessions = new Map<string, RefreshRecord>();

export interface IssuedRefresh {
  sessionId: string;
  rid: string;
}

// Starts a new refresh chain (called at login) and returns its ids.
export function issueRefreshChain(ttlMs: number): IssuedRefresh {
  const sessionId = randomUUID();
  const rid = randomUUID();
  sessions.set(sessionId, { currentRid: rid, expiresAt: Date.now() + ttlMs });
  return { sessionId, rid };
}

// Rotates the chain if the presented rid is the current one. Returns the new
// rid, or null when the session is unknown, expired, or the rid was already
// rotated (reuse of an invalidated token).
export function rotateRefreshChain(
  sessionId: string,
  presentedRid: string,
  ttlMs: number,
): string | null {
  const record = sessions.get(sessionId);
  if (!record) {
    return null;
  }
  if (Date.now() >= record.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  if (record.currentRid !== presentedRid) {
    // Reuse of a rotated token: treat as compromise and kill the chain.
    sessions.delete(sessionId);
    return null;
  }
  const nextRid = randomUUID();
  record.currentRid = nextRid;
  record.expiresAt = Date.now() + ttlMs;
  return nextRid;
}

// Invalidates a chain on logout.
export function revokeRefreshChain(sessionId: string): void {
  sessions.delete(sessionId);
}

// Test-only hook to reset state between runs.
export function clearRefreshStore(): void {
  sessions.clear();
}
