import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { apiClient } from "@/lib/apiClient";
import { ApiRequestError } from "@/lib/apiError";
import { SESSION_COOKIE } from "@/lib/authSession";
import { signToken } from "@/lib/sessionCookie";
import { encryptCredentials } from "@/lib/session";
import type { Order } from "@/types";

const basic = Buffer.from("admin:secret").toString("base64");

const sampleOrder: Order = {
  id: "o1",
  items: [{ productId: "p1", name: "Camisa", size: "M", price: 100 }],
  customer: { name: "Ana", whatsapp: "529996384026", comments: null },
  deliveryMethod: "recoger",
  paymentMethod: "efectivo",
  address: null,
  subtotal: 100,
  shippingFee: 0,
  total: 100,
  status: "pendiente",
  createdAt: "2026-01-15T18:30:00.000Z",
  confirmedAt: null,
  completedAt: null,
  deliveredAt: null,
  cancelledAt: null,
  events: [
    { fromStatus: null, toStatus: "pendiente", occurredAt: "2026-01-15T18:30:00.000Z", actor: null },
  ],
  storeWhatsapp: "529996384026",
};

async function authed(): Promise<Request> {
  const token = await signToken({
    enc: encryptCredentials(basic),
    exp: Date.now() + 60_000,
  });
  return new Request("http://localhost/api/admin/orders", {
    headers: { cookie: `${SESSION_COOKIE}=${token}` },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/admin/orders", () => {
  it("returns a page of orders for an authenticated admin", async () => {
    vi.spyOn(apiClient, "listOrders").mockResolvedValue({
      content: [sampleOrder],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 25,
    });

    const response = await GET(await authed());
    expect(response.status).toBe(200);
    const body = (await response.json()) as { content: Order[] };
    expect(body.content).toHaveLength(1);
  });

  it("returns 401 without a session", async () => {
    const response = await GET(
      new Request("http://localhost/api/admin/orders"),
    );
    expect(response.status).toBe(401);
  });

  it("maps a backend failure through errorResponse", async () => {
    vi.spyOn(apiClient, "listOrders").mockRejectedValue(
      new ApiRequestError(502, null),
    );

    const response = await GET(await authed());
    expect(response.status).toBe(502);
  });
});
