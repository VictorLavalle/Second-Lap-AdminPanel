import type { ProductStatus } from "@/types";

const statusStyles: Record<ProductStatus, string> = {
  disponible:
    "bg-[var(--color-surface)] border border-[var(--color-available)] text-[var(--color-available)]",
  apartado:
    "bg-[var(--color-surface)] border border-[var(--color-reserved)] text-[var(--color-reserved)]",
  vendido:
    "bg-[var(--color-surface)] border border-[var(--color-line)] text-[var(--color-ink)]",
};

const statusLabels: Record<ProductStatus, string> = {
  disponible: "Disponible",
  apartado: "Apartado",
  vendido: "Vendido",
};

export function StatusBadge({ status }: Readonly<{ status: ProductStatus }>) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
