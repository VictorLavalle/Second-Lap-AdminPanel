import type {
  DeliveryMethod,
  OrderStatus,
  PaymentMethod,
} from "@/types";

// Pure presentation helpers for orders. Labels are Spanish; enum string values
// themselves are never translated when sent to the backend.

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
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

export function isPending(status: OrderStatus): boolean {
  return status === "pending";
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
