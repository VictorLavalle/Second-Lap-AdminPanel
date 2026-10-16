import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ProductsTable } from "./ProductsTable";
import type { Product } from "@/types";

afterEach(cleanup);

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "1",
    name: "Camisa de lino",
    description: "d",
    price: 450,
    images: [],
    categoryId: "c1",
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

describe("ProductsTable", () => {
  it("renders a row per product with price, size and status", () => {
    render(<ProductsTable products={[product()]} />);

    expect(screen.getByText("Camisa de lino")).toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.getByText("Disponible")).toBeInTheDocument();
    expect(screen.getByText(/450/)).toBeInTheDocument();
  });

  it("links the product name to its read-only detail view", () => {
    render(<ProductsTable products={[product()]} />);
    expect(
      screen.getByRole("link", { name: "Camisa de lino" }),
    ).toHaveAttribute("href", "/productos/1");
    expect(screen.getByRole("link", { name: "Editar" })).toHaveAttribute(
      "href",
      "/productos/1/editar",
    );
  });

  it("renders an image with meaningful alt when the product has one", () => {
    render(
      <ProductsTable
        products={[product({ images: ["http://localhost:8080/img/a.jpg"] })]}
      />,
    );

    expect(
      screen.getByAltText("Miniatura de Camisa de lino"),
    ).toBeInTheDocument();
  });

  it("renders a placeholder when the product has no image", () => {
    const { container } = render(<ProductsTable products={[product()]} />);
    expect(container.querySelector("img")).toBeNull();
  });
});
