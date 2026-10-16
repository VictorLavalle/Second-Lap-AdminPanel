"use client";

import { useRouter } from "next/navigation";
import { useState, type SyntheticEvent } from "react";
import { sanitizeText } from "@/lib/sanitize";

const GENERIC_ERROR = "Usuario o contraseña incorrectos.";
const RATE_LIMIT_ERROR =
  "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
const NETWORK_ERROR = "No se pudo conectar. Inténtalo de nuevo.";

function messageForStatus(status: number): string {
  if (status === 429) {
    return RATE_LIMIT_ERROR;
  }
  if (status === 401) {
    return GENERIC_ERROR;
  }
  return NETWORK_ERROR;
}

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        setError(messageForStatus(response.status));
        return;
      }
      router.replace("/productos");
      router.refresh();
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    // method="post": if the form is submitted before React hydrates (JS slow or
    // blocked), the browser falls back to a native submit. Without a method it
    // defaults to GET and serializes the password into the URL (history, Referer,
    // proxy logs). POST keeps credentials out of the URL; the JS path below never
    // triggers it because handleSubmit calls preventDefault.
    <form
      onSubmit={handleSubmit}
      method="post"
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="username"
          className="text-sm font-medium text-[var(--color-ink)]"
        >
          Usuario
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(event) =>
            setUsername(sanitizeText(event.target.value, 100))
          }
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-sm font-medium text-[var(--color-ink)]"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-md bg-[var(--color-accent)] px-4 py-2 font-medium text-white transition hover:bg-[var(--color-accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
