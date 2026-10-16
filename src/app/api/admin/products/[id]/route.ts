import { NextResponse } from "next/server";
import { apiClient } from "@/lib/apiClient";
import { resolveAdminCredentials } from "@/lib/adminCredentials";
import {
  errorResponse,
  unauthorizedResponse,
  withRefreshedCookies,
} from "@/lib/bffResponse";
import type { AdminProductRequest } from "@/types";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const resolved = await resolveAdminCredentials(request.headers.get("cookie"));
  if (!resolved) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;

  try {
    const product = await apiClient.getProduct(id);
    return withRefreshedCookies(
      NextResponse.json(product),
      resolved.refreshedCookies,
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const resolved = await resolveAdminCredentials(request.headers.get("cookie"));
  if (!resolved) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;

  let payload: AdminProductRequest;
  try {
    payload = (await request.json()) as AdminProductRequest;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const product = await apiClient.updateProduct(
      resolved.credentials,
      id,
      payload,
    );
    return withRefreshedCookies(
      NextResponse.json(product),
      resolved.refreshedCookies,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
