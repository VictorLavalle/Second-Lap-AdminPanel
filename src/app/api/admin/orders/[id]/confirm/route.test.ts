import { afterEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "./route";
import { apiClient } from "@/lib/apiClient";
import { ApiRequestError } from "@/lib/apiError";
import { SESSION_COOKIE } from "@/lib/authSession";
import { signToken } from "@/lib/sessionCookie";
import { encryptCredentials } from "@/lib/session";
import type { Order } from "@/types";

const basic = Buffer.from("admin:secret").toString("base64");
const orderId = "o1";

const confirmed: Order = {
  id: orderId,
  items: [],
  customer: { name: "Ana", whatsapp: "52999", comments: null },
  deliveryMethod: "recoger",
  paymentMethod: "efectivo",
  address: null,
  subtotal: 0,
  shippingFee: 0,
  total: 0,
  status: "confirmed",
  createdAt: "2026-01-15T18:30:00.000Z",
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
  return new Request(`http://localhost/api/admin/orders/${orderId}/confirm`, {
    method: "PATCH",
    headers: { cookie: `${SESSION_COOKIE}=${token}` },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PATCH /api/admin/orders/[id]/confirm", () => {
  it("confirms the order", async () => {
    vi.spyOn(apiClient, "confirmOrder").mockResolvedValue(confirmed);

    const response = await PATCH(await authed(), context());
    expect(response.status).toBe(200);
  });

  it("returns 401 without a session", async () => {
    const response = await PATCH(
      new Request(`http://localhost/api/admin/orders/${orderId}/confirm`, {
        method: "PATCH",
      }),
      context(),
    );
    expect(response.status).toBe(401);
  });

  it("passes a 409 invalid-transition through with the backend message", async () => {
    vi.spyOn(apiClient, "confirmOrder").mockRejectedValue(
      new ApiRequestError(409, {
        code: "INVALID_ORDER_TRANSITION",
        message: "El pedido no está pendiente",
      }),
    );

    const response = await PATCH(await authed(), context());
    expect(response.status).toBe(409);
    const body = (await response.json()) as { message?: string };
    expect(body.message).toBe("El pedido no está pendiente");
  });
});
