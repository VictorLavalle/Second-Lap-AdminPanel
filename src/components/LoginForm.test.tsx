import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LoginForm } from "./LoginForm";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

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

function fillAndSubmit(user = "admin", pass = "secret") {
  fireEvent.change(screen.getByLabelText("Usuario"), {
    target: { value: user },
  });
  fireEvent.change(screen.getByLabelText("Contraseña"), {
    target: { value: pass },
  });
  fireEvent.submit(screen.getByRole("button", { name: /entrar/i }));
}

describe("LoginForm", () => {
  it("redirects to /productos on success", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    render(<LoginForm />);

    fillAndSubmit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/productos"));
    expect(refresh).toHaveBeenCalled();
  });

  it("shows a generic message on 401 without leaking which field was wrong", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    render(<LoginForm />);

    fillAndSubmit("admin", "wrong");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/incorrectos/i);
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows a rate-limit message on 429", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 429 }));
    render(<LoginForm />);

    fillAndSubmit();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/demasiados intentos/i);
  });

  it("shows a network message when the request throws", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    render(<LoginForm />);

    fillAndSubmit();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/no se pudo conectar/i);
  });

  it("shows the fallback message for an unexpected status", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 502 }));
    render(<LoginForm />);

    fillAndSubmit();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/no se pudo conectar/i);
  });

  it("strips angle brackets from the username as it is typed", () => {
    render(<LoginForm />);
    const username = screen.getByLabelText("Usuario") as HTMLInputElement;

    fireEvent.change(username, { target: { value: "ad<script>min" } });

    expect(username.value).toBe("adscriptmin");
  });
});
