import { NextResponse } from "next/server";
import { apiClient } from "@/lib/apiClient";
import { resolveAdminCredentials } from "@/lib/adminCredentials";
import { parseProductListParams } from "@/lib/listParams";
import {
  errorResponse,
  unauthorizedResponse,
  withRefreshedCookies,
} from "@/lib/bffResponse";
import type { AdminProductRequest } from "@/types";

export const runtime = "nodejs";

// Lists products for the admin table via the paginated admin endpoint, gated by
// a valid admin session (transparently refreshing it when needed). Status, sort
// and pagination are forwarded to the backend.
export async function GET(request: Request): Promise<NextResponse> {
  const resolved = await resolveAdminCredentials(request.headers.get("cookie"));
  if (!resolved) {
    return unauthorizedResponse();
  }

  try {
    const products = await apiClient.listProductsAdmin(
      resolved.credentials,
      parseProductListParams(request.url),
    );
    return withRefreshedCookies(
      NextResponse.json(products),
      resolved.refreshedCookies,
    );
  } catch (error) {
    return errorResponse(error);
  }
}

// Creates a product. Validation also runs client-side, but the backend is the
// source of truth and returns 400 on invalid input, surfaced via errorResponse.
export async function POST(request: Request): Promise<NextResponse> {
  const resolved = await resolveAdminCredentials(request.headers.get("cookie"));
  if (!resolved) {
    return unauthorizedResponse();
  }

  let payload: AdminProductRequest;
  try {
    payload = (await request.json()) as AdminProductRequest;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const product = await apiClient.createProduct(resolved.credentials, payload);
    return withRefreshedCookies(
      NextResponse.json(product, { status: 201 }),
      resolved.refreshedCookies,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
