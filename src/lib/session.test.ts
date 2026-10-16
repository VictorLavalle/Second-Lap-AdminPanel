import { afterEach, describe, expect, it } from "vitest";
import { decryptCredentials, encryptCredentials } from "./session";

const originalSecret = process.env.SESSION_SECRET;

afterEach(() => {
  process.env.SESSION_SECRET = originalSecret;
});

describe("session credential encryption", () => {
  it("round-trips a credential through encrypt/decrypt", () => {
    const secret = "admin:s3cr3t";
    const encrypted = encryptCredentials(secret);

    expect(encrypted).not.toContain(secret);
    expect(decryptCredentials(encrypted)).toBe(secret);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptCredentials("admin:same");
    const b = encryptCredentials("admin:same");

    expect(a).not.toBe(b);
    expect(decryptCredentials(a)).toBe("admin:same");
    expect(decryptCredentials(b)).toBe("admin:same");
  });

  it("rejects tampered ciphertext via the GCM auth tag", () => {
    const encrypted = encryptCredentials("admin:tamper");
    const bytes = Buffer.from(encrypted, "base64url");
    bytes[bytes.length - 1] ^= 0xff;
    const tampered = bytes.toString("base64url");

    expect(() => decryptCredentials(tampered)).toThrow();
  });

  it("throws when SESSION_SECRET is missing", () => {
    delete process.env.SESSION_SECRET;
    expect(() => encryptCredentials("x")).toThrow(/SESSION_SECRET is not set/);
  });

  it("throws when SESSION_SECRET is not 32 bytes", () => {
    process.env.SESSION_SECRET = Buffer.alloc(16, 1).toString("base64");
    expect(() => encryptCredentials("x")).toThrow(/32 bytes/);
  });
});
