import { NextResponse, type NextRequest } from "next/server";
import { hasValidToken } from "@/lib/sessionCookie";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/lib/authConstants";
import { generateNonce } from "@/lib/nonce";
import { buildContentSecurityPolicy } from "@/lib/securityHeaders";

// Edge proxy (Next 16's renamed "middleware" convention). Runs in the edge
// runtime, where node:crypto does NOT exist, so it only uses Web Crypto
// (hasValidToken for cookie signatures, generateNonce for the CSP nonce). It
// never decrypts the AES credential blob or calls the backend.
//
// Responsibilities:
//  1. Auth guard: a valid session OR a still-valid refresh token lets the
//     request through; otherwise redirect to /login.
//  2. Per-request CSP: generate a nonce, forward it to the app via the x-nonce
//     request header (read in the root layout), and set the Content-Security-
//     Policy response header with that nonce so inline framework scripts are
//     authorized without 'unsafe-inline' in production.

const PUBLIC_PATHS = ["/login"];

const NONCE_HEADER = "x-nonce";

function isDev(): boolean {
  return process.env.NODE_ENV !== "production";
}

function backendOrigin(): string {
  return process.env.BACKEND_PUBLIC_ORIGIN ?? "http://localhost:8080";
}

// Builds a NextResponse that forwards the nonce to the app and carries the CSP.
// The CSP is set on BOTH the request headers (so Next.js extracts the nonce and
// applies it to its framework scripts/styles during SSR) and the response
// headers (so the browser enforces it). This dual-set is required by Next's
// nonce mechanism — a response-only CSP leaves scripts un-nonced and
// 'strict-dynamic' then blocks them.
function responseWithCsp(request: NextRequest, nonce: string): NextResponse {
  const csp = buildContentSecurityPolicy({
    isDev: isDev(),
    backendOrigin: backendOrigin(),
    nonce,
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(NONCE_HEADER, nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const nonce = generateNonce();

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return responseWithCsp(request, nonce);
  }

  const sessionValid = await hasValidToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  const refreshValid = await hasValidToken(
    request.cookies.get(REFRESH_COOKIE)?.value,
  );

  if (sessionValid || refreshValid) {
    return responseWithCsp(request, nonce);
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

// Guard everything except Next internals, the auth API, and static assets.
export const config = {
  matcher: ["/((?!api/admin|_next/static|_next/image|favicon.ico|brand).*)"],
};
