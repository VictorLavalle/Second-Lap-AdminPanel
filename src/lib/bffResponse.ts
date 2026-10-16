import { NextResponse } from "next/server";
import {
  REFRESH_COOKIE,
  SESSION_COOKIE,
  cookieOptions,
  type SessionCookieSpec,
} from "@/lib/authSession";
import { ApiRequestError } from "@/lib/apiError";

// Shared response helpers for authenticated BFF data routes.

// Writes any transparently-refreshed cookies onto a JSON response.
export function withRefreshedCookies(
  response: NextResponse,
  cookies: SessionCookieSpec[],
): NextResponse {
  for (const cookie of cookies) {
    response.cookies.set(
      cookie.name,
      cookie.value,
      cookieOptions(cookie.maxAgeSeconds),
    );
  }
  return response;
}

// 401 that clears both cookies so the client redirects to /login.
export function unauthorizedResponse(): NextResponse {
  const response = NextResponse.json({ error: "unauthorized" }, { status: 401 });
  response.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
  response.cookies.set(REFRESH_COOKIE, "", cookieOptions(0));
  return response;
}

// Maps an ApiRequestError from the backend to a BFF response. A 401 from the
// backend means our stored credentials are no longer valid, so we clear the
// session; other errors pass through their status with a safe generic body.
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiRequestError) {
    if (error.isUnauthorized) {
      return unauthorizedResponse();
    }
    if (error.isRateLimited) {
      return NextResponse.json(
        { error: "rate_limited" },
        {
          status: 429,
          headers: {
            "Retry-After": String(error.retryAfterSeconds ?? 60),
          },
        },
      );
    }
    return NextResponse.json(
      { error: error.code, message: error.message },
      { status: error.status },
    );
  }
  return NextResponse.json({ error: "upstream_error" }, { status: 502 });
}
