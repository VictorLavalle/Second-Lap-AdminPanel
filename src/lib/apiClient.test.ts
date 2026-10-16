import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, encodeBasicCredentials } from "./apiClient";
import { ApiRequestError } from "./apiError";
import type { Product } from "@/types";

const credentials = encodeBasicCredentials("admin", "secret");

function jsonOk(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const sampleProduct: Product = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Camisa de lino",
  description: "Prenda única",
  price: 450,
  images: [],
  categoryId: "22222222-2222-2222-2222-222222222222",
  size: "M",
  condition: "Excelente",
  brand: null,
  color: null,
  measurements: null,
  status: "disponible",
};

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("encodeBasicCredentials", () => {
  it("base64-encodes user:pass", () => {
    expect(encodeBasicCredentials("admin", "secret")).toBe(
      Buffer.from("admin:secret").toString("base64"),
    );
  });
});

describe("base URL resolution", () => {
  it("fails fast when BACKEND_URL is missing in production", async () => {
    fetchMock.mockResolvedValue(jsonOk([]));
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BACKEND_URL", "");

    await expect(apiClient.listCategories()).rejects.toThrow(
      /BACKEND_URL must be set in production/,
    );

    vi.unstubAllEnvs();
  });

  it("uses the configured BACKEND_URL when present", async () => {
    fetchMock.mockResolvedValue(jsonOk([]));
    vi.stubEnv("BACKEND_URL", "https://api.example.com/api/v1");

    await apiClient.listCategories();

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.com/api/v1/categories");

    vi.unstubAllEnvs();
  });
});

describe("apiClient request wiring", () => {
  it("sends the Basic auth header and no-store cache for authed calls", async () => {
    fetchMock.mockResolvedValue(jsonOk({ username: "admin" }));

    await apiClient.getAdminMe(credentials);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/admin/me");
    expect(init.headers.Authorization).toBe(`Basic ${credentials}`);
    expect(init.cache).toBe("no-store");
  });

  it("omits the Authorization header for public endpoints", async () => {
    fetchMock.mockResolvedValue(jsonOk([]));

    await apiClient.listCategories();

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("serializes JSON bodies with the right content type", async () => {
    fetchMock.mockResolvedValue(jsonOk(sampleProduct));

    await apiClient.createProduct(credentials, {
      name: "Camisa de lino",
      description: "Prenda única",
      price: 450,
      categoryId: sampleProduct.categoryId,
      size: "M",
      condition: "Excelente",
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body as string).name).toBe("Camisa de lino");
  });

  it("sends FormData without forcing a JSON content type", async () => {
    fetchMock.mockResolvedValue(jsonOk(sampleProduct));
    const form = new FormData();

    await apiClient.uploadProductImages(credentials, sampleProduct.id, form);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(`/admin/products/${sampleProduct.id}/images`);
    expect(init.body).toBe(form);
    expect(init.headers["Content-Type"]).toBeUndefined();
  });

  it("resolves to undefined for 204 responses", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(
      apiClient.deleteProduct(credentials, sampleProduct.id),
    ).resolves.toBeUndefined();
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("DELETE");
  });
});

describe("apiClient error handling", () => {
  it("throws ApiRequestError on 401 with the unauthorized flag", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await expect(apiClient.getAdminMe(credentials)).rejects.toMatchObject({
      status: 401,
    });
    await expect(
      apiClient.getAdminMe(credentials),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("surfaces the 409 transition conflict with the backend message", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "INVALID_ORDER_TRANSITION",
          message: "El pedido no está pendiente",
        }),
        { status: 409, headers: { "content-type": "application/json" } },
      ),
    );

    await expect(
      apiClient.confirmOrder(credentials, sampleProduct.id),
    ).rejects.toMatchObject({
      status: 409,
      code: "INVALID_ORDER_TRANSITION",
      message: "El pedido no está pendiente",
    });
  });

  it("captures Retry-After on 429", async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 429, headers: { "retry-after": "45" } }),
    );

    await expect(apiClient.listOrders(credentials)).rejects.toMatchObject({
      status: 429,
      retryAfterSeconds: 45,
    });
  });
});

describe("apiClient admin methods", () => {
  it("confirms an order via PATCH", async () => {
    fetchMock.mockResolvedValue(jsonOk({ ...sampleProduct, status: "vendido" }));

    await apiClient.confirmOrder(credentials, "order-1");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/admin/orders/order-1/confirm");
    expect(init.method).toBe("PATCH");
  });

  it("cancels an order via PATCH", async () => {
    fetchMock.mockResolvedValue(jsonOk(sampleProduct));

    await apiClient.cancelOrder(credentials, "order-2");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/admin/orders/order-2/cancel");
    expect(init.method).toBe("PATCH");
  });

  it("updates product status via PATCH with the status body", async () => {
    fetchMock.mockResolvedValue(jsonOk({ ...sampleProduct, status: "apartado" }));

    await apiClient.updateProductStatus(credentials, sampleProduct.id, "apartado");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(`/admin/products/${sampleProduct.id}/status`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ status: "apartado" });
  });

  it("updates a product via PUT", async () => {
    fetchMock.mockResolvedValue(jsonOk(sampleProduct));

    await apiClient.updateProduct(credentials, sampleProduct.id, {
      name: "Nueva",
      description: "desc",
      price: 10,
      categoryId: sampleProduct.categoryId,
      size: "S",
      condition: "Buen estado",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(`/admin/products/${sampleProduct.id}`);
    expect(init.method).toBe("PUT");
  });

  it("lists products from the public endpoint", async () => {
    fetchMock.mockResolvedValue(jsonOk([sampleProduct]));

    await expect(apiClient.listProducts()).resolves.toHaveLength(1);
  });

  it("gets a single product by id", async () => {
    fetchMock.mockResolvedValue(jsonOk(sampleProduct));

    await apiClient.getProduct(sampleProduct.id);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain(`/products/${sampleProduct.id}`);
  });

  it("gets a single order by id with the Basic header", async () => {
    fetchMock.mockResolvedValue(jsonOk({ id: "o1" }));

    await apiClient.getOrderById(credentials, "o1");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/admin/orders/o1");
    expect(init.headers.Authorization).toBe(`Basic ${credentials}`);
  });

  it("completes an order via PATCH", async () => {
    fetchMock.mockResolvedValue(jsonOk({ id: "o1" }));

    await apiClient.completeOrder(credentials, "o1");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/admin/orders/o1/complete");
    expect(init.method).toBe("PATCH");
  });

  it("delivers an order via PATCH", async () => {
    fetchMock.mockResolvedValue(jsonOk({ id: "o1" }));

    await apiClient.deliverOrder(credentials, "o1");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/admin/orders/o1/deliver");
    expect(init.method).toBe("PATCH");
  });
});
