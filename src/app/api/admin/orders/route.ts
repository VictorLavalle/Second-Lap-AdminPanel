import { NextResponse } from "next/server";
import { apiClient } from "@/lib/apiClient";
import { resolveAdminCredentials } from "@/lib/adminCredentials";
import {
  errorResponse,
  unauthorizedResponse,
  withRefreshedCookies,
} from "@/lib/bffResponse";

export const runtime = "nodejs";

// Lists orders (backend returns them sorted most-recent-first).
export async function GET(request: Request): Promise<NextResponse> {
  const resolved = await resolveAdminCredentials(request.headers.get("cookie"));
  if (!resolved) {
    return unauthorizedResponse();
  }

  try {
    const orders = await apiClient.listOrders(resolved.credentials);
    return withRefreshedCookies(
      NextResponse.json(orders),
      resolved.refreshedCookies,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
