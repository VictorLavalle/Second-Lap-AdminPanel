import type {
  OrderListParams,
  ProductListParams,
} from "@/lib/apiClient";
import type { OrderStatus, ProductStatus } from "@/types";

// Allowed sort properties mirror the backend whitelists. The backend already
// falls back to its default for unknown values, but validating here keeps the
// forwarded query clean and the contract explicit on the panel side.
const PRODUCT_SORT_PROPS = new Set(["price", "createdAt", "modifiedDate"]);
const ORDER_SORT_PROPS = new Set(["createdAt", "total", "status"]);

const PRODUCT_STATUSES = new Set<ProductStatus>([
  "disponible",
  "apartado",
  "vendido",
]);
const ORDER_STATUSES = new Set<OrderStatus>([
  "pendiente",
  "confirmado",
  "completado",
  "entregado",
  "cancelado",
]);

function parseSort(raw: string | null, allowedProps: Set<string>): string | undefined {
  if (!raw) {
    return undefined;
  }
  const [prop, dir] = raw.split(",", 2);
  if (!allowedProps.has(prop.trim())) {
    return undefined;
  }
  const direction = dir?.trim().toLowerCase() === "asc" ? "asc" : "desc";
  return `${prop.trim()},${direction}`;
}

export function parseProductListParams(url: string): ProductListParams {
  const params = new URL(url).searchParams;
  const status = params.get("status");
  return {
    status: PRODUCT_STATUSES.has(status as ProductStatus)
      ? (status as ProductStatus)
      : undefined,
    sort: parseSort(params.get("sort"), PRODUCT_SORT_PROPS),
  };
}

export function parseOrderListParams(url: string): OrderListParams {
  const params = new URL(url).searchParams;
  const status = params.get("status");
  return {
    status: ORDER_STATUSES.has(status as OrderStatus)
      ? (status as OrderStatus)
      : undefined,
    sort: parseSort(params.get("sort"), ORDER_SORT_PROPS),
  };
}
