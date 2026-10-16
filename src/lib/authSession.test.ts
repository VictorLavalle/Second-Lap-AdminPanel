import { beforeEach, describe, expect, it } from "vitest";
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
  it("hardens cookies: httpOnly, secure, strict, path=/", () => {
    const options = cookieOptions(900);

    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe("strict");
    expect(options.path).toBe("/");
    expect(options.maxAge).toBe(900);
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
