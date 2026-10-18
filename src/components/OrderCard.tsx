import Link from "next/link";
import type { Order } from "@/types";
import { formatPrice } from "@/lib/format";
import {
  DELIVERY_METHOD_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  canCancel,
  forwardAction,
  formatOrderDate,
  type OrderActionKind,
} from "@/lib/orders";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

export function OrderCard({
  order,
  busy,
  onAction,
}: Readonly<{
  order: Order;
  busy: boolean;
  onAction: (kind: OrderActionKind) => void;
}>) {
  const forward = forwardAction(order.status);
  const cancellable = canCancel(order.status);

  return (
    <article className="relative flex flex-col gap-4 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-accent)]">
      {/* Overlay link makes the whole card navigate to the detail view. Inner
          interactive elements sit above it (relative z-10) so they still work. */}
      <Link
        href={`/pedidos/${order.id}`}
        className="absolute inset-0 z-0 rounded-lg"
        aria-label={`Ver detalle del pedido de ${order.customer.name}`}
      />
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <OrderStatusBadge status={order.status} />
          <time className="text-sm text-[var(--color-muted)]">
            {formatOrderDate(order.createdAt)}
          </time>
        </div>
        {cancellable ? (
          <button
            type="button"
            onClick={() => onAction("cancel")}
            disabled={busy}
            className="relative z-10 rounded-md border border-[var(--color-danger)] px-3 py-1.5 text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar pedido
          </button>
        ) : null}
      </header>

      <section className="grid gap-1 text-sm">
        <h3 className="font-semibold text-[var(--color-ink)]">Cliente</h3>
        <p>{order.customer.name}</p>
        <p className="text-[var(--color-muted)]">{order.customer.whatsapp}</p>
        {order.customer.comments ? (
          <p className="text-[var(--color-muted)]">
            {order.customer.comments}
          </p>
        ) : null}
      </section>

      <section className="grid gap-1 text-sm">
        <h3 className="font-semibold text-[var(--color-ink)]">Artículos</h3>
        <ul className="flex flex-col gap-1">
          {order.items.map((item) => (
            <li key={item.productId} className="flex justify-between gap-4">
              <span>
                {item.name}
                <span className="text-[var(--color-muted)]"> · {item.size}</span>
              </span>
              <span className="text-[var(--color-price)]">
                {formatPrice(item.price)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-1 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--color-muted)]">Subtotal</span>
          <span>{formatPrice(order.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-muted)]">Envío</span>
          <span>{formatPrice(order.shippingFee)}</span>
        </div>
        <div className="flex justify-between font-semibold text-[var(--color-ink)]">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </section>

      <section className="grid gap-1 text-sm">
        <p>
          <span className="text-[var(--color-muted)]">Entrega: </span>
          {DELIVERY_METHOD_LABELS[order.deliveryMethod]}
        </p>
        <p>
          <span className="text-[var(--color-muted)]">Pago: </span>
          {PAYMENT_METHOD_LABELS[order.paymentMethod]}
        </p>
        {order.address ? (
          <p className="text-[var(--color-muted)]">
            {order.address.street}, {order.address.neighborhood},{" "}
            {order.address.city}, {order.address.postalCode}
          </p>
        ) : null}
      </section>

      <footer className="relative z-10 flex flex-wrap items-center gap-3">
        {/* Status control: a dropdown advancing the order through its workflow.
            It shows the current status and offers the single valid forward
            transition; cancel lives in its own header button. Terminal states
            have no forward option, so the dropdown is disabled. */}
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-[var(--color-ink)]">
            Cambiar estado
          </span>
          <select
            value=""
            disabled={busy || forward === null}
            onChange={(event) => {
              if (event.target.value) {
                onAction(event.target.value as OrderActionKind);
              }
            }}
            className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 outline-none focus:border-[var(--color-accent)] disabled:opacity-60"
          >
            <option value="">{ORDER_STATUS_LABELS[order.status]}</option>
            {forward ? (
              <option value={forward.kind}>
                {ORDER_STATUS_LABELS[forwardTargetStatus(order.status)]}
              </option>
            ) : null}
          </select>
        </label>
        <span className="ml-auto text-sm font-medium text-[var(--color-accent)]">
          Ver detalle →
        </span>
      </footer>
    </article>
  );
}

// The status an order lands in when its forward action runs. Kept local to the
// card since it is only needed to label the dropdown's advance option.
function forwardTargetStatus(status: Order["status"]): Order["status"] {
  const next: Partial<Record<Order["status"], Order["status"]>> = {
    pendiente: "confirmado",
    confirmado: "completado",
    completado: "entregado",
  };
  return next[status] ?? status;
}
