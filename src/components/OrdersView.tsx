"use client";

import { useMemo, useState } from "react";
import type { Order, OrderStatus, Page } from "@/types";
import { useAdminResource } from "@/lib/useAdminResource";
import { useOrderAction } from "@/lib/useOrderAction";
import { actionDialogCopy } from "@/lib/orders";
import { OrderCard } from "@/components/OrderCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Pagination, type PageSize } from "@/components/Pagination";

type StatusFilter = OrderStatus | "all";

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Todos los estados" },
  { value: "pendiente", label: "Pendiente" },
  { value: "confirmado", label: "Confirmado" },
  { value: "completado", label: "Completado" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
];

const SORT_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "createdAt,desc", label: "Más recientes" },
  { value: "createdAt,asc", label: "Más antiguos" },
  { value: "total,desc", label: "Total: mayor a menor" },
  { value: "total,asc", label: "Total: menor a mayor" },
];

function Controls({
  status,
  sort,
  onStatus,
  onSort,
}: Readonly<{
  status: StatusFilter;
  sort: string;
  onStatus: (value: StatusFilter) => void;
  onSort: (value: string) => void;
}>) {
  return (
    <div className="flex flex-wrap gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-[var(--color-ink)]">Estado</span>
        <select
          value={status}
          onChange={(event) => onStatus(event.target.value as StatusFilter)}
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 outline-none focus:border-[var(--color-accent)]"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-[var(--color-ink)]">Ordenar por</span>
        <select
          value={sort}
          onChange={(event) => onSort(event.target.value)}
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 outline-none focus:border-[var(--color-accent)]"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

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
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<string>("createdAt,desc");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<PageSize>(25);

  const path = useMemo(() => {
    const query = new URLSearchParams({
      sort,
      page: String(page),
      size: String(size),
    });
    if (status !== "all") {
      query.set("status", status);
    }
    return `/api/admin/orders?${query.toString()}`;
  }, [status, sort, page, size]);

  const { state, reload } = useAdminResource<Page<Order>>(path);
  const action = useOrderAction(reload);

  function changeStatus(next: StatusFilter) {
    setStatus(next);
    setPage(0);
  }
  function changeSort(next: string) {
    setSort(next);
    setPage(0);
  }
  function changeSize(next: PageSize) {
    setSize(next);
    setPage(0);
  }

  const controls = (
    <Controls
      status={status}
      sort={sort}
      onStatus={changeStatus}
      onSort={changeSort}
    />
  );

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-4">
        {controls}
        <Loading />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="flex flex-col gap-4">
        {controls}
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
      </div>
    );
  }

  const result = state.data;
  const copy = action.pending ? actionDialogCopy(action.pending.kind) : null;

  return (
    <div className="flex flex-col gap-4">
      {controls}

      {action.error ? (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {action.error}
        </p>
      ) : null}

      {result.content.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--color-line)] px-4 py-10 text-center text-[var(--color-muted)]">
          No hay pedidos para este filtro.
        </p>
      ) : (
        result.content.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            busy={action.busy}
            onAction={(kind) => action.stage({ id: order.id, kind })}
          />
        ))
      )}

      <Pagination
        page={result.number}
        totalPages={result.totalPages}
        totalElements={result.totalElements}
        size={size}
        onPage={setPage}
        onSize={changeSize}
        busy={action.busy}
      />

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
