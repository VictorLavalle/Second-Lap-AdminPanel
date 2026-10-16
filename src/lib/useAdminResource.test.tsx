import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useAdminResource } from "./useAdminResource";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const fetchMock = vi.fn();

function Probe() {
  const { state, reload } = useAdminResource<{ value: number }>(
    "/api/admin/thing",
  );
  return (
    <div>
      <span data-testid="state">{state.status}</span>
      <span data-testid="message">
        {state.status === "error" ? state.message : ""}
      </span>
      <button type="button" onClick={reload}>
        reload
      </button>
    </div>
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  replace.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useAdminResource", () => {
  it("resolves to ready on a successful fetch", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ value: 1 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    render(<Probe />);

    await waitFor(() =>
      expect(screen.getByTestId("state")).toHaveTextContent("ready"),
    );
  });

  it("redirects to /login on 401", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    render(<Probe />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });

  it("surfaces an error state on a non-ok response", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    render(<Probe />);

    await waitFor(() =>
      expect(screen.getByTestId("state")).toHaveTextContent("error"),
    );
  });

  it("surfaces an error state when fetch throws", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    render(<Probe />);

    await waitFor(() =>
      expect(screen.getByTestId("state")).toHaveTextContent("error"),
    );
  });

  it("appends the correlation ref when a 5xx carries one", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "server_error", ref: "corr-xyz" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );

    render(<Probe />);

    await waitFor(() =>
      expect(screen.getByTestId("message")).toHaveTextContent("Ref: corr-xyz"),
    );
  });

  it("shows the generic message without 'Ref:' when there is no correlationId", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    render(<Probe />);

    await waitFor(() =>
      expect(screen.getByTestId("state")).toHaveTextContent("error"),
    );
    expect(screen.getByTestId("message")).not.toHaveTextContent("Ref:");
  });

  it("refetches when reload is called", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    render(<Probe />);
    await waitFor(() =>
      expect(screen.getByTestId("state")).toHaveTextContent("error"),
    );

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ value: 2 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "reload" }));

    await waitFor(() =>
      expect(screen.getByTestId("state")).toHaveTextContent("ready"),
    );
  });
});
