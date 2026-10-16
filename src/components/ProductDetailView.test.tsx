import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ResourceState } from "@/lib/useAdminResource";
import type { Product } from "@/types";

let currentState: ResourceState<Product>;

vi.mock("@/lib/useAdminResource", () => ({
  useAdminResource: () => ({ state: currentState, reload: vi.fn() }),
}));

import { ProductDetailView } from "./ProductDetailView";

afterEach(cleanup);

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Camisa de lino",
    description: "Prenda ligera",
    price: 450,
    images: ["/uploads/a.jpg"],
    categoryId: "c1",
    size: "M",
    condition: "Excelente",
    brand: "Zara",
    color: null,
    measurements: null,
    status: "disponible",
    createdAt: "2026-01-01T00:00:00Z",
    modifiedDate: null,
    ...overrides,
  };
}

describe("ProductDetailView", () => {
  it("shows read-only fields, image and an Editar link", () => {
    currentState = { status: "ready", data: product() };
    render(<ProductDetailView productId="p1" />);

    expect(screen.getByText("Camisa de lino")).toBeInTheDocument();
    expect(screen.getByText("Prenda ligera")).toBeInTheDocument();
    expect(screen.getByText(/450\.00/)).toBeInTheDocument();
    expect(screen.getByText("Zara")).toBeInTheDocument();
    expect(screen.getByAltText("Imagen de Camisa de lino")).toHaveAttribute(
      "src",
      "http://localhost:8080/uploads/a.jpg",
    );
    expect(screen.getByRole("link", { name: "Editar" })).toHaveAttribute(
      "href",
      "/productos/p1/editar",
    );
    // No form inputs in the read-only view.
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("renders an empty-images note when there are none", () => {
    currentState = { status: "ready", data: product({ images: [] }) };
    render(<ProductDetailView productId="p1" />);
    expect(
      screen.getByText("Este producto no tiene imágenes."),
    ).toBeInTheDocument();
  });

  it("shows an error state", () => {
    currentState = { status: "error", message: "Falló" };
    render(<ProductDetailView productId="p1" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Falló");
  });
});
