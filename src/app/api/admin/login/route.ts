import { NextResponse } from "next/server";
import { apiClient, encodeBasicCredentials } from "@/lib/apiClient";
import { ApiRequestError } from "@/lib/apiError";
import { checkRateLimit } from "@/lib/rateLimit";
import { clientKey } from "@/lib/clientKey";
import { cookieOptions, createSessionCookies } from "@/lib/authSession";

// Credential validation and backend calls use node:crypto transitively, so this
// handler must run in the Node runtime, never the edge.
export const runtime = "nodejs";

const LOGIN_RATE_LIMIT = { limit: 5, windowMs: 60_000 };

interface LoginBody {
  username?: unknown;
  password?: unknown;
}

function readCredentials(body: LoginBody): { username: string; password: string } | null {
  if (typeof body.username !== "string" || typeof body.password !== "string") {
    return null;
  }
  const username = body.username.trim();
  const password = body.password;
  if (username.length === 0 || password.length === 0) {
    return null;
  }
  return { username, password };
}

export async function POST(request: Request): Promise<NextResponse> {
  const limit = checkRateLimit(`login:${clientKey(request)}`, LOGIN_RATE_LIMIT);
  if (!limit.allowed) {
    return rateLimited(limit.retryAfterSeconds);
  }

  let parsed: LoginBody;
  try {
    parsed = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const credentials = readCredentials(parsed);
  if (!credentials) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const basic = encodeBasicCredentials(credentials.username, credentials.password);
  try {
    await apiClient.getAdminMe(basic);
  } catch (error) {
    return handleValidationError(error);
  }

  const response = NextResponse.json({ ok: true });
  for (const cookie of await createSessionCookies(basic)) {
    response.cookies.set(cookie.name, cookie.value, cookieOptions(cookie.maxAgeSeconds));
  }
  return response;
}

// Never leak whether the username or the password was wrong; a generic 401.
function handleValidationError(error: unknown): NextResponse {
  if (error instanceof ApiRequestError) {
    if (error.isRateLimited) {
      return rateLimited(error.retryAfterSeconds ?? 60);
    }
    if (error.isUnauthorized) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }
  }
  return NextResponse.json({ error: "login_failed" }, { status: 502 });
}

function rateLimited(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: "rate_limited" },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
