import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

afterEach(cleanup);

describe("StatusBadge", () => {
  it("renders the Spanish label for each status", () => {
    const { rerender } = render(<StatusBadge status="disponible" />);
    expect(screen.getByText("Disponible")).toBeInTheDocument();

    rerender(<StatusBadge status="apartado" />);
    expect(screen.getByText("Apartado")).toBeInTheDocument();

    rerender(<StatusBadge status="vendido" />);
    expect(screen.getByText("Vendido")).toBeInTheDocument();
  });
});
