import type { Order, Product } from "@/types";

// Stable fingerprint of a product listing. Changes when a product is added,
// removed, or when a field the seller sees changes (status, name, price). Used
// to decide whether a background poll actually brought something new, so the
// table only re-renders / the "hay cambios" notice only appears on real change.
export function productsSignature(products: Product[]): string {
  return products
    .map((p) => [p.id, p.status, p.name, p.price].join("\u001f"))
    .join("\u001e");
}

// Order listing fingerprint: id + status + total (what the seller tracks).
export function ordersSignature(orders: Order[]): string {
  return orders
    .map((o) => [o.id, o.status, o.total].join("\u001f"))
    .join("\u001e");
}
