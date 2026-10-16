import { describe, expect, it } from "vitest";
import { generateNonce } from "./nonce";

describe("generateNonce", () => {
  it("produces a non-empty base64 string", () => {
    const nonce = generateNonce();
    expect(nonce.length).toBeGreaterThan(0);
    // 16 bytes base64-encode to 24 characters (with padding).
    expect(nonce).toHaveLength(24);
  });

  it("produces a distinct value on each call", () => {
    expect(generateNonce()).not.toBe(generateNonce());
  });
});
