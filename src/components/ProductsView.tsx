"use client";

import { useMemo, useState } from "react";
import type { Page, Product, ProductStatus } from "@/types";
import { useAdminResource } from "@/lib/useAdminResource";
import { ProductsTable } from "@/components/ProductsTable";
import { Pagination, type PageSize } from "@/components/Pagination";

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

  // Changing a filter/sort/size resets to the first page so the user never
  // lands on an out-of-range page.
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
        onPage={setPage}
        onSize={changeSize}
      />
    </div>
  );
}
