"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderActionKind } from "@/lib/orders";
import { readErrorRef, withErrorRef } from "@/lib/errorRef";

const GENERIC_ERROR = "Ocurrió un error inesperado. Inténtalo de nuevo.";

export interface PendingOrderAction {
  id: string;
  kind: OrderActionKind;
}

// Encapsulates the confirm-dialog-driven order transition: it PATCHes the BFF
// endpoint for the chosen action, surfaces the backend's Spanish 409 message if
// the state changed, redirects on 401, and calls onSuccess to refresh. UI only
// decides which action to stage; this hook owns the request lifecycle.
export function useOrderAction(onSuccess: () => void): {
  pending: PendingOrderAction | null;
  busy: boolean;
  error: string | null;
  stage: (action: PendingOrderAction) => void;
  cancel: () => void;
  run: () => void;
} {
  const router = useRouter();
  const [pending, setPending] = useState<PendingOrderAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!pending) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/orders/${pending.id}/${pending.kind}`,
        { method: "PATCH" },
      );
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { message?: string; ref?: unknown }
          | null;
        // A domain error (e.g. 409 invalid transition) carries a clear Spanish
        // message and no ref; show it as-is. Otherwise it is an unexpected
        // failure, so show the generic message with the correlation ref.
        if (typeof body?.message === "string" && body.message.length > 0) {
          setError(body.message);
        } else {
          setError(withErrorRef(GENERIC_ERROR, readErrorRef(body)));
        }
        onSuccess();
        return;
      }
      onSuccess();
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  return {
    pending,
    busy,
    error,
    stage: (action) => setPending(action),
    cancel: () => setPending(null),
    run: () => void run(),
  };
}
