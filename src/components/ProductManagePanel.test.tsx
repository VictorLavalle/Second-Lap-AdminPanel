import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { Product } from "@/types";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

import { ProductManagePanel } from "./ProductManagePanel";

const fetchMock = vi.fn();

const product: Product = {
  id: "p1",
  name: "Camisa",
  description: "d",
  price: 100,
  images: ["http://localhost:8080/img/a.jpg"],
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

function imageFile(type = "image/jpeg", size = 1000): File {
  const file = new File(["x"], "a.jpg", { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

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

describe("ProductManagePanel images", () => {
  it("rejects an unsupported file type with an error", () => {
    render(<ProductManagePanel product={product} />);
    const input = screen.getByLabelText(/agregar imágenes/i);

    fireEvent.change(input, {
      target: { files: [imageFile("image/gif")] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/formato no permitido/i);
  });

  it("uploads valid files and refreshes", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    render(<ProductManagePanel product={product} />);

    fireEvent.change(screen.getByLabelText(/agregar imágenes/i), {
      target: { files: [imageFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: /subir imágenes/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/products/p1/images",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("shows an error when the upload fails", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    render(<ProductManagePanel product={product} />);

    fireEvent.change(screen.getByLabelText(/agregar imágenes/i), {
      target: { files: [imageFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: /subir imágenes/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/falló/i);
  });
});

describe("ProductManagePanel status", () => {
  it("PATCHes the new status", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    render(<ProductManagePanel product={product} />);

    fireEvent.change(screen.getByLabelText("Cambiar estado"), {
      target: { value: "vendido" },
    });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/products/p1/status",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
  });

  it("reverts the status on failure", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    render(<ProductManagePanel product={product} />);

    fireEvent.change(screen.getByLabelText("Cambiar estado"), {
      target: { value: "vendido" },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(/falló/i);
  });
});

describe("ProductManagePanel delete", () => {
  it("confirms via dialog then DELETEs and redirects", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    render(<ProductManagePanel product={product} />);

    fireEvent.click(screen.getByRole("button", { name: /eliminar producto/i }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/products/p1",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/productos"));
  });

  it("redirects to /login when the session is gone", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    render(<ProductManagePanel product={product} />);

    fireEvent.click(screen.getByRole("button", { name: /eliminar producto/i }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });

  it("shows an error when the delete fails", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    render(<ProductManagePanel product={product} />);

    fireEvent.click(screen.getByRole("button", { name: /eliminar producto/i }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/falló/i);
    expect(replace).not.toHaveBeenCalled();
  });
});
