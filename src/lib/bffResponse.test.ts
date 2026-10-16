import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import {
  errorResponse,
  unauthorizedResponse,
  withRefreshedCookies,
} from "./bffResponse";
import { REFRESH_COOKIE, SESSION_COOKIE } from "./authSession";
import { ApiRequestError } from "./apiError";

describe("withRefreshedCookies", () => {
  it("writes each refreshed cookie onto the response", () => {
    const response = withRefreshedCookies(NextResponse.json({}), [
      { name: SESSION_COOKIE, value: "s", maxAgeSeconds: 900 },
      { name: REFRESH_COOKIE, value: "r", maxAgeSeconds: 1000 },
    ]);

    expect(response.cookies.get(SESSION_COOKIE)?.value).toBe("s");
    expect(response.cookies.get(REFRESH_COOKIE)?.value).toBe("r");
  });
});

describe("unauthorizedResponse", () => {
  it("returns 401 and clears both cookies", () => {
    const response = unauthorizedResponse();

    expect(response.status).toBe(401);
    expect(response.cookies.get(SESSION_COOKIE)?.value).toBe("");
    expect(response.cookies.get(REFRESH_COOKIE)?.value).toBe("");
  });
});

describe("errorResponse", () => {
  it("maps a backend 401 to a cleared session", () => {
    const response = errorResponse(new ApiRequestError(401, null));
    expect(response.status).toBe(401);
    expect(response.cookies.get(SESSION_COOKIE)?.value).toBe("");
  });

  it("maps a backend 429 to 429 with Retry-After", () => {
    const response = errorResponse(new ApiRequestError(429, null, 15));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("15");
  });

  it("passes through other backend errors with their status", () => {
    const response = errorResponse(
      new ApiRequestError(409, {
        code: "INVALID_ORDER_TRANSITION",
        message: "no",
      }),
    );
    expect(response.status).toBe(409);
  });

  it("maps unknown errors to 502", () => {
    const response = errorResponse(new Error("boom"));
    expect(response.status).toBe(502);
  });

  it("forwards the correlationId as 'ref' on a 5xx", async () => {
    const response = errorResponse(
      new ApiRequestError(500, {
        code: "INTERNAL",
        message: "boom",
        context: { correlationId: "corr-77" },
      }),
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: string; ref?: string };
    expect(body.error).toBe("server_error");
    expect(body.ref).toBe("corr-77");
  });

  it("omits 'ref' on a 5xx without a correlationId", async () => {
    const response = errorResponse(new ApiRequestError(503, null));

    expect(response.status).toBe(503);
    const body = (await response.json()) as { error: string; ref?: string };
    expect(body.error).toBe("server_error");
    expect(body.ref).toBeUndefined();
  });
});
