import { NextResponse } from "next/server";
import { verifySignedToken } from "@/lib/sessionCookie";
import { revokeRefreshChain } from "@/lib/refreshStore";
import {
  REFRESH_COOKIE,
  SESSION_COOKIE,
  cookieOptions,
  parseRefreshId,
} from "@/lib/authSession";
import { readCookie } from "@/lib/cookies";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const refreshCookie = readCookie(request.headers.get("cookie"), REFRESH_COOKIE);

  const payload = await verifySignedToken(refreshCookie);
  const identity = parseRefreshId(payload?.rid);
  if (identity) {
    revokeRefreshChain(identity.sessionId);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
  response.cookies.set(REFRESH_COOKIE, "", cookieOptions(0));
  return response;
}
