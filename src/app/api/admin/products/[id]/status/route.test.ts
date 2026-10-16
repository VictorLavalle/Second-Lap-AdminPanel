import { afterEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "./route";
import { apiClient } from "@/lib/apiClient";
import { ApiRequestError } from "@/lib/apiError";
import { SESSION_COOKIE } from "@/lib/authSession";
import { signToken } from "@/lib/sessionCookie";
import { encryptCredentials } from "@/lib/session";
import type { Product } from "@/types";

const basic = Buffer.from("admin:secret").toString("base64");
const productId = "99999999-9999-9999-9999-999999999999";

const sampleProduct: Product = {
  id: productId,
  name: "Camisa",
  description: "d",
  price: 100,
  images: [],
  categoryId: "c1",
  size: "M",
  condition: "Excelente",
  brand: null,
  color: null,
  measurements: null,
  status: "apartado",
};

function context() {
  return { params: Promise.resolve({ id: productId }) };
}

async function authed(body: unknown): Promise<Request> {
  const token = await signToken({
    enc: encryptCredentials(basic),
    exp: Date.now() + 60_000,
  });
  return new Request(
    `http://localhost/api/admin/products/${productId}/status`,
    {
      method: "PATCH",
      headers: {
        cookie: `${SESSION_COOKIE}=${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PATCH /api/admin/products/[id]/status", () => {
  it("updates the status and returns the product", async () => {
    vi.spyOn(apiClient, "updateProductStatus").mockResolvedValue(sampleProduct);

    const response = await PATCH(await authed({ status: "apartado" }), context());
    expect(response.status).toBe(200);
  });

  it("rejects an invalid status with 400", async () => {
    const response = await PATCH(await authed({ status: "nope" }), context());
    expect(response.status).toBe(400);
  });

  it("returns 401 without a session", async () => {
    const response = await PATCH(
      new Request(`http://localhost/api/admin/products/${productId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "vendido" }),
      }),
      context(),
    );
    expect(response.status).toBe(401);
  });

  it("maps a backend failure through errorResponse", async () => {
    vi.spyOn(apiClient, "updateProductStatus").mockRejectedValue(
      new ApiRequestError(404, { code: "NOT_FOUND", message: "x" }),
    );

    const response = await PATCH(await authed({ status: "vendido" }), context());
    expect(response.status).toBe(404);
  });
});
