"use client";

import type { Order } from "@/types";
import { useAdminResource } from "@/lib/useAdminResource";
import { useOrderAction } from "@/lib/useOrderAction";
import { formatPrice } from "@/lib/format";
import {
  DELIVERY_METHOD_LABELS,
  PAYMENT_METHOD_LABELS,
  actionDialogCopy,
  allowedActions,
  buildWhatsappLink,
  eventActorLabel,
  eventLabel,
  formatOrderDate,
} from "@/lib/orders";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Milestone {
  label: string;
  at: string | null;
}

function milestones(order: Order): Milestone[] {
  return [
    { label: "Creado", at: order.createdAt },
    { label: "Confirmado", at: order.confirmedAt },
    { label: "Completado", at: order.completedAt },
    { label: "Entregado", at: order.deliveredAt },
    { label: "Cancelado", at: order.cancelledAt },
  ];
}

function Loading() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando pedido…</span>
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="skeleton h-16 w-full rounded-md" />
      ))}
    </div>
  );
}

export function OrderDetailView({ orderId }: Readonly<{ orderId: string }>) {
  const { state, reload } = useAdminResource<Order>(
    `/api/admin/orders/${orderId}`,
  );
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
          onClick={() => reload()}
          className="rounded-md border border-[var(--color-line)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-canvas)]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const order = state.data;
  const actions = allowedActions(order.status);
  const copy = action.pending ? actionDialogCopy(action.pending.kind) : null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <OrderStatusBadge status={order.status} />
          <time className="text-sm text-[var(--color-muted)]">
            {formatOrderDate(order.createdAt)}
          </time>
        </div>
      </header>

      <p className="text-xs text-[var(--color-muted)]">Pedido {order.id}</p>

      {action.error ? (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {action.error}
        </p>
      ) : null}

      {actions.length > 0 ? (
        <section className="flex flex-wrap gap-3">
          {actions.map((transition) => (
            <button
              key={transition.kind}
              type="button"
              onClick={() =>
                action.stage({ id: order.id, kind: transition.kind })
              }
              disabled={action.busy}
              className={
                transition.danger
                  ? "rounded-md border border-[var(--color-danger)] px-4 py-2 text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/5 disabled:opacity-50"
                  : "rounded-md bg-[var(--color-available)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              }
            >
              {transition.label}
            </button>
          ))}
        </section>
      ) : (
        <p className="text-sm text-[var(--color-muted)]">
          Este pedido está en un estado final; no hay acciones disponibles.
        </p>
      )}

      <section className="grid gap-1 text-sm">
        <h2 className="font-semibold text-[var(--color-ink)]">Cliente</h2>
        <p>{order.customer.name}</p>
        <p className="text-[var(--color-muted)]">{order.customer.whatsapp}</p>
        {order.customer.comments ? (
          <p className="text-[var(--color-muted)]">{order.customer.comments}</p>
        ) : null}
        <a
          href={buildWhatsappLink(
            order.storeWhatsapp,
            `Hola ${order.customer.name}, sobre tu pedido en Second Lap`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex w-fit items-center rounded-md border border-[var(--color-accent)] px-3 py-1.5 font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5"
        >
          Contactar por WhatsApp
        </a>
      </section>

      <section className="grid gap-1 text-sm">
        <h2 className="font-semibold text-[var(--color-ink)]">Artículos</h2>
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
        <div className="mt-2 flex justify-between">
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
        <h2 className="font-semibold text-[var(--color-ink)]">Entrega y pago</h2>
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

      <section className="grid gap-2 text-sm">
        <h2 className="font-semibold text-[var(--color-ink)]">Hitos</h2>
        <ul className="flex flex-col gap-1">
          {milestones(order)
            .filter((milestone) => milestone.at !== null)
            .map((milestone) => (
              <li key={milestone.label} className="flex justify-between gap-4">
                <span className="text-[var(--color-muted)]">
                  {milestone.label}
                </span>
                <span>{formatOrderDate(milestone.at as string)}</span>
              </li>
            ))}
        </ul>
      </section>

      <section className="grid gap-2 text-sm">
        <h2 className="font-semibold text-[var(--color-ink)]">Historial</h2>
        <ol className="flex flex-col gap-2 border-l border-[var(--color-line)] pl-4">
          {order.events.map((event, index) => {
            const actor = eventActorLabel(event.actor);
            return (
              <li
                key={`${event.toStatus}-${event.occurredAt}-${index}`}
                className="flex flex-col"
              >
                <span className="font-medium text-[var(--color-ink)]">
                  {eventLabel(event.fromStatus, event.toStatus)}
                  {actor ? (
                    <span className="font-normal text-[var(--color-muted)]">
                      {" · "}
                      {actor}
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-[var(--color-muted)]">
                  {formatOrderDate(event.occurredAt)}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

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
