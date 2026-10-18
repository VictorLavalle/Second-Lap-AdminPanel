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
  it("submits via POST so credentials never fall back to a GET URL", () => {
    const { container } = render(<LoginForm />);
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    // A native submit (before hydration) must not serialize the password into
    // the URL. method=post is the guard; GET is the dangerous default.
    expect(form?.getAttribute("method")).toBe("post");
  });

  it("submits when Enter is pressed in a field (not only via the button)", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Usuario"), {
      target: { value: "admin" },
    });
    const password = screen.getByLabelText("Contraseña");
    fireEvent.change(password, { target: { value: "secret" } });
    fireEvent.keyDown(password, { key: "Enter" });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/login",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/productos"));
  });

  it("redirects to /productos on success", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    render(<LoginForm />);

    fillAndSubmit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/productos"));
    // No router.refresh(): a second navigation here raced the replace() stream
    // and surfaced "CLOSED writable stream" on slower devices.
    expect(refresh).not.toHaveBeenCalled();
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
