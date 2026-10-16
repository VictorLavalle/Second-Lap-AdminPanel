import { NextResponse } from "next/server";
import { apiClient } from "@/lib/apiClient";
import { resolveAdminCredentials } from "@/lib/adminCredentials";
import { parseOrderListParams } from "@/lib/listParams";
import {
  errorResponse,
  unauthorizedResponse,
  withRefreshedCookies,
} from "@/lib/bffResponse";

export const runtime = "nodejs";

// Lists orders. Status/sort filters are forwarded to the backend; with no
// params the backend returns them most-recent-first.
export async function GET(request: Request): Promise<NextResponse> {
  const resolved = await resolveAdminCredentials(request.headers.get("cookie"));
  if (!resolved) {
    return unauthorizedResponse();
  }

  try {
    const orders = await apiClient.listOrders(
      resolved.credentials,
      parseOrderListParams(request.url),
    );
    return withRefreshedCookies(
      NextResponse.json(orders),
      resolved.refreshedCookies,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
