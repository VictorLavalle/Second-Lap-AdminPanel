import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useOrderAction } from "./useOrderAction";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const fetchMock = vi.fn();
const onSuccess = vi.fn();

function Probe() {
  const action = useOrderAction(onSuccess);
  return (
    <div>
      <span data-testid="busy">{String(action.busy)}</span>
      <span data-testid="error">{action.error ?? ""}</span>
      <span data-testid="pending">{action.pending?.kind ?? ""}</span>
      <button type="button" onClick={() => action.stage({ id: "o1", kind: "confirm" })}>
        stage
      </button>
      <button type="button" onClick={action.run}>
        run
      </button>
      <button type="button" onClick={action.cancel}>
        cancel
      </button>
    </div>
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  replace.mockReset();
  onSuccess.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useOrderAction", () => {
  it("stages and clears a pending action", () => {
    render(<Probe />);
    fireEvent.click(screen.getByRole("button", { name: "stage" }));
    expect(screen.getByTestId("pending")).toHaveTextContent("confirm");
    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    expect(screen.getByTestId("pending")).toHaveTextContent("");
  });

  it("does nothing when run is called with no pending action", () => {
    render(<Probe />);
    fireEvent.click(screen.getByRole("button", { name: "run" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("PATCHes the staged action and calls onSuccess", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    render(<Probe />);

    fireEvent.click(screen.getByRole("button", { name: "stage" }));
    fireEvent.click(screen.getByRole("button", { name: "run" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/orders/o1/confirm",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("surfaces the backend 409 message and still refreshes", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "No se puede" }), {
        status: 409,
        headers: { "content-type": "application/json" },
      }),
    );
    render(<Probe />);

    fireEvent.click(screen.getByRole("button", { name: "stage" }));
    fireEvent.click(screen.getByRole("button", { name: "run" }));

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent("No se puede"),
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("redirects to /login on 401", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    render(<Probe />);

    fireEvent.click(screen.getByRole("button", { name: "stage" }));
    fireEvent.click(screen.getByRole("button", { name: "run" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });

  it("shows a generic error when the request throws", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    render(<Probe />);

    fireEvent.click(screen.getByRole("button", { name: "stage" }));
    fireEvent.click(screen.getByRole("button", { name: "run" }));

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent(/error inesperado/i),
    );
  });

  it("appends the correlation ref on an unexpected (5xx) error", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "server_error", ref: "corr-123" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );
    render(<Probe />);

    fireEvent.click(screen.getByRole("button", { name: "stage" }));
    fireEvent.click(screen.getByRole("button", { name: "run" }));

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent("Ref: corr-123"),
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("does not show a ref for a domain 409 error", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "El pedido no está pendiente" }), {
        status: 409,
        headers: { "content-type": "application/json" },
      }),
    );
    render(<Probe />);

    fireEvent.click(screen.getByRole("button", { name: "stage" }));
    fireEvent.click(screen.getByRole("button", { name: "run" }));

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent(
        "El pedido no está pendiente",
      ),
    );
    expect(screen.getByTestId("error")).not.toHaveTextContent("Ref:");
  });

  it("degrades to the generic message without 'Ref:' when a 5xx has no correlationId", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "server_error" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );
    render(<Probe />);

    fireEvent.click(screen.getByRole("button", { name: "stage" }));
    fireEvent.click(screen.getByRole("button", { name: "run" }));

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent(/error inesperado/i),
    );
    expect(screen.getByTestId("error")).not.toHaveTextContent("Ref:");
  });
});
