import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

import { AdminHeader } from "./AdminHeader";

const fetchMock = vi.fn();

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

describe("AdminHeader", () => {
  it("renders the brand name", () => {
    render(<AdminHeader />);
    expect(screen.getByText("Second Lap")).toBeInTheDocument();
  });

  it("logs out and redirects to /login", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    render(<AdminHeader />);

    fireEvent.click(screen.getByRole("button", { name: /cerrar sesión/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/logout", {
        method: "POST",
      }),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });
});
