import { describe, expect, it } from "vitest";
import {
  ApiRequestError,
  parseApiError,
  parseRetryAfter,
} from "./apiError";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("ApiRequestError", () => {
  it("exposes the backend code and message", () => {
    const error = new ApiRequestError(409, {
      code: "INVALID_ORDER_TRANSITION",
      message: "El pedido no está pendiente",
    });

    expect(error.status).toBe(409);
    expect(error.code).toBe("INVALID_ORDER_TRANSITION");
    expect(error.message).toBe("El pedido no está pendiente");
    expect(error.isConflict).toBe(true);
    expect(error.isUnauthorized).toBe(false);
    expect(error.isRateLimited).toBe(false);
  });

  it("falls back to generic values when no body is present", () => {
    const error = new ApiRequestError(401, null);

    expect(error.code).toBe("UNKNOWN");
    expect(error.message).toContain("401");
    expect(error.isUnauthorized).toBe(true);
  });

  it("carries the retry-after hint for rate limiting", () => {
    const error = new ApiRequestError(429, null, 30);

    expect(error.isRateLimited).toBe(true);
    expect(error.retryAfterSeconds).toBe(30);
  });

  it("flags 5xx as server errors and 4xx as not", () => {
    expect(new ApiRequestError(500, null).isServerError).toBe(true);
    expect(new ApiRequestError(503, null).isServerError).toBe(true);
    expect(new ApiRequestError(409, null).isServerError).toBe(false);
  });

  it("extracts a string correlationId from context", () => {
    const error = new ApiRequestError(500, {
      code: "INTERNAL",
      message: "boom",
      context: { correlationId: "corr-9" },
    });

    expect(error.correlationId).toBe("corr-9");
  });

  it("returns null when correlationId is absent or not a string", () => {
    expect(new ApiRequestError(500, null).correlationId).toBeNull();
    expect(
      new ApiRequestError(500, {
        code: "X",
        message: "m",
        context: { correlationId: 123 },
      }).correlationId,
    ).toBeNull();
  });
});

describe("parseRetryAfter", () => {
  it("parses a non-negative integer number of seconds", () => {
    expect(parseRetryAfter("30")).toBe(30);
    expect(parseRetryAfter("0")).toBe(0);
  });

  it("rejects dates, negatives and missing values", () => {
    expect(parseRetryAfter("Wed, 21 Oct 2025 07:28:00 GMT")).toBeNull();
    expect(parseRetryAfter("-5")).toBeNull();
    expect(parseRetryAfter(null)).toBeNull();
  });
});

describe("parseApiError", () => {
  it("returns the envelope when the body is a valid ApiError", async () => {
    const response = jsonResponse(400, {
      code: "VALIDATION",
      message: "Datos inválidos",
    });

    await expect(parseApiError(response)).resolves.toEqual({
      code: "VALIDATION",
      message: "Datos inválidos",
    });
  });

  it("returns null for non-JSON responses", async () => {
    const response = new Response("boom", {
      status: 500,
      headers: { "content-type": "text/plain" },
    });

    await expect(parseApiError(response)).resolves.toBeNull();
  });

  it("returns null when JSON lacks the ApiError shape", async () => {
    const response = jsonResponse(400, { foo: "bar" });

    await expect(parseApiError(response)).resolves.toBeNull();
  });

  it("returns null when the body is invalid JSON", async () => {
    const response = new Response("{not json", {
      status: 400,
      headers: { "content-type": "application/json" },
    });

    await expect(parseApiError(response)).resolves.toBeNull();
  });
});
