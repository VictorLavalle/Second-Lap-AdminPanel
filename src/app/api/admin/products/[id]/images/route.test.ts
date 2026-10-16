// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { apiClient } from "@/lib/apiClient";
import { ApiRequestError } from "@/lib/apiError";
import { SESSION_COOKIE } from "@/lib/authSession";
import { signToken } from "@/lib/sessionCookie";
import { encryptCredentials } from "@/lib/session";
import type { Product } from "@/types";

const basic = Buffer.from("admin:secret").toString("base64");
const productId = "99999999-9999-9999-9999-999999999999";

const sampleProduct: Product = {
  id: productId,
  name: "Camisa",
  description: "d",
  price: 100,
  images: ["http://localhost:8080/img/a.jpg"],
  categoryId: "c1",
  size: "M",
  condition: "Excelente",
  brand: null,
  color: null,
  measurements: null,
  status: "disponible",
};

function context() {
  return { params: Promise.resolve({ id: productId }) };
}

async function authedForm(withFile: boolean): Promise<Request> {
  const token = await signToken({
    enc: encryptCredentials(basic),
    exp: Date.now() + 60_000,
  });
  const form = new FormData();
  if (withFile) {
    form.append(
      "files",
      new File(["bytes"], "a.jpg", { type: "image/jpeg" }),
    );
  }
  return new Request(
    `http://localhost/api/admin/products/${productId}/images`,
    {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE}=${token}` },
      body: form,
    },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/admin/products/[id]/images", () => {
  it("forwards files and returns the updated product", async () => {
    const spy = vi
      .spyOn(apiClient, "uploadProductImages")
      .mockResolvedValue(sampleProduct);

    const response = await POST(await authedForm(true), context());

    expect(response.status).toBe(200);
    expect(spy).toHaveBeenCalled();
  });

  it("rejects a form with no files as 400", async () => {
    const response = await POST(await authedForm(false), context());
    expect(response.status).toBe(400);
  });

  it("returns 401 without a session", async () => {
    const form = new FormData();
    form.append("files", new File(["b"], "a.jpg", { type: "image/jpeg" }));
    const response = await POST(
      new Request(`http://localhost/api/admin/products/${productId}/images`, {
        method: "POST",
        body: form,
      }),
      context(),
    );
    expect(response.status).toBe(401);
  });

  it("maps a backend 400 through errorResponse", async () => {
    vi.spyOn(apiClient, "uploadProductImages").mockRejectedValue(
      new ApiRequestError(400, { code: "INVALID_UPLOAD", message: "x" }),
    );

    const response = await POST(await authedForm(true), context());
    expect(response.status).toBe(400);
  });
});
