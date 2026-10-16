import type {
  AdminMe,
  AdminProductRequest,
  Category,
  Order,
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

function resolveBaseUrl(): string {
  return process.env.BACKEND_URL ?? DEFAULT_BASE_URL;
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

  listProducts(): Promise<Product[]> {
    return request<Product[]>("/products");
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

  listOrders(credentials: string): Promise<Order[]> {
    return request<Order[]>("/admin/orders", { credentials });
  },

  confirmOrder(credentials: string, id: string): Promise<Order> {
    return request<Order>(`/admin/orders/${id}/confirm`, {
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
