import { describe, expect, it } from "vitest";
import {
  hasValidToken,
  signToken,
  verifySignedToken,
} from "./sessionCookie";

describe("signed session cookie", () => {
  it("signs and verifies a payload", async () => {
    const token = await signToken({ enc: "cipher", exp: Date.now() + 10_000 });

    const payload = await verifySignedToken(token);
    expect(payload?.enc).toBe("cipher");
  });

  it("rejects a tampered body", async () => {
    const token = await signToken({ enc: "cipher", exp: Date.now() + 10_000 });
    const [, signature] = token.split(".");
    const forged = `${btoa("evil").replace(/=+$/, "")}.${signature}`;

    expect(await verifySignedToken(forged)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await signToken({ enc: "cipher", exp: Date.now() - 1 });

    expect(await verifySignedToken(token)).toBeNull();
  });

  it("rejects malformed and missing tokens", async () => {
    expect(await verifySignedToken(undefined)).toBeNull();
    expect(await verifySignedToken("nodot")).toBeNull();
  });

  it("hasValidToken reflects verification result", async () => {
    const valid = await signToken({ enc: "c", exp: Date.now() + 10_000 });
    const expired = await signToken({ enc: "c", exp: Date.now() - 1 });

    expect(await hasValidToken(valid)).toBe(true);
    expect(await hasValidToken(expired)).toBe(false);
  });

  it("returns null when the signed body is not valid JSON", async () => {
    const encoder = new TextEncoder();
    const body = btoa("not-json").replace(/=+$/, "");
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(process.env.SESSION_SIGNING_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signatureBytes = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, encoder.encode(body)),
    );
    let binary = "";
    for (const byte of signatureBytes) {
      binary += String.fromCharCode(byte);
    }
    const signature = btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    expect(await verifySignedToken(`${body}.${signature}`)).toBeNull();
  });

  it("throws when the signing secret is missing", async () => {
    const original = process.env.SESSION_SIGNING_SECRET;
    delete process.env.SESSION_SIGNING_SECRET;
    try {
      await expect(signToken({ enc: "c", exp: Date.now() + 1000 })).rejects.toThrow(
        /SESSION_SIGNING_SECRET is not set/,
      );
    } finally {
      process.env.SESSION_SIGNING_SECRET = original;
    }
  });
});
