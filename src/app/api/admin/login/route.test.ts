import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { apiClient } from "@/lib/apiClient";
import { ApiRequestError } from "@/lib/apiError";
import { clearRateLimits } from "@/lib/rateLimit";
import { clearRefreshStore } from "@/lib/refreshStore";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/lib/authSession";

function loginRequest(body: unknown, ip = "10.0.0.1"): Request {
  return new Request("http://localhost/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  clearRateLimits();
  clearRefreshStore();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/admin/login", () => {
  it("sets both session cookies on valid credentials", async () => {
    vi.spyOn(apiClient, "getAdminMe").mockResolvedValue({ username: "admin" });

    const response = await POST(loginRequest({ username: "admin", password: "pw" }));

    expect(response.status).toBe(200);
    expect(response.cookies.get(SESSION_COOKIE)?.value).toBeTruthy();
    expect(response.cookies.get(REFRESH_COOKIE)?.value).toBeTruthy();
    const sessionCookie = response.cookies.get(SESSION_COOKIE);
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.sameSite).toBe("strict");
  });

  it("returns a generic 401 on invalid credentials", async () => {
    vi.spyOn(apiClient, "getAdminMe").mockRejectedValue(
      new ApiRequestError(401, null),
    );

    const response = await POST(loginRequest({ username: "admin", password: "bad" }));

    expect(response.status).toBe(401);
    expect(response.cookies.get(SESSION_COOKIE)?.value).toBeFalsy();
  });

  it("rejects a malformed body with 400", async () => {
    const response = await POST(loginRequest({ username: "" }));
    expect(response.status).toBe(400);
  });

  it("rejects an empty password with 400", async () => {
    const response = await POST(
      loginRequest({ username: "admin", password: "" }),
    );
    expect(response.status).toBe(400);
  });

  it("propagates the backend rate limit as 429 with Retry-After", async () => {
    vi.spyOn(apiClient, "getAdminMe").mockRejectedValue(
      new ApiRequestError(429, null, 42),
    );

    const response = await POST(loginRequest({ username: "a", password: "b" }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
  });

  it("maps unexpected backend failures to 502", async () => {
    vi.spyOn(apiClient, "getAdminMe").mockRejectedValue(
      new ApiRequestError(500, null),
    );

    const response = await POST(loginRequest({ username: "a", password: "b" }));
    expect(response.status).toBe(502);
  });

  it("blocks after exceeding the login rate limit", async () => {
    vi.spyOn(apiClient, "getAdminMe").mockRejectedValue(
      new ApiRequestError(401, null),
    );

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await POST(loginRequest({ username: "a", password: "b" }, "9.9.9.9"));
    }
    const blocked = await POST(
      loginRequest({ username: "a", password: "b" }, "9.9.9.9"),
    );

    expect(blocked.status).toBe(429);
  });

  it("blocks IP rotation via the global cap and returns Retry-After", async () => {
    vi.spyOn(apiClient, "getAdminMe").mockRejectedValue(
      new ApiRequestError(401, null),
    );

    // A fresh forged IP per request never trips the per-IP limit (5), but the
    // global login cap (30) must eventually stop the flood.
    let blocked: Response | null = null;
    for (let attempt = 0; attempt < 31; attempt += 1) {
      const response = await POST(
        loginRequest({ username: "a", password: "b" }, `203.0.113.${attempt}`),
      );
      if (response.status === 429) {
        blocked = response;
        break;
      }
    }

    expect(blocked).not.toBeNull();
    expect(blocked?.headers.get("Retry-After")).toBeTruthy();
  });

  it("rejects invalid JSON with 400", async () => {
    const request = new Request("http://localhost/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "{not json",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
