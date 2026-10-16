import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";
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

describe("middleware", () => {
  it("lets the /login page through without a session", async () => {
    const response = await middleware(requestFor("/login"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects to /login when no valid token is present", async () => {
    const response = await middleware(requestFor("/productos"));
    expect(response.headers.get("location")).toContain("/login");
  });

  it("allows a protected route when the session cookie is valid", async () => {
    const token = await signToken({ enc: "c", exp: Date.now() + 60_000 });
    const response = await middleware(
      requestFor("/productos", { [SESSION_COOKIE]: token }),
    );
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects when the session cookie is expired and no refresh exists", async () => {
    const expired = await signToken({ enc: "c", exp: Date.now() - 1 });
    const response = await middleware(
      requestFor("/productos", { [SESSION_COOKIE]: expired }),
    );
    expect(response.headers.get("location")).toContain("/login");
  });
});
