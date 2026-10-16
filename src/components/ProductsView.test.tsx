import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ResourceState } from "@/lib/useAdminResource";
import type { Page, Product } from "@/types";

const reload = vi.fn();
let currentState: ResourceState<Page<Product>>;

vi.mock("@/lib/useAdminResource", () => ({
  useAdminResource: () => ({ state: currentState, reload }),
}));

import { ProductsView } from "./ProductsView";

function pageOf(content: Product[]): Page<Product> {
  return {
    content,
    totalElements: content.length,
    totalPages: content.length === 0 ? 0 : 1,
    number: 0,
    size: 25,
  };
}

afterEach(() => {
  cleanup();
  reload.mockReset();
});

function sampleProduct(): Product {
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
  };
}

describe("ProductsView", () => {
  it("shows the loading skeleton", () => {
    currentState = { status: "loading" };
    render(<ProductsView />);
    expect(screen.getByText("Cargando productos…")).toBeInTheDocument();
  });

  it("shows the empty state when there are no products", () => {
    currentState = { status: "ready", data: pageOf([]) };
    render(<ProductsView />);
    expect(screen.getByText("No hay productos todavía.")).toBeInTheDocument();
  });

  it("renders the table when products are present", () => {
    currentState = { status: "ready", data: pageOf([sampleProduct()]) };
    render(<ProductsView />);
    expect(screen.getByText("Camisa")).toBeInTheDocument();
  });

  it("renders status and sort controls", () => {
    currentState = { status: "ready", data: pageOf([sampleProduct()]) };
    render(<ProductsView />);
    expect(
      screen.getByRole("option", { name: "Todos los estados" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ordenar por")).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Más recientes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Precio: menor a mayor" }),
    ).toBeInTheDocument();
  });

  it("shows the error state and retries on click", () => {
    currentState = { status: "error", message: "Falló" };
    render(<ProductsView />);

    expect(screen.getByRole("alert")).toHaveTextContent("Falló");
    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(reload).toHaveBeenCalled();
  });
});
