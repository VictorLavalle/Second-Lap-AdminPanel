// Edge-safe shared constants. This module must stay free of any node:crypto
// imports so the edge middleware can import the cookie names without pulling
// Node-only code into the edge bundle.

export const SESSION_COOKIE = "sl_session";
export const REFRESH_COOKIE = "sl_refresh";

export const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
