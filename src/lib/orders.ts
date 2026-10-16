import type {
  DeliveryMethod,
  OrderStatus,
  PaymentMethod,
} from "@/types";

// Pure presentation + lifecycle helpers for orders. Labels are Spanish; enum
// string values themselves are the exact backend strings, never translated.

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  completado: "Completado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  recoger: "Recoger en tienda",
  domicilio: "Entrega a domicilio",
  paqueteria: "Paquetería",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
};

// A transition action the admin can trigger. 'kind' is the BFF endpoint segment
// (/api/admin/orders/{id}/{kind}); 'danger' flags destructive styling/wording.
export type OrderActionKind = "confirm" | "complete" | "deliver" | "cancel";

export interface OrderAction {
  kind: OrderActionKind;
  label: string;
  danger: boolean;
}

const CONFIRM: OrderAction = { kind: "confirm", label: "Confirmar", danger: false };
const COMPLETE: OrderAction = { kind: "complete", label: "Completar", danger: false };
const DELIVER: OrderAction = { kind: "deliver", label: "Entregar", danger: false };
const CANCEL: OrderAction = { kind: "cancel", label: "Cancelar", danger: true };

// Allowed transitions per current status. Terminal states map to no actions.
// Driven by a map, not chained conditionals, so it stays extensible.
const TRANSITIONS: Record<OrderStatus, OrderAction[]> = {
  pendiente: [CONFIRM, CANCEL],
  confirmado: [COMPLETE],
  completado: [DELIVER],
  entregado: [],
  cancelado: [],
};

export function allowedActions(status: OrderStatus): OrderAction[] {
  return TRANSITIONS[status];
}

export function hasActions(status: OrderStatus): boolean {
  return TRANSITIONS[status].length > 0;
}

export interface ActionDialogCopy {
  title: string;
  description: string;
  confirmLabel: string;
}

// Confirmation dialog copy per action kind, kept beside the action definitions.
const ACTION_DIALOG_COPY: Record<OrderActionKind, ActionDialogCopy> = {
  confirm: {
    title: "Confirmar pedido",
    description:
      "El pedido se confirmará y sus artículos quedarán como vendidos.",
    confirmLabel: "Confirmar",
  },
  complete: {
    title: "Completar pedido",
    description: "El pedido se marcará como completado (preparado y listo).",
    confirmLabel: "Completar",
  },
  deliver: {
    title: "Entregar pedido",
    description: "El pedido se marcará como entregado al cliente.",
    confirmLabel: "Entregar",
  },
  cancel: {
    title: "Cancelar pedido",
    description:
      "El pedido se cancelará y sus artículos volverán a estar disponibles.",
    confirmLabel: "Cancelar pedido",
  },
};

export function actionDialogCopy(kind: OrderActionKind): ActionDialogCopy {
  return ACTION_DIALOG_COPY[kind];
}

// Human label for a timeline event. The creation event (fromStatus === null)
// reads "Creado"; every other event is labeled by the status it moved into.
export function eventLabel(fromStatus: OrderStatus | null, toStatus: OrderStatus): string {
  if (fromStatus === null) {
    return "Creado";
  }
  return ORDER_STATUS_LABELS[toStatus];
}

// Builds a wa.me link from the store WhatsApp number returned on the order.
// Strips any non-digit characters so "+52 999…" and "5299…" both work.
export function buildWhatsappLink(
  storeWhatsapp: string,
  message?: string,
): string {
  const digits = storeWhatsapp.replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
  if (!message) {
    return base;
  }
  return `${base}?text=${encodeURIComponent(message)}`;
}

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatOrderDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return dateFormatter.format(date);
}
