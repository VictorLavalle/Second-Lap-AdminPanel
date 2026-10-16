import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { Category, Product } from "@/types";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

import { ProductForm } from "./ProductForm";

const fetchMock = vi.fn();

const categories: Category[] = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Camisas", order: 1 },
];

const existingProduct: Product = {
  id: "99999999-9999-9999-9999-999999999999",
  name: "Camisa vieja",
  description: "desc",
  price: 300,
  images: [],
  categoryId: categories[0].id,
  size: "L",
  condition: "Buen estado",
  brand: null,
  color: null,
  measurements: null,
  status: "disponible",
};

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  replace.mockReset();
  refresh.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function fillValid() {
  fireEvent.change(screen.getByLabelText("Nombre"), {
    target: { value: "Camisa nueva" },
  });
  fireEvent.change(screen.getByLabelText("Descripción"), {
    target: { value: "Una prenda" },
  });
  fireEvent.change(screen.getByLabelText("Precio (MXN)"), {
    target: { value: "450" },
  });
  fireEvent.change(screen.getByLabelText("Categoría"), {
    target: { value: categories[0].id },
  });
  fireEvent.change(screen.getByLabelText("Talla"), {
    target: { value: "M" },
  });
  fireEvent.change(screen.getByLabelText("Condición"), {
    target: { value: "Excelente" },
  });
}

describe("ProductForm (create)", () => {
  it("submits via POST so fields never fall back to a GET URL", () => {
    const { container } = render(<ProductForm categories={categories} />);
    const form = container.querySelector("form");
    expect(form?.getAttribute("method")).toBe("post");
  });

  it("shows a formatted price preview as the amount is typed", () => {
    render(<ProductForm categories={categories} />);

    fireEvent.change(screen.getByLabelText("Precio (MXN)"), {
      target: { value: "1500" },
    });

    expect(screen.getByText(/1,500\.00/)).toBeInTheDocument();
  });

  it("shows validation errors and does not submit when invalid", () => {
    render(<ProductForm categories={categories} />);

    fireEvent.submit(screen.getByRole("button", { name: "Guardar" }));

    expect(screen.getByText("El nombre es obligatorio.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("POSTs to the create endpoint and redirects on success", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 201 }));
    render(<ProductForm categories={categories} />);

    fillValid();
    fireEvent.submit(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/products",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/productos"));
  });

  it("shows a submit error on a failed response", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 400 }));
    render(<ProductForm categories={categories} />);

    fillValid();
    fireEvent.submit(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no se pudo guardar/i,
    );
  });

  it("redirects to /login on 401", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    render(<ProductForm categories={categories} />);

    fillValid();
    fireEvent.submit(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });

  it("shows a submit error when the request throws", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    render(<ProductForm categories={categories} />);

    fillValid();
    fireEvent.submit(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no se pudo guardar/i,
    );
  });

  it("strips angle brackets from the name input", () => {
    render(<ProductForm categories={categories} />);
    const name = screen.getByLabelText("Nombre") as HTMLInputElement;

    fireEvent.change(name, { target: { value: "Cami<sa>" } });

    expect(name.value).toBe("Camisa");
  });
});

describe("ProductForm (edit)", () => {
  it("prefills from the product and PUTs to the id endpoint", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    render(<ProductForm categories={categories} product={existingProduct} />);

    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe(
      "Camisa vieja",
    );

    fireEvent.submit(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/admin/products/${existingProduct.id}`,
        expect.objectContaining({ method: "PUT" }),
      ),
    );
  });
});
