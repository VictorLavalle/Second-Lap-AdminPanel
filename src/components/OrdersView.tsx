"use client";

import type { Order } from "@/types";
import { useAdminResource } from "@/lib/useAdminResource";
import { useOrderAction } from "@/lib/useOrderAction";
import { actionDialogCopy } from "@/lib/orders";
import { OrderCard } from "@/components/OrderCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";

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
  const { state, reload } = useAdminResource<Order[]>("/api/admin/orders");
  const action = useOrderAction(reload);

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

  const copy = action.pending
    ? actionDialogCopy(action.pending.kind)
    : null;

  return (
    <div className="flex flex-col gap-4">
      {action.error ? (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {action.error}
        </p>
      ) : null}

      {state.data.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          busy={action.busy}
          onAction={(kind) => action.stage({ id: order.id, kind })}
        />
      ))}

      <ConfirmDialog
        open={copy !== null}
        title={copy?.title ?? ""}
        description={copy?.description ?? ""}
        confirmLabel={copy?.confirmLabel ?? ""}
        busy={action.busy}
        onConfirm={action.run}
        onClose={action.cancel}
      />
    </div>
  );
}
