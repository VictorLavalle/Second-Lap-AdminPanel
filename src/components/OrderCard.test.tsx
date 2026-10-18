import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OrderCard } from "./OrderCard";
import type { Order, OrderStatus } from "@/types";

afterEach(cleanup);

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "o1",
    items: [{ productId: "p1", name: "Camisa", size: "M", price: 100 }],
    customer: { name: "Ana", whatsapp: "529996384026", comments: "Sin prisa" },
    deliveryMethod: "domicilio",
    paymentMethod: "transferencia",
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
    ...overrides,
  };
}

describe("OrderCard", () => {
  it("renders customer, items, totals and a detail link (no WhatsApp on the card)", () => {
    render(<OrderCard order={order()} busy={false} onAction={vi.fn()} />);

    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Sin prisa")).toBeInTheDocument();
    expect(screen.getByText(/Camisa/)).toBeInTheDocument();
    expect(screen.getByText("$150")).toBeInTheDocument();

    // WhatsApp moved to the detail view's Cliente section; not on the card.
    expect(screen.queryByRole("link", { name: /whatsapp/i })).toBeNull();
    expect(
      screen.getByRole("link", { name: /ver detalle del pedido/i }),
    ).toHaveAttribute("href", "/pedidos/o1");
  });

  it("advances status via the dropdown and cancels via the header button", () => {
    const onAction = vi.fn();
    render(<OrderCard order={order()} busy={false} onAction={onAction} />);

    // Status dropdown offers the forward transition (pendiente -> confirmado).
    fireEvent.change(screen.getByRole("combobox", { name: "Cambiar estado" }), {
      target: { value: "confirm" },
    });
    expect(onAction).toHaveBeenCalledWith("confirm");

    // Cancel is a separate header button.
    fireEvent.click(screen.getByRole("button", { name: "Cancelar pedido" }));
    expect(onAction).toHaveBeenCalledWith("cancel");
  });

  it("offers Completar in the dropdown and allows cancel for confirmado", () => {
    render(
      <OrderCard order={order({ status: "confirmado" })} busy={false} onAction={vi.fn()} />,
    );
    expect(
      screen.getByRole("option", { name: "Completado" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancelar pedido" }),
    ).toBeInTheDocument();
  });

  it("offers Entregar in the dropdown for completado", () => {
    render(
      <OrderCard order={order({ status: "completado" })} busy={false} onAction={vi.fn()} />,
    );
    expect(screen.getByRole("option", { name: "Entregado" })).toBeInTheDocument();
  });

  it("disables the dropdown and hides cancel for terminal states", () => {
    const terminal: OrderStatus[] = ["entregado", "cancelado"];
    for (const status of terminal) {
      cleanup();
      render(<OrderCard order={order({ status })} busy={false} onAction={vi.fn()} />);
      expect(screen.getByRole("combobox", { name: "Cambiar estado" })).toBeDisabled();
      expect(
        screen.queryByRole("button", { name: "Cancelar pedido" }),
      ).toBeNull();
    }
  });

  it("omits the address block when there is no address", () => {
    render(
      <OrderCard order={order({ address: null })} busy={false} onAction={vi.fn()} />,
    );
    expect(screen.queryByText(/Calle 1/)).not.toBeInTheDocument();
  });
});
