"use client";

export const PAGE_SIZES = [10, 25, 50, 100] as const;

export type PageSize = (typeof PAGE_SIZES)[number];

// Classic pagination: previous/next with "page X of Y" and a page-size picker.
// page/totalPages are 0-based and total-count as returned by the backend.
export function Pagination({
  page,
  totalPages,
  totalElements,
  size,
  onPage,
  onSize,
  busy,
}: Readonly<{
  page: number;
  totalPages: number;
  totalElements: number;
  size: PageSize;
  onPage: (page: number) => void;
  onSize: (size: PageSize) => void;
  busy?: boolean;
}>) {
  const current = totalPages === 0 ? 0 : page;
  const hasPrev = current > 0;
  const hasNext = current < totalPages - 1;

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <label className="flex items-center gap-2">
        <span className="text-[var(--color-muted)]">Por página</span>
        <select
          value={size}
          disabled={busy}
          onChange={(event) => onSize(Number(event.target.value) as PageSize)}
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 outline-none focus:border-[var(--color-accent)]"
        >
          {PAGE_SIZES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-3">
        <span className="text-[var(--color-muted)]" aria-live="polite">
          {totalElements === 0
            ? "Sin resultados"
            : `Página ${current + 1} de ${totalPages} · ${totalElements} en total`}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onPage(current - 1)}
            disabled={busy || !hasPrev}
            className="rounded-md border border-[var(--color-line)] px-3 py-1 font-medium hover:bg-[var(--color-canvas)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => onPage(current + 1)}
            disabled={busy || !hasNext}
            className="rounded-md border border-[var(--color-line)] px-3 py-1 font-medium hover:bg-[var(--color-canvas)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </nav>
  );
}
