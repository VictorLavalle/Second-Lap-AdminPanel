import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ResourceState } from "@/lib/useAdminResource";
import type { Category, Product } from "@/types";

const states = new Map<string, ResourceState<unknown>>();

vi.mock("@/lib/useAdminResource", () => ({
  useAdminResource: (path: string) => ({
    state: states.get(path) ?? { status: "loading" },
    reload: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

import { ProductCreateView, ProductEditView } from "./ProductFormView";

const categories: Category[] = [{ id: "c1", name: "Camisas", order: 1 }];

const product: Product = {
  id: "p1",
  name: "Camisa",
  description: "d",
  price: 100,
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
};

afterEach(() => {
  cleanup();
  states.clear();
});

describe("ProductCreateView", () => {
  it("shows loading while categories load", () => {
    states.set("/api/admin/categories", { status: "loading" });
    render(<ProductCreateView />);
    expect(screen.getByText("Cargando formulario…")).toBeInTheDocument();
  });

  it("shows an error when categories fail", () => {
    states.set("/api/admin/categories", {
      status: "error",
      message: "Falló",
    });
    render(<ProductCreateView />);
    expect(screen.getByRole("alert")).toHaveTextContent("Falló");
  });

  it("renders the form when categories are ready", () => {
    states.set("/api/admin/categories", { status: "ready", data: categories });
    render(<ProductCreateView />);
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
  });
});

describe("ProductEditView", () => {
  it("shows loading until both resources resolve", () => {
    states.set("/api/admin/categories", { status: "ready", data: categories });
    states.set("/api/admin/products/p1", { status: "loading" });
    render(<ProductEditView productId="p1" />);
    expect(screen.getByText("Cargando formulario…")).toBeInTheDocument();
  });

  it("surfaces a product load error", () => {
    states.set("/api/admin/categories", { status: "ready", data: categories });
    states.set("/api/admin/products/p1", {
      status: "error",
      message: "No encontrado",
    });
    render(<ProductEditView productId="p1" />);
    expect(screen.getByRole("alert")).toHaveTextContent("No encontrado");
  });

  it("renders the prefilled form when both are ready", () => {
    states.set("/api/admin/categories", { status: "ready", data: categories });
    states.set("/api/admin/products/p1", { status: "ready", data: product });
    render(<ProductEditView productId="p1" />);
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe(
      "Camisa",
    );
  });
});
