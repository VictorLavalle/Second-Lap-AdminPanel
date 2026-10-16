import { NextResponse } from "next/server";
import { apiClient } from "@/lib/apiClient";
import { resolveAdminCredentials } from "@/lib/adminCredentials";
import {
  errorResponse,
  unauthorizedResponse,
  withRefreshedCookies,
} from "@/lib/bffResponse";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Marks a completed order as delivered. A 409 (not completed) is passed through
// by errorResponse with the backend's Spanish message.
export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const resolved = await resolveAdminCredentials(request.headers.get("cookie"));
  if (!resolved) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;

  try {
    const order = await apiClient.deliverOrder(resolved.credentials, id);
    return withRefreshedCookies(
      NextResponse.json(order),
      resolved.refreshedCookies,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
