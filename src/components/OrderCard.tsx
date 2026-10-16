import type { Order } from "@/types";
import { formatPrice } from "@/lib/format";
import {
  DELIVERY_METHOD_LABELS,
  PAYMENT_METHOD_LABELS,
  buildWhatsappLink,
  formatOrderDate,
  isPending,
} from "@/lib/orders";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

export function OrderCard({
  order,
  busy,
  onConfirm,
  onCancel,
}: Readonly<{
  order: Order;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}>) {
  const actionable = isPending(order.status);

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <OrderStatusBadge status={order.status} />
          <time className="text-sm text-[var(--color-muted)]">
            {formatOrderDate(order.createdAt)}
          </time>
        </div>
        <a
          href={buildWhatsappLink(
            order.storeWhatsapp,
            `Hola ${order.customer.name}, sobre tu pedido en Second Lap`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          WhatsApp
        </a>
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

      <footer className="flex gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={!actionable || busy}
          className="rounded-md bg-[var(--color-available)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Confirmar
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={!actionable || busy}
          className="rounded-md border border-[var(--color-danger)] px-4 py-2 text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancelar
        </button>
      </footer>
    </article>
  );
}
