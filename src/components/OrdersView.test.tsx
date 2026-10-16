import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ResourceState } from "@/lib/useAdminResource";
import type { Order } from "@/types";

const replace = vi.fn();
const reload = vi.fn();
let currentState: ResourceState<Order[]>;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
}));

vi.mock("@/lib/useAdminResource", () => ({
  useAdminResource: () => ({ state: currentState, reload }),
}));

import { OrdersView } from "./OrdersView";

const fetchMock = vi.fn();

function pendingOrder(): Order {
  return {
    id: "o1",
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
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  replace.mockReset();
  reload.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("OrdersView states", () => {
  it("shows loading", () => {
    currentState = { status: "loading" };
    render(<OrdersView />);
    expect(screen.getByText("Cargando pedidos…")).toBeInTheDocument();
  });

  it("shows empty", () => {
    currentState = { status: "ready", data: [] };
    render(<OrdersView />);
    expect(screen.getByText("No hay pedidos todavía.")).toBeInTheDocument();
  });

  it("shows error with retry", () => {
    currentState = { status: "error", message: "Falló" };
    render(<OrdersView />);
    expect(screen.getByRole("alert")).toHaveTextContent("Falló");
    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(reload).toHaveBeenCalled();
  });
});

describe("OrdersView transitions", () => {
  it("confirms through the dialog then reloads", async () => {
    currentState = { status: "ready", data: [pendingOrder()] };
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    render(<OrdersView />);

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    // Dialog is open: two "Confirmar" buttons now (card + dialog); click the last.
    const buttons = screen.getAllByRole("button", { name: "Confirmar" });
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/orders/o1/confirm",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    await waitFor(() => expect(reload).toHaveBeenCalled());
  });

  it("shows the backend 409 message and reloads", async () => {
    currentState = { status: "ready", data: [pendingOrder()] };
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "INVALID_ORDER_TRANSITION",
          message: "El pedido no está pendiente",
        }),
        { status: 409, headers: { "content-type": "application/json" } },
      ),
    );
    render(<OrdersView />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar pedido" }));

    expect(
      await screen.findByText("El pedido no está pendiente"),
    ).toBeInTheDocument();
    await waitFor(() => expect(reload).toHaveBeenCalled());
  });

  it("redirects to /login on 401", async () => {
    currentState = { status: "ready", data: [pendingOrder()] };
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    render(<OrdersView />);

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    const buttons = screen.getAllByRole("button", { name: "Confirmar" });
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });
});
