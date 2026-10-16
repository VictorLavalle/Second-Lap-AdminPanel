import { NextResponse } from "next/server";
import { apiClient } from "@/lib/apiClient";
import { resolveAdminCredentials } from "@/lib/adminCredentials";
import {
  errorResponse,
  unauthorizedResponse,
  withRefreshedCookies,
} from "@/lib/bffResponse";
import type { ProductStatus } from "@/types";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const VALID_STATUSES: ProductStatus[] = ["disponible", "apartado", "vendido"];

function isStatus(value: unknown): value is ProductStatus {
  return (
    typeof value === "string" &&
    (VALID_STATUSES as string[]).includes(value)
  );
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const resolved = await resolveAdminCredentials(request.headers.get("cookie"));
  if (!resolved) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;

  let body: { status?: unknown };
  try {
    body = (await request.json()) as { status?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!isStatus(body.status)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const product = await apiClient.updateProductStatus(
      resolved.credentials,
      id,
      body.status,
    );
    return withRefreshedCookies(
      NextResponse.json(product),
      resolved.refreshedCookies,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
