import type {
  OrderListParams,
  ProductListParams,
} from "@/lib/apiClient";
import type { DeliveryMethod, OrderStatus, ProductStatus } from "@/types";

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

const DELIVERY_METHODS = new Set<DeliveryMethod>([
  "recoger",
  "domicilio",
  "paqueteria",
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

const ALLOWED_SIZES = new Set([10, 25, 50, 100]);

// Mirrors the backend's clamp: unknown size -> undefined (backend applies its
// default 25), negative page -> 0. Keeps the forwarded query clean.
function parsePage(raw: string | null): number | undefined {
  if (raw === null) {
    return undefined;
  }
  const page = Number.parseInt(raw, 10);
  return Number.isInteger(page) && page >= 0 ? page : 0;
}

function parseSize(raw: string | null): number | undefined {
  if (raw === null) {
    return undefined;
  }
  const size = Number.parseInt(raw, 10);
  return ALLOWED_SIZES.has(size) ? size : undefined;
}

export function parseProductListParams(url: string): ProductListParams {
  const params = new URL(url).searchParams;
  const status = params.get("status");
  return {
    status: PRODUCT_STATUSES.has(status as ProductStatus)
      ? (status as ProductStatus)
      : undefined,
    sort: parseSort(params.get("sort"), PRODUCT_SORT_PROPS),
    page: parsePage(params.get("page")),
    size: parseSize(params.get("size")),
  };
}

export function parseOrderListParams(url: string): OrderListParams {
  const params = new URL(url).searchParams;
  const status = params.get("status");
  const deliveryMethod = params.get("deliveryMethod");
  const q = params.get("q")?.trim();
  return {
    status: ORDER_STATUSES.has(status as OrderStatus)
      ? (status as OrderStatus)
      : undefined,
    deliveryMethod: DELIVERY_METHODS.has(deliveryMethod as DeliveryMethod)
      ? (deliveryMethod as DeliveryMethod)
      : undefined,
    // Free text; forwarded as-is (the backend tolerates no-match/garbage).
    q: q ? q : undefined,
    sort: parseSort(params.get("sort"), ORDER_SORT_PROPS),
    page: parsePage(params.get("page")),
    size: parseSize(params.get("size")),
  };
}
