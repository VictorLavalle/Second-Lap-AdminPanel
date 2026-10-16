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

// Receives the multipart form from the browser and forwards the "files" field
// to the backend. The backend re-validates type/size; the client validates
// first as defense-in-depth.
export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const resolved = await resolveAdminCredentials(request.headers.get("cookie"));
  if (!resolved) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const files = incoming
    .getAll("files")
    .filter((item): item is File => typeof item !== "string");
  if (files.length === 0) {
    return NextResponse.json({ error: "no_files" }, { status: 400 });
  }

  const outgoing = new FormData();
  for (const file of files) {
    outgoing.append("files", file);
  }

  try {
    const product = await apiClient.uploadProductImages(
      resolved.credentials,
      id,
      outgoing,
    );
    return withRefreshedCookies(
      NextResponse.json(product),
      resolved.refreshedCookies,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
