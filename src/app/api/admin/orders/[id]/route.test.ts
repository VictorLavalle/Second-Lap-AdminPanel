import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { apiClient } from "@/lib/apiClient";
import { ApiRequestError } from "@/lib/apiError";
import { SESSION_COOKIE } from "@/lib/authSession";
import { signToken } from "@/lib/sessionCookie";
import { encryptCredentials } from "@/lib/session";
import type { Order } from "@/types";

const basic = Buffer.from("admin:secret").toString("base64");
const orderId = "o1";

const sampleOrder: Order = {
  id: orderId,
  items: [{ productId: "p1", name: "Camisa", size: "M", price: 100 }],
  customer: { name: "Ana", whatsapp: "52999", comments: null },
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
  storeWhatsapp: "52999",
};

function context() {
  return { params: Promise.resolve({ id: orderId }) };
}

async function authed(): Promise<Request> {
  const token = await signToken({
    enc: encryptCredentials(basic),
    exp: Date.now() + 60_000,
  });
  return new Request(`http://localhost/api/admin/orders/${orderId}`, {
    headers: { cookie: `${SESSION_COOKIE}=${token}` },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/admin/orders/[id]", () => {
  it("returns the order for an authenticated admin", async () => {
    vi.spyOn(apiClient, "getOrderById").mockResolvedValue(sampleOrder);

    const response = await GET(await authed(), context());
    expect(response.status).toBe(200);
    const body = (await response.json()) as Order;
    expect(body.id).toBe(orderId);
  });

  it("returns 401 without a session", async () => {
    const response = await GET(
      new Request(`http://localhost/api/admin/orders/${orderId}`),
      context(),
    );
    expect(response.status).toBe(401);
  });

  it("passes a backend 404 through as 404", async () => {
    vi.spyOn(apiClient, "getOrderById").mockRejectedValue(
      new ApiRequestError(404, { code: "NOT_FOUND", message: "x" }),
    );

    const response = await GET(await authed(), context());
    expect(response.status).toBe(404);
  });
});
