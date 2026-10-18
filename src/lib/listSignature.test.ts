import { describe, expect, it } from "vitest";
import { ordersSignature, productsSignature } from "./listSignature";
import type { Order, Product } from "@/types";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "1",
    name: "Camisa",
    description: "d",
    price: 100,
    images: [],
    categoryId: "c",
    size: "M",
    condition: "Excelente",
    brand: null,
    color: null,
    measurements: null,
    status: "disponible",
    createdAt: "2026-01-01T00:00:00Z",
    modifiedDate: null,
    ...overrides,
  };
}

describe("productsSignature", () => {
  it("is stable when nothing the seller sees changed", () => {
    expect(productsSignature([product()])).toBe(
      productsSignature([product({ description: "otra desc", images: ["x"] })]),
    );
  });

  it("changes when status, name or price changes", () => {
    const base = productsSignature([product()]);
    expect(productsSignature([product({ status: "vendido" })])).not.toBe(base);
    expect(productsSignature([product({ price: 999 })])).not.toBe(base);
    expect(productsSignature([product({ name: "Otra" })])).not.toBe(base);
  });

  it("changes when a product is added or removed", () => {
    const one = productsSignature([product()]);
    const two = productsSignature([product(), product({ id: "2" })]);
    expect(one).not.toBe(two);
  });
});

describe("ordersSignature", () => {
  const order = (o: Partial<Order> = {}): Order =>
    ({ id: "o1", status: "pendiente", total: 500, ...o }) as Order;

  it("changes when an order status changes", () => {
    expect(ordersSignature([order()])).not.toBe(
      ordersSignature([order({ status: "confirmado" })]),
    );
  });
});
