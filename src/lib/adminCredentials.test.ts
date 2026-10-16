import { beforeEach, describe, expect, it } from "vitest";
import { resolveAdminCredentials } from "./adminCredentials";
import {
  REFRESH_COOKIE,
  SESSION_COOKIE,
  createSessionCookies,
} from "./authSession";
import { signToken } from "./sessionCookie";
import { encryptCredentials } from "./session";
import { clearRefreshStore } from "./refreshStore";

const basic = Buffer.from("admin:secret").toString("base64");

function cookieHeader(parts: Record<string, string>): string {
  return Object.entries(parts)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

beforeEach(() => {
  clearRefreshStore();
});

describe("resolveAdminCredentials", () => {
  it("decrypts credentials from a valid session without refreshing", async () => {
    const sessionToken = await signToken({
      enc: encryptCredentials(basic),
      exp: Date.now() + 60_000,
    });

    const resolved = await resolveAdminCredentials(
      cookieHeader({ [SESSION_COOKIE]: sessionToken }),
    );

    expect(resolved?.credentials).toBe(basic);
    expect(resolved?.refreshedCookies).toHaveLength(0);
  });

  it("transparently refreshes when the session is absent but the refresh is valid", async () => {
    const cookies = await createSessionCookies(basic);
    const refreshToken =
      cookies.find((cookie) => cookie.name === REFRESH_COOKIE)?.value ?? "";

    const resolved = await resolveAdminCredentials(
      cookieHeader({ [REFRESH_COOKIE]: refreshToken }),
    );

    expect(resolved?.credentials).toBe(basic);
    expect(resolved?.refreshedCookies.length).toBeGreaterThan(0);
  });

  it("returns null when neither cookie is valid", async () => {
    expect(await resolveAdminCredentials(null)).toBeNull();
    expect(
      await resolveAdminCredentials(cookieHeader({ [SESSION_COOKIE]: "junk" })),
    ).toBeNull();
  });
});
