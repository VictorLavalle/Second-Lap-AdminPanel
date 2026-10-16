import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, PUT, DELETE } from "./route";
import { apiClient } from "@/lib/apiClient";
import { ApiRequestError } from "@/lib/apiError";
import { SESSION_COOKIE } from "@/lib/authSession";
import { signToken } from "@/lib/sessionCookie";
import { encryptCredentials } from "@/lib/session";
import type { AdminProductRequest, Product } from "@/types";

const basic = Buffer.from("admin:secret").toString("base64");
const productId = "99999999-9999-9999-9999-999999999999";

const sampleProduct: Product = {
  id: productId,
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

const payload: AdminProductRequest = {
  name: "Camisa",
  description: "d",
  price: 100,
  categoryId: sampleProduct.categoryId,
  size: "M",
  condition: "Excelente",
  brand: null,
  color: null,
  measurements: null,
};

function context() {
  return { params: Promise.resolve({ id: productId }) };
}

async function authed(method: string, body?: unknown): Promise<Request> {
  const token = await signToken({
    enc: encryptCredentials(basic),
    exp: Date.now() + 60_000,
  });
  return new Request(`http://localhost/api/admin/products/${productId}`, {
    method,
    headers: {
      cookie: `${SESSION_COOKIE}=${token}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/admin/products/[id]", () => {
  it("returns the product for an authenticated admin", async () => {
    vi.spyOn(apiClient, "getProduct").mockResolvedValue(sampleProduct);

    const response = await GET(await authed("GET"), context());
    expect(response.status).toBe(200);
  });

  it("returns 401 without a session", async () => {
    const response = await GET(
      new Request(`http://localhost/api/admin/products/${productId}`),
      context(),
    );
    expect(response.status).toBe(401);
  });

  it("maps a 404 through errorResponse", async () => {
    vi.spyOn(apiClient, "getProduct").mockRejectedValue(
      new ApiRequestError(404, { code: "NOT_FOUND", message: "x" }),
    );

    const response = await GET(await authed("GET"), context());
    expect(response.status).toBe(404);
  });
});

describe("PUT /api/admin/products/[id]", () => {
  it("updates the product and returns 200", async () => {
    vi.spyOn(apiClient, "updateProduct").mockResolvedValue(sampleProduct);

    const response = await PUT(await authed("PUT", payload), context());
    expect(response.status).toBe(200);
  });

  it("returns 401 without a session", async () => {
    const response = await PUT(
      new Request(`http://localhost/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
      context(),
    );
    expect(response.status).toBe(401);
  });

  it("passes a backend 404 through as 404", async () => {
    vi.spyOn(apiClient, "updateProduct").mockRejectedValue(
      new ApiRequestError(404, { code: "NOT_FOUND", message: "x" }),
    );

    const response = await PUT(await authed("PUT", payload), context());
    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/admin/products/[id]", () => {
  it("deletes the product and returns 204", async () => {
    vi.spyOn(apiClient, "deleteProduct").mockResolvedValue(undefined);

    const response = await DELETE(await authed("DELETE"), context());
    expect(response.status).toBe(204);
  });

  it("returns 401 without a session", async () => {
    const response = await DELETE(
      new Request(`http://localhost/api/admin/products/${productId}`, {
        method: "DELETE",
      }),
      context(),
    );
    expect(response.status).toBe(401);
  });

  it("passes a backend 404 through as 404", async () => {
    vi.spyOn(apiClient, "deleteProduct").mockRejectedValue(
      new ApiRequestError(404, { code: "NOT_FOUND", message: "x" }),
    );

    const response = await DELETE(await authed("DELETE"), context());
    expect(response.status).toBe(404);
  });
});
