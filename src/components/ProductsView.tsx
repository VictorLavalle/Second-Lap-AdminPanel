"use client";

import { useCallback, useMemo, useState } from "react";
import type { Page, Product, ProductStatus } from "@/types";
import { useAdminResource } from "@/lib/useAdminResource";
import { useAdminPolling } from "@/lib/useAdminPolling";
import { productsSignature } from "@/lib/listSignature";
import { ProductsTable } from "@/components/ProductsTable";
import { Pagination, type PageSize } from "@/components/Pagination";
import { RefreshNotice } from "@/components/RefreshNotice";

function LoadingState() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando productos…</span>
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="skeleton h-14 w-full rounded-md" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <p className="rounded-md border border-dashed border-[var(--color-line)] px-4 py-10 text-center text-[var(--color-muted)]">
      No hay productos todavía.
    </p>
  );
}

function ErrorState({
  message,
  onRetry,
}: Readonly<{ message: string; onRetry: () => void }>) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-md border border-[var(--color-danger)] px-4 py-10 text-center"
    >
      <p className="text-[var(--color-danger)]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md border border-[var(--color-line)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-canvas)]"
      >
        Reintentar
      </button>
    </div>
  );
}

type StatusFilter = ProductStatus | "all";

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Todos los estados" },
  { value: "disponible", label: "Disponible" },
  { value: "apartado", label: "Apartado" },
  { value: "vendido", label: "Vendido" },
];

const SORT_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "createdAt,desc", label: "Más recientes" },
  { value: "createdAt,asc", label: "Más antiguos" },
  { value: "price,asc", label: "Precio: menor a mayor" },
  { value: "price,desc", label: "Precio: mayor a menor" },
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

export function ProductsView() {
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
    return `/api/admin/products?${query.toString()}`;
  }, [status, sort, page, size]);

  const { state, reload } = useAdminResource<Page<Product>>(path);
  const [hasChanges, setHasChanges] = useState(false);

  // Live refresh is only "safe" (won't move the view under the user) when the
  // table is in a neutral view: no status filter and on the first page. With a
  // filter or on a later page, a silent swap would lose their place, so instead
  // we surface a discreet "hay cambios · actualizar" notice.
  const isNeutral = status === "all" && page === 0;

  const currentSignature =
    state.status === "ready" ? productsSignature(state.data.content) : "";

  const onTick = useCallback(() => {
    if (isNeutral) {
      reload({ silent: true });
      return;
    }
    // Non-neutral: peek for changes without disturbing the current view.
    void (async () => {
      try {
        const response = await fetch(path, { credentials: "same-origin" });
        if (!response.ok) {
          return;
        }
        const page = (await response.json()) as Page<Product>;
        if (productsSignature(page.content) !== currentSignature) {
          setHasChanges(true);
        }
      } catch {
        // Ignore transient poll failures; the next tick retries.
      }
    })();
  }, [isNeutral, reload, path, currentSignature]);

  useAdminPolling(onTick);

  function applyChanges() {
    setHasChanges(false);
    reload();
  }

  // Changing a filter/sort/size resets to the first page so the user never
  // lands on an out-of-range page.
  function changeStatus(next: StatusFilter) {
    setStatus(next);
    setPage(0);
    setHasChanges(false);
  }
  function changeSort(next: string) {
    setSort(next);
    setPage(0);
    setHasChanges(false);
  }
  function changeSize(next: PageSize) {
    setSize(next);
    setPage(0);
    setHasChanges(false);
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
        <LoadingState />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="flex flex-col gap-4">
        {controls}
        <ErrorState message={state.message} onRetry={reload} />
      </div>
    );
  }

  const result = state.data;
  return (
    <div className="flex flex-col gap-4">
      {controls}
      {hasChanges ? <RefreshNotice onRefresh={applyChanges} /> : null}
      {result.content.length === 0 ? (
        <EmptyState />
      ) : (
        <ProductsTable products={result.content} />
      )}
      <Pagination
        page={result.number}
        totalPages={result.totalPages}
        totalElements={result.totalElements}
        size={size}
        onPage={(next) => {
          setPage(next);
          setHasChanges(false);
        }}
        onSize={changeSize}
      />
    </div>
  );
}
