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
let currentState: ResourceState<Order>;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
}));

vi.mock("@/lib/useAdminResource", () => ({
  useAdminResource: () => ({ state: currentState, reload }),
}));

import { OrderDetailView } from "./OrderDetailView";

const fetchMock = vi.fn();

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "o1",
    items: [{ productId: "p1", name: "Camisa", size: "M", price: 100 }],
    customer: { name: "Ana", whatsapp: "52999", comments: "Nota" },
    deliveryMethod: "domicilio",
    paymentMethod: "tarjeta",
    address: {
      street: "Calle 1",
      betweenStreets: null,
      neighborhood: "Centro",
      shippingFee: 50,
      city: "Mérida",
      state: null,
      postalCode: "97000",
      references: null,
      mapsLink: null,
    },
    subtotal: 100,
    shippingFee: 50,
    total: 150,
    status: "confirmado",
    createdAt: "2026-01-15T18:30:00.000Z",
    confirmedAt: "2026-01-15T19:00:00.000Z",
    completedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    events: [
      { fromStatus: null, toStatus: "pendiente", occurredAt: "2026-01-15T18:30:00.000Z", actor: null },
      { fromStatus: "pendiente", toStatus: "confirmado", occurredAt: "2026-01-15T19:00:00.000Z", actor: "ana.admin" },
    ],
    storeWhatsapp: "52999",
    ...overrides,
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

describe("OrderDetailView states", () => {
  it("shows loading", () => {
    currentState = { status: "loading" };
    render(<OrderDetailView orderId="o1" />);
    expect(screen.getByText("Cargando pedido…")).toBeInTheDocument();
  });

  it("shows error with retry", () => {
    currentState = { status: "error", message: "No encontrado" };
    render(<OrderDetailView orderId="o1" />);
    expect(screen.getByRole("alert")).toHaveTextContent("No encontrado");
    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(reload).toHaveBeenCalled();
  });
});

describe("OrderDetailView content", () => {
  it("renders customer, items, totals, delivery/payment and the order id", () => {
    currentState = { status: "ready", data: order() };
    render(<OrderDetailView orderId="o1" />);

    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText(/Camisa/)).toBeInTheDocument();
    expect(screen.getByText("$150")).toBeInTheDocument();
    expect(screen.getByText(/Pedido o1/)).toBeInTheDocument();
  });

  it("renders only milestones that have a timestamp", () => {
    currentState = { status: "ready", data: order() };
    render(<OrderDetailView orderId="o1" />);

    // Creado and Confirmado have timestamps; Completado/Entregado/Cancelado do not.
    const hitos = screen.getByText("Hitos").closest("section");
    expect(hitos).not.toBeNull();
    expect(hitos?.textContent).toContain("Creado");
    expect(hitos?.textContent).toContain("Confirmado");
    expect(hitos?.textContent).not.toContain("Entregado");
  });

  it("renders the events timeline with the creation event as Creado", () => {
    currentState = { status: "ready", data: order() };
    render(<OrderDetailView orderId="o1" />);

    const historial = screen.getByText("Historial").closest("section");
    expect(historial?.textContent).toContain("Creado");
    expect(historial?.textContent).toContain("Confirmado");
  });

  it("shows the actor on a transition event but omits attribution on creation", () => {
    currentState = { status: "ready", data: order() };
    render(<OrderDetailView orderId="o1" />);

    const historial = screen.getByText("Historial").closest("section");
    // Transition event carries the admin username.
    expect(historial?.textContent).toContain("por ana.admin");
    // Creation event has no actor, so "por null" must never appear.
    expect(historial?.textContent).not.toContain("por null");
  });

  it("renders no actor attribution when the only event is the creation event", () => {
    currentState = {
      status: "ready",
      data: order({
        status: "pendiente",
        confirmedAt: null,
        events: [
          {
            fromStatus: null,
            toStatus: "pendiente",
            occurredAt: "2026-01-15T18:30:00.000Z",
            actor: null,
          },
        ],
      }),
    };
    render(<OrderDetailView orderId="o1" />);

    const historial = screen.getByText("Historial").closest("section");
    expect(historial?.textContent).not.toContain("por ");
  });
});

describe("OrderDetailView actions", () => {
  it("shows only Completar for a confirmado order", () => {
    currentState = { status: "ready", data: order({ status: "confirmado" }) };
    render(<OrderDetailView orderId="o1" />);

    expect(screen.getByRole("button", { name: "Completar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar" })).toBeNull();
  });

  it("shows a terminal message for entregado", () => {
    currentState = {
      status: "ready",
      data: order({ status: "entregado", deliveredAt: "2026-01-16T00:00:00.000Z" }),
    };
    render(<OrderDetailView orderId="o1" />);

    expect(
      screen.getByText(/estado final; no hay acciones/i),
    ).toBeInTheDocument();
  });

  it("completes through the dialog and reloads", async () => {
    currentState = { status: "ready", data: order({ status: "confirmado" }) };
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    render(<OrderDetailView orderId="o1" />);

    fireEvent.click(screen.getByRole("button", { name: "Completar" }));
    const buttons = screen.getAllByRole("button", { name: "Completar" });
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/orders/o1/complete",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    await waitFor(() => expect(reload).toHaveBeenCalled());
  });

  it("surfaces the backend 409 message when the state changed", async () => {
    currentState = { status: "ready", data: order({ status: "confirmado" }) };
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "INVALID_ORDER_TRANSITION",
          message: "El pedido no está confirmado",
        }),
        { status: 409, headers: { "content-type": "application/json" } },
      ),
    );
    render(<OrderDetailView orderId="o1" />);

    fireEvent.click(screen.getByRole("button", { name: "Completar" }));
    const buttons = screen.getAllByRole("button", { name: "Completar" });
    fireEvent.click(buttons[buttons.length - 1]);

    expect(
      await screen.findByText("El pedido no está confirmado"),
    ).toBeInTheDocument();
  });
});
