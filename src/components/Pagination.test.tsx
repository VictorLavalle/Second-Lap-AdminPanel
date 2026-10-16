import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Pagination } from "./Pagination";

afterEach(cleanup);

describe("Pagination", () => {
  it("disables Previous on the first page and Next on the last", () => {
    const onPage = vi.fn();
    render(
      <Pagination
        page={0}
        totalPages={3}
        totalElements={30}
        size={10}
        onPage={onPage}
        onSize={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeEnabled();
    expect(screen.getByText(/Página 1 de 3 · 30 en total/)).toBeInTheDocument();
  });

  it("advances to the next page", () => {
    const onPage = vi.fn();
    render(
      <Pagination
        page={0}
        totalPages={3}
        totalElements={30}
        size={10}
        onPage={onPage}
        onSize={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(onPage).toHaveBeenCalledWith(1);
  });

  it("reports a page size change", () => {
    const onSize = vi.fn();
    render(
      <Pagination
        page={0}
        totalPages={1}
        totalElements={5}
        size={25}
        onPage={vi.fn()}
        onSize={onSize}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("25"), {
      target: { value: "50" },
    });
    expect(onSize).toHaveBeenCalledWith(50);
  });

  it("shows an empty label with no results and disables both buttons", () => {
    render(
      <Pagination
        page={0}
        totalPages={0}
        totalElements={0}
        size={10}
        onPage={vi.fn()}
        onSize={vi.fn()}
      />,
    );
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });
});
