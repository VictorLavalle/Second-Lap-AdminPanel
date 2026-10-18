import type {
  AdminMe,
  AdminProductRequest,
  Category,
  DeliveryMethod,
  Order,
  OrderStatus,
  Page,
  Product,
  ProductStatus,
} from "@/types";
import {
  ApiRequestError,
  parseApiError,
  parseRetryAfter,
} from "@/lib/apiError";

// The single data boundary between this app and the Spring Boot backend. It
// runs server-side only (Route Handlers), so the Basic credential never reaches
// the browser. Callers pass the credential per request to keep the client
// stateless; the BFF injects it after decrypting the session.

const DEFAULT_BASE_URL = "http://localhost:8080/api/v1";

// In production, a missing BACKEND_URL must fail loudly rather than silently
// pointing at localhost (which could leak requests or mask misconfiguration).
// In development the localhost default is a convenience.
function resolveBaseUrl(): string {
  const configured = process.env.BACKEND_URL;
  if (configured) {
    return configured;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("BACKEND_URL must be set in production");
  }
  return DEFAULT_BASE_URL;
}

function basicAuthHeader(credentials: string): string {
  return `Basic ${credentials}`;
}

// Builds the Basic credential token (base64 of "user:pass"). Kept here so the
// encoding lives next to its only consumer.
export function encodeBasicCredentials(
  username: string,
  password: string,
): string {
  return Buffer.from(`${username}:${password}`).toString("base64");
}

interface RequestOptions {
  method?: string;
  credentials?: string;
  body?: unknown;
  // When set, send as multipart/form-data instead of JSON.
  formData?: FormData;
}

// Sort is the backend's "property,direction" form (e.g. "createdAt,desc"). The
// backend whitelists properties and silently falls back to its default for
// anything unknown, so no client-side validation is needed here. page is
// 0-based; size is clamped by the backend to its allow-list.
export interface ProductListParams {
  status?: ProductStatus;
  sort?: string;
  page?: number;
  size?: number;
}

export interface OrderListParams {
  status?: OrderStatus;
  deliveryMethod?: DeliveryMethod;
  // Free-text search: order number (UUID prefix) or customer name. The backend
  // tolerates no-match/garbage (returns 200 with empty content).
  q?: string;
  sort?: string;
  page?: number;
  size?: number;
}

function buildListQuery(
  params?: ProductListParams | OrderListParams,
): string {
  if (!params) {
    return "";
  }
  const query = new URLSearchParams();
  if (params.status) {
    query.set("status", params.status);
  }
  if ("deliveryMethod" in params && params.deliveryMethod) {
    query.set("deliveryMethod", params.deliveryMethod);
  }
  if ("q" in params && params.q) {
    query.set("q", params.q);
  }
  if (params.sort) {
    query.set("sort", params.sort);
  }
  if (params.page !== undefined) {
    query.set("page", String(params.page));
  }
  if (params.size !== undefined) {
    query.set("size", String(params.size));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.credentials) {
    headers.Authorization = basicAuthHeader(options.credentials);
  }

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await parseApiError(response);
    const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
    throw new ApiRequestError(response.status, errorBody, retryAfter);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const apiClient = {
  // Session check used by the login BFF to validate credentials without side
  // effects. 200 → valid; 401 → ApiRequestError with isUnauthorized true.
  getAdminMe(credentials: string): Promise<AdminMe> {
    return request<AdminMe>("/admin/me", { credentials });
  },

  listCategories(): Promise<Category[]> {
    return request<Category[]>("/categories");
  },

  listProducts(params?: ProductListParams): Promise<Product[]> {
    return request<Product[]>(`/products${buildListQuery(params)}`);
  },

  // Paginated admin listing (gated server-side). Distinct from the public
  // listProducts above, which the storefront consumes as a flat array.
  listProductsAdmin(
    credentials: string,
    params?: ProductListParams,
  ): Promise<Page<Product>> {
    return request<Page<Product>>(`/admin/products${buildListQuery(params)}`, {
      credentials,
    });
  },

  getProduct(id: string): Promise<Product> {
    return request<Product>(`/products/${id}`);
  },

  createProduct(
    credentials: string,
    payload: AdminProductRequest,
  ): Promise<Product> {
    return request<Product>("/admin/products", {
      method: "POST",
      credentials,
      body: payload,
    });
  },

  updateProduct(
    credentials: string,
    id: string,
    payload: AdminProductRequest,
  ): Promise<Product> {
    return request<Product>(`/admin/products/${id}`, {
      method: "PUT",
      credentials,
      body: payload,
    });
  },

  deleteProduct(credentials: string, id: string): Promise<void> {
    return request<void>(`/admin/products/${id}`, {
      method: "DELETE",
      credentials,
    });
  },

  updateProductStatus(
    credentials: string,
    id: string,
    status: ProductStatus,
  ): Promise<Product> {
    return request<Product>(`/admin/products/${id}/status`, {
      method: "PATCH",
      credentials,
      body: { status },
    });
  },

  uploadProductImages(
    credentials: string,
    id: string,
    files: FormData,
  ): Promise<Product> {
    return request<Product>(`/admin/products/${id}/images`, {
      method: "POST",
      credentials,
      formData: files,
    });
  },

  listOrders(
    credentials: string,
    params?: OrderListParams,
  ): Promise<Page<Order>> {
    return request<Page<Order>>(`/admin/orders${buildListQuery(params)}`, {
      credentials,
    });
  },

  getOrderById(credentials: string, id: string): Promise<Order> {
    return request<Order>(`/admin/orders/${id}`, { credentials });
  },

  confirmOrder(credentials: string, id: string): Promise<Order> {
    return request<Order>(`/admin/orders/${id}/confirm`, {
      method: "PATCH",
      credentials,
    });
  },

  completeOrder(credentials: string, id: string): Promise<Order> {
    return request<Order>(`/admin/orders/${id}/complete`, {
      method: "PATCH",
      credentials,
    });
  },

  deliverOrder(credentials: string, id: string): Promise<Order> {
    return request<Order>(`/admin/orders/${id}/deliver`, {
      method: "PATCH",
      credentials,
    });
  },

  cancelOrder(credentials: string, id: string): Promise<Order> {
    return request<Order>(`/admin/orders/${id}/cancel`, {
      method: "PATCH",
      credentials,
    });
  },
};
