import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  REFRESH_COOKIE,
  SESSION_COOKIE,
  cookieOptions,
  createSessionCookies,
  parseRefreshId,
} from "./authSession";
import { clearRefreshStore } from "./refreshStore";

beforeEach(() => {
  clearRefreshStore();
});

describe("cookieOptions", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("always hardens cookies: httpOnly, lax, path=/", () => {
    const options = cookieOptions(900);

    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.maxAge).toBe(900);
  });

  it("sets Secure in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(cookieOptions(900).secure).toBe(true);
  });

  it("omits Secure outside production so dev works over plain HTTP on a LAN IP", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(cookieOptions(900).secure).toBe(false);
  });
});

describe("parseRefreshId", () => {
  it("splits a composite sessionId:rid", () => {
    expect(parseRefreshId("abc:def")).toEqual({ sessionId: "abc", rid: "def" });
  });

  it("returns null for malformed ids", () => {
    expect(parseRefreshId(undefined)).toBeNull();
    expect(parseRefreshId("nocolon")).toBeNull();
    expect(parseRefreshId(":def")).toBeNull();
    expect(parseRefreshId("abc:")).toBeNull();
  });
});

describe("createSessionCookies", () => {
  it("issues both a session and a refresh cookie", async () => {
    const cookies = await createSessionCookies(
      Buffer.from("admin:secret").toString("base64"),
    );
    const names = cookies.map((cookie) => cookie.name);

    expect(names).toContain(SESSION_COOKIE);
    expect(names).toContain(REFRESH_COOKIE);
  });
});
