"use client";

import type { Product } from "@/types";
import { useAdminResource } from "@/lib/useAdminResource";
import { ProductsTable } from "@/components/ProductsTable";

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

export function ProductsView() {
  const { state, reload } = useAdminResource<Product[]>("/api/admin/products");

  if (state.status === "loading") {
    return <LoadingState />;
  }
  if (state.status === "error") {
    return <ErrorState message={state.message} onRetry={reload} />;
  }
  if (state.data.length === 0) {
    return <EmptyState />;
  }
  return <ProductsTable products={state.data} />;
}
