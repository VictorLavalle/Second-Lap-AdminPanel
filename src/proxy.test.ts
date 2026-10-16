import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
import { signToken } from "@/lib/sessionCookie";
import { SESSION_COOKIE } from "@/lib/authConstants";

function requestFor(
  path: string,
  cookies: Record<string, string> = {},
): NextRequest {
  const request = new NextRequest(new URL(`http://localhost${path}`));
  for (const [name, value] of Object.entries(cookies)) {
    request.cookies.set(name, value);
  }
  return request;
}

describe("proxy", () => {
  it("lets the /login page through without a session", async () => {
    const response = await proxy(requestFor("/login"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("sets a Content-Security-Policy header on the /login response", async () => {
    const response = await proxy(requestFor("/login"));
    const csp = response.headers.get("Content-Security-Policy");

    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("redirects to /login when no valid token is present", async () => {
    const response = await proxy(requestFor("/productos"));
    expect(response.headers.get("location")).toContain("/login");
  });

  it("allows a protected route when the session cookie is valid and attaches a CSP", async () => {
    const token = await signToken({ enc: "c", exp: Date.now() + 60_000 });
    const response = await proxy(
      requestFor("/productos", { [SESSION_COOKIE]: token }),
    );
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "default-src 'none'",
    );
  });

  it("redirects when the session cookie is expired and no refresh exists", async () => {
    const expired = await signToken({ enc: "c", exp: Date.now() - 1 });
    const response = await proxy(
      requestFor("/productos", { [SESSION_COOKIE]: expired }),
    );
    expect(response.headers.get("location")).toContain("/login");
  });

  it("does not attach a CSP header to the redirect response", async () => {
    const response = await proxy(requestFor("/productos"));
    expect(response.headers.get("Content-Security-Policy")).toBeNull();
  });

  it("emits a nonce-based CSP (no script unsafe-inline) in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const response = await proxy(requestFor("/login"));
      const csp = response.headers.get("Content-Security-Policy");

      expect(csp).toMatch(/script-src [^;]*'nonce-/);
      expect(csp).toContain("'strict-dynamic'");
      expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("generates a distinct nonce per request in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const first = await proxy(requestFor("/login"));
      const second = await proxy(requestFor("/login"));
      const nonceOf = (csp: string | null) =>
        csp?.match(/'nonce-([^']+)'/)?.[1];

      const a = nonceOf(first.headers.get("Content-Security-Policy"));
      const b = nonceOf(second.headers.get("Content-Security-Policy"));
      expect(a).toBeTruthy();
      expect(a).not.toBe(b);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
