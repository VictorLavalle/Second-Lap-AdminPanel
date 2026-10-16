import { NextResponse } from "next/server";
import { apiClient } from "@/lib/apiClient";
import { resolveAdminCredentials } from "@/lib/adminCredentials";
import {
  errorResponse,
  unauthorizedResponse,
  withRefreshedCookies,
} from "@/lib/bffResponse";

export const runtime = "nodejs";

// Serves categories for the product form's select. Categories are public, but
// gating them behind the admin session keeps a single auth boundary.
export async function GET(request: Request): Promise<NextResponse> {
  const resolved = await resolveAdminCredentials(request.headers.get("cookie"));
  if (!resolved) {
    return unauthorizedResponse();
  }

  try {
    const categories = await apiClient.listCategories();
    return withRefreshedCookies(
      NextResponse.json(categories),
      resolved.refreshedCookies,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
