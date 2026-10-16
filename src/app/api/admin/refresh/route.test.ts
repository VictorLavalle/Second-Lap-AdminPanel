import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "./route";
import { POST as LOGIN } from "../login/route";
import { apiClient } from "@/lib/apiClient";
import { vi } from "vitest";
import { clearRateLimits } from "@/lib/rateLimit";
import { clearRefreshStore } from "@/lib/refreshStore";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/lib/authSession";

async function loginAndGetRefresh(): Promise<string> {
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

function refreshRequest(refreshToken: string, ip = "1.1.1.1"): Request {
  return new Request("http://localhost/api/admin/refresh", {
    method: "POST",
    headers: {
      "x-forwarded-for": ip,
      cookie: `${REFRESH_COOKIE}=${refreshToken}`,
    },
  });
}

beforeEach(() => {
  clearRateLimits();
  clearRefreshStore();
  vi.restoreAllMocks();
});

describe("POST /api/admin/refresh", () => {
  it("transparently rotates and reissues the session cookies", async () => {
    const refreshToken = await loginAndGetRefresh();

    const response = await POST(refreshRequest(refreshToken));

    expect(response.status).toBe(200);
    const newSession = response.cookies.get(SESSION_COOKIE)?.value;
    const newRefresh = response.cookies.get(REFRESH_COOKIE)?.value;
    expect(newSession).toBeTruthy();
    expect(newRefresh).toBeTruthy();
    expect(newRefresh).not.toBe(refreshToken);
  });

  it("returns 401 and clears cookies when the refresh token was already rotated", async () => {
    const refreshToken = await loginAndGetRefresh();
    await POST(refreshRequest(refreshToken)); // first rotation

    const replay = await POST(refreshRequest(refreshToken));

    expect(replay.status).toBe(401);
    expect(replay.cookies.get(SESSION_COOKIE)?.value).toBe("");
    expect(replay.cookies.get(REFRESH_COOKIE)?.value).toBe("");
  });

  it("returns 401 for a missing refresh cookie", async () => {
    const request = new Request("http://localhost/api/admin/refresh", {
      method: "POST",
      headers: { "x-forwarded-for": "1.1.1.1" },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("blocks after exceeding the refresh rate limit", async () => {
    const refreshToken = await loginAndGetRefresh();

    for (let attempt = 0; attempt < 20; attempt += 1) {
      await POST(refreshRequest(refreshToken, "7.7.7.7"));
    }
    const blocked = await POST(refreshRequest(refreshToken, "7.7.7.7"));

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });
});
