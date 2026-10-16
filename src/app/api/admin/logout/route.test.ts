import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { POST as LOGIN } from "../login/route";
import { POST as REFRESH } from "../refresh/route";
import { apiClient } from "@/lib/apiClient";
import { clearRateLimits } from "@/lib/rateLimit";
import { clearRefreshStore } from "@/lib/refreshStore";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/lib/authSession";

async function login(): Promise<string> {
  vi.spyOn(apiClient, "getAdminMe").mockResolvedValue({ username: "admin" });
  const response = await LOGIN(
    new Request("http://localhost/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "1.1.1.1" },
      body: JSON.stringify({ username: "admin", password: "pw" }),
    }),
  );
  return response.cookies.get(REFRESH_COOKIE)?.value ?? "";
}

beforeEach(() => {
  clearRateLimits();
  clearRefreshStore();
  vi.restoreAllMocks();
});

describe("POST /api/admin/logout", () => {
  it("clears both cookies", async () => {
    const refreshToken = await login();
    const response = await POST(
      new Request("http://localhost/api/admin/logout", {
        method: "POST",
        headers: { cookie: `${REFRESH_COOKIE}=${refreshToken}` },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.cookies.get(SESSION_COOKIE)?.value).toBe("");
    expect(response.cookies.get(REFRESH_COOKIE)?.value).toBe("");
  });

  it("revokes the chain server-side so a later refresh fails", async () => {
    const refreshToken = await login();
    await POST(
      new Request("http://localhost/api/admin/logout", {
        method: "POST",
        headers: { cookie: `${REFRESH_COOKIE}=${refreshToken}` },
      }),
    );

    const refreshAfterLogout = await REFRESH(
      new Request("http://localhost/api/admin/refresh", {
        method: "POST",
        headers: {
          "x-forwarded-for": "1.1.1.1",
          cookie: `${REFRESH_COOKIE}=${refreshToken}`,
        },
      }),
    );
    expect(refreshAfterLogout.status).toBe(401);
  });

  it("succeeds even without a session cookie", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/logout", { method: "POST" }),
    );
    expect(response.status).toBe(200);
  });
});
