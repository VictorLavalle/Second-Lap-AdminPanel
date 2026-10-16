import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OrderCard } from "./OrderCard";
import type { Order } from "@/types";

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
    status: "pending",
    createdAt: "2026-01-15T18:30:00.000Z",
    storeWhatsapp: "529996384026",
    ...overrides,
  };
}

describe("OrderCard", () => {
  it("renders customer, items, totals and a wa.me link", () => {
    render(
      <OrderCard order={order()} busy={false} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Sin prisa")).toBeInTheDocument();
    expect(screen.getByText(/Camisa/)).toBeInTheDocument();
    expect(screen.getByText("$150")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "WhatsApp" });
    expect(link).toHaveAttribute("href", expect.stringContaining("wa.me/529996384026"));
  });

  it("enables confirm/cancel for pending orders and fires callbacks", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <OrderCard order={order()} busy={false} onConfirm={onConfirm} onCancel={onCancel} />,
    );

    const confirm = screen.getByRole("button", { name: "Confirmar" });
    const cancel = screen.getByRole("button", { name: "Cancelar" });
    expect(confirm).toBeEnabled();
    expect(cancel).toBeEnabled();

    fireEvent.click(confirm);
    fireEvent.click(cancel);
    expect(onConfirm).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it("disables actions for non-pending orders", () => {
    render(
      <OrderCard
        order={order({ status: "confirmed" })}
        busy={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  });

  it("omits the address block when there is no address", () => {
    render(
      <OrderCard
        order={order({ address: null })}
        busy={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Calle 1/)).not.toBeInTheDocument();
  });
});
