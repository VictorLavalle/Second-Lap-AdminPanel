"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Order } from "@/types";
import { useAdminResource } from "@/lib/useAdminResource";
import { OrderCard } from "@/components/OrderCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type PendingAction = { id: string; kind: "confirm" | "cancel" } | null;

const GENERIC_ERROR = "La operación falló. Inténtalo de nuevo.";

function Loading() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando pedidos…</span>
      {[0, 1, 2].map((row) => (
        <div key={row} className="skeleton h-40 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function OrdersView() {
  const router = useRouter();
  const { state, reload } = useAdminResource<Order[]>("/api/admin/orders");
  const [pending, setPending] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function runAction(action: NonNullable<PendingAction>) {
    setBusy(true);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/admin/orders/${action.id}/${action.kind}`,
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
        setActionError(body?.message ?? GENERIC_ERROR);
        reload();
        return;
      }
      reload();
    } catch {
      setActionError(GENERIC_ERROR);
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  if (state.status === "loading") {
    return <Loading />;
  }
  if (state.status === "error") {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-md border border-[var(--color-danger)] px-4 py-10 text-center"
      >
        <p className="text-[var(--color-danger)]">{state.message}</p>
        <button
          type="button"
          onClick={reload}
          className="rounded-md border border-[var(--color-line)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-canvas)]"
        >
          Reintentar
        </button>
      </div>
    );
  }
  if (state.data.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-[var(--color-line)] px-4 py-10 text-center text-[var(--color-muted)]">
        No hay pedidos todavía.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {actionError ? (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {actionError}
        </p>
      ) : null}

      {state.data.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          busy={busy}
          onConfirm={() => setPending({ id: order.id, kind: "confirm" })}
          onCancel={() => setPending({ id: order.id, kind: "cancel" })}
        />
      ))}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === "cancel" ? "Cancelar pedido" : "Confirmar pedido"}
        description={
          pending?.kind === "cancel"
            ? "El pedido se cancelará y sus artículos volverán a estar disponibles."
            : "El pedido se confirmará y sus artículos quedarán como vendidos."
        }
        confirmLabel={pending?.kind === "cancel" ? "Cancelar pedido" : "Confirmar"}
        busy={busy}
        onConfirm={() => {
          if (pending) {
            void runAction(pending);
          }
        }}
        onClose={() => setPending(null)}
      />
    </div>
  );
}
