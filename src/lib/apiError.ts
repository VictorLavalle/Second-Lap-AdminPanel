import type { ApiError } from "@/types";

// Thrown by the API client when the backend returns a non-2xx response. Carries
// the parsed ApiError envelope when present, plus the HTTP status and (for 429)
// the Retry-After hint, so callers in the BFF can map failures to HTTP results.
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfterSeconds: number | null;
  readonly context: Record<string, unknown> | null;

  constructor(
    status: number,
    body: ApiError | null,
    retryAfterSeconds: number | null = null,
  ) {
    super(body?.message ?? `Request failed with status ${status}`);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = body?.code ?? "UNKNOWN";
    this.retryAfterSeconds = retryAfterSeconds;
    this.context = body?.context ?? null;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

// Retry-After may be a number of seconds or an HTTP date. We only honor the
// numeric form; anything else yields null so callers fall back to a default.
export function parseRetryAfter(headerValue: string | null): number | null {
  if (!headerValue) {
    return null;
  }
  const seconds = Number(headerValue);
  return Number.isInteger(seconds) && seconds >= 0 ? seconds : null;
}

// Reads an ApiError envelope defensively: a non-JSON or empty body yields null
// rather than throwing, so error handling never masks the original status.
export async function parseApiError(
  response: Response,
): Promise<ApiError | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }
  try {
    const body = (await response.json()) as unknown;
    if (
      typeof body === "object" &&
      body !== null &&
      "code" in body &&
      "message" in body
    ) {
      return body as ApiError;
    }
    return null;
  } catch {
    return null;
  }
}
