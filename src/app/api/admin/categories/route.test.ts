import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { apiClient } from "@/lib/apiClient";
import { ApiRequestError } from "@/lib/apiError";
import { SESSION_COOKIE } from "@/lib/authSession";
import { signToken } from "@/lib/sessionCookie";
import { encryptCredentials } from "@/lib/session";

const basic = Buffer.from("admin:secret").toString("base64");

async function authedRequest(): Promise<Request> {
  const token = await signToken({
    enc: encryptCredentials(basic),
    exp: Date.now() + 60_000,
  });
  return new Request("http://localhost/api/admin/categories", {
    headers: { cookie: `${SESSION_COOKIE}=${token}` },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/admin/categories", () => {
  it("returns categories for an authenticated admin", async () => {
    vi.spyOn(apiClient, "listCategories").mockResolvedValue([
      { id: "c1", name: "Camisas", order: 1 },
    ]);

    const response = await GET(await authedRequest());
    expect(response.status).toBe(200);
  });

  it("returns 401 without a session", async () => {
    const response = await GET(
      new Request("http://localhost/api/admin/categories"),
    );
    expect(response.status).toBe(401);
  });

  it("maps a backend failure through errorResponse", async () => {
    vi.spyOn(apiClient, "listCategories").mockRejectedValue(
      new ApiRequestError(502, null),
    );

    const response = await GET(await authedRequest());
    expect(response.status).toBe(502);
  });
});
