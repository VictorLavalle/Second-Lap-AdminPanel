import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { clientKey } from "@/lib/clientKey";
import {
  REFRESH_COOKIE,
  SESSION_COOKIE,
  cookieOptions,
} from "@/lib/authSession";
import { refreshSession } from "@/lib/refreshSession";
import { readCookie } from "@/lib/cookies";

export const runtime = "nodejs";

const REFRESH_RATE_LIMIT = { limit: 20, windowMs: 60_000 };

export async function POST(request: Request): Promise<NextResponse> {
  const limit = checkRateLimit(
    `refresh:${clientKey(request)}`,
    REFRESH_RATE_LIMIT,
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const refreshCookie = readCookie(request.headers.get("cookie"), REFRESH_COOKIE);

  const outcome = await refreshSession(refreshCookie);
  if (!outcome.ok) {
    return clearSessionResponse();
  }

  const response = NextResponse.json({ ok: true });
  for (const cookie of outcome.cookies) {
    response.cookies.set(
      cookie.name,
      cookie.value,
      cookieOptions(cookie.maxAgeSeconds),
    );
  }
  return response;
}

function clearSessionResponse(): NextResponse {
  const response = NextResponse.json({ error: "session_expired" }, { status: 401 });
  response.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
  response.cookies.set(REFRESH_COOKIE, "", cookieOptions(0));
  return response;
}
