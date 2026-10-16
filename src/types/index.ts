// Domain types mirror the backend contract in
// ../Second-Lap-Backend/docs/openapi.yaml. Enum values are the exact Spanish
// strings the API consumes and returns; never translate them.

export type ProductCondition = "Como nuevo" | "Excelente" | "Buen estado";

export type ProductStatus = "disponible" | "apartado" | "vendido";

export type OrderStatus =
  | "pendiente"
  | "confirmado"
  | "completado"
  | "entregado"
  | "cancelado";

export type DeliveryMethod = "recoger" | "domicilio" | "paqueteria";

export type PaymentMethod = "transferencia" | "efectivo" | "tarjeta";

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  categoryId: string;
  size: string;
  condition: ProductCondition;
  brand: string | null;
  color: string | null;
  measurements: string | null;
  status: ProductStatus;
}

// Payload for POST /admin/products and PUT /admin/products/{id}.
export interface AdminProductRequest {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  size: string;
  condition: ProductCondition;
  brand?: string | null;
  color?: string | null;
  measurements?: string | null;
}

export interface OrderItem {
  productId: string;
  name: string;
  size: string;
  price: number;
}

export interface OrderCustomer {
  name: string;
  whatsapp: string;
  comments: string | null;
}

export interface OrderShippingAddress {
  street: string;
  betweenStreets: string | null;
  neighborhood: string;
  shippingFee: number | null;
  city: string;
  state: string | null;
  postalCode: string;
  references: string | null;
  mapsLink: string | null;
}

export interface OrderEvent {
  // Null only for the creation event (null -> pendiente).
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  occurredAt: string;
  // Username of the admin who made the transition; null for the creation event
  // (done by the customer, no admin).
  actor: string | null;
}

export interface Order {
  id: string;
  items: OrderItem[];
  customer: OrderCustomer;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  address: OrderShippingAddress | null;
  subtotal: number;
  shippingFee: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  confirmedAt: string | null;
  completedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  // Status change timeline, oldest first (render as-is).
  events: OrderEvent[];
  storeWhatsapp: string;
}

export interface AdminMe {
  username: string;
}

// Error envelope returned by the backend for 4xx/5xx with a body.
export interface ApiError {
  code: string;
  message: string;
  context?: Record<string, unknown> | null;
}
