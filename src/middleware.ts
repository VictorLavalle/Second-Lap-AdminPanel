import { NextResponse, type NextRequest } from "next/server";
import { hasValidToken } from "@/lib/sessionCookie";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/lib/authConstants";

// Edge middleware. Runs in the edge runtime, where node:crypto does NOT exist,
// so it only verifies the signed cookies via Web Crypto (hasValidToken) — it
// never decrypts the AES credential blob or calls the backend. A valid session
// OR a still-valid refresh token lets the request through; the data layer
// transparently refreshes an expired session before any backend call. Only when
// both are invalid do we redirect to /login.

const PUBLIC_PATHS = ["/login"];

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const sessionValid = await hasValidToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  const refreshValid = await hasValidToken(
    request.cookies.get(REFRESH_COOKIE)?.value,
  );

  if (sessionValid || refreshValid) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

// Guard everything except Next internals, the auth API, and static assets.
export const config = {
  matcher: ["/((?!api/admin|_next/static|_next/image|favicon.ico|brand).*)"],
};
