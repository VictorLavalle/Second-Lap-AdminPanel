import type { OrderStatus } from "@/types";
import { ORDER_STATUS_LABELS } from "@/lib/orders";

const statusStyles: Record<OrderStatus, string> = {
  pendiente:
    "bg-[var(--color-surface)] border border-[var(--color-reserved)] text-[var(--color-reserved)]",
  confirmado:
    "bg-[var(--color-surface)] border border-[var(--color-gold)] text-[var(--color-gold)]",
  completado:
    "bg-[var(--color-surface)] border border-[var(--color-available)] text-[var(--color-available)]",
  entregado:
    "bg-[var(--color-available)] border border-[var(--color-available)] text-white",
  cancelado:
    "bg-[var(--color-surface)] border border-[var(--color-line)] text-[var(--color-muted)]",
};

export function OrderStatusBadge({
  status,
}: Readonly<{ status: OrderStatus }>) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] ${statusStyles[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
