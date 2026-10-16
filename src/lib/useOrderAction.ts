"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderActionKind } from "@/lib/orders";

const GENERIC_ERROR = "La operación falló. Inténtalo de nuevo.";

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
        // The backend returns a Spanish message for the 409 invalid transition.
        const body = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        setError(body?.message ?? GENERIC_ERROR);
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
