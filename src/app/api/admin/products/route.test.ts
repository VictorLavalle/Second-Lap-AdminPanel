import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { apiClient } from "@/lib/apiClient";
import { ApiRequestError } from "@/lib/apiError";
import { SESSION_COOKIE } from "@/lib/authSession";
import { signToken } from "@/lib/sessionCookie";
import { encryptCredentials } from "@/lib/session";
import type { AdminProductRequest, Product } from "@/types";

const basic = Buffer.from("admin:secret").toString("base64");

const sampleProduct: Product = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Camisa",
  description: "d",
  price: 100,
  images: [],
  categoryId: "22222222-2222-2222-2222-222222222222",
  size: "M",
  condition: "Excelente",
  brand: null,
  color: null,
  measurements: null,
  status: "disponible",
  createdAt: "2026-01-01T00:00:00Z",
  modifiedDate: null,
};

async function requestWithSession(): Promise<Request> {
  const token = await signToken({
    enc: encryptCredentials(basic),
    exp: Date.now() + 60_000,
  });
  return new Request("http://localhost/api/admin/products", {
    headers: { cookie: `${SESSION_COOKIE}=${token}` },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/admin/products", () => {
  it("returns products for an authenticated admin", async () => {
    vi.spyOn(apiClient, "listProducts").mockResolvedValue([sampleProduct]);

    const response = await GET(await requestWithSession());

    expect(response.status).toBe(200);
    const body = (await response.json()) as Product[];
    expect(body).toHaveLength(1);
  });

  it("returns 401 and clears cookies without a valid session", async () => {
    const response = await GET(
      new Request("http://localhost/api/admin/products"),
    );
    expect(response.status).toBe(401);
  });

  it("maps a backend failure through errorResponse", async () => {
    vi.spyOn(apiClient, "listProducts").mockRejectedValue(
      new ApiRequestError(502, null),
    );

    const response = await GET(await requestWithSession());
    expect(response.status).toBe(502);
  });
});

const samplePayload: AdminProductRequest = {
  name: "Camisa",
  description: "d",
  price: 100,
  categoryId: "22222222-2222-2222-2222-222222222222",
  size: "M",
  condition: "Excelente",
  brand: null,
  color: null,
  measurements: null,
};

async function postRequest(body: unknown): Promise<Request> {
  const token = await signToken({
    enc: encryptCredentials(basic),
    exp: Date.now() + 60_000,
  });
  return new Request("http://localhost/api/admin/products", {
    method: "POST",
    headers: {
      cookie: `${SESSION_COOKIE}=${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/products", () => {
  it("creates a product and returns 201", async () => {
    vi.spyOn(apiClient, "createProduct").mockResolvedValue(sampleProduct);

    const response = await POST(await postRequest(samplePayload));

    expect(response.status).toBe(201);
  });

  it("returns 401 without a valid session", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(samplePayload),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("passes a backend 400 through as 400", async () => {
    vi.spyOn(apiClient, "createProduct").mockRejectedValue(
      new ApiRequestError(400, { code: "VALIDATION", message: "no" }),
    );

    const response = await POST(await postRequest(samplePayload));
    expect(response.status).toBe(400);
  });
});
