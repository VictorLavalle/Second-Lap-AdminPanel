import { NextResponse } from "next/server";
import { apiClient } from "@/lib/apiClient";
import { resolveAdminCredentials } from "@/lib/adminCredentials";
import {
  errorResponse,
  unauthorizedResponse,
  withRefreshedCookies,
} from "@/lib/bffResponse";

export const runtime = "nodejs";

// Lists products for the admin table. Products are read via the public catalog
// endpoint, but the request is gated by a valid admin session so the panel only
// serves data to an authenticated admin (and transparently refreshes the
// session when needed).
export async function GET(request: Request): Promise<NextResponse> {
  const resolved = await resolveAdminCredentials(request.headers.get("cookie"));
  if (!resolved) {
    return unauthorizedResponse();
  }

  try {
    const products = await apiClient.listProducts();
    return withRefreshedCookies(
      NextResponse.json(products),
      resolved.refreshedCookies,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
