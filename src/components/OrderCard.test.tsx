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
      { fromStatus: null, toStatus: "pendiente", occurredAt: "2026-01-15T18:30:00.000Z" },
    ],
    storeWhatsapp: "529996384026",
    ...overrides,
  };
}

describe("OrderCard", () => {
  it("renders customer, items, totals, a wa.me link and a detail link", () => {
    render(<OrderCard order={order()} busy={false} onAction={vi.fn()} />);

    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Sin prisa")).toBeInTheDocument();
    expect(screen.getByText(/Camisa/)).toBeInTheDocument();
    expect(screen.getByText("$150")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me/529996384026"),
    );
    expect(screen.getByRole("link", { name: "Ver detalle" })).toHaveAttribute(
      "href",
      "/pedidos/o1",
    );
  });

  it("renders confirm and cancel for pendiente and fires onAction", () => {
    const onAction = vi.fn();
    render(<OrderCard order={order()} busy={false} onAction={onAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onAction).toHaveBeenCalledWith("confirm");
    expect(onAction).toHaveBeenCalledWith("cancel");
  });

  it("renders only Completar for confirmado", () => {
    render(
      <OrderCard order={order({ status: "confirmado" })} busy={false} onAction={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Completar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
  });

  it("renders only Entregar for completado", () => {
    render(
      <OrderCard order={order({ status: "completado" })} busy={false} onAction={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Entregar" })).toBeInTheDocument();
  });

  it("renders no action buttons for terminal states", () => {
    const terminal: OrderStatus[] = ["entregado", "cancelado"];
    for (const status of terminal) {
      cleanup();
      render(<OrderCard order={order({ status })} busy={false} onAction={vi.fn()} />);
      expect(screen.queryByRole("button")).toBeNull();
    }
  });

  it("omits the address block when there is no address", () => {
    render(
      <OrderCard order={order({ address: null })} busy={false} onAction={vi.fn()} />,
    );
    expect(screen.queryByText(/Calle 1/)).not.toBeInTheDocument();
  });
});
