import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

// AES-256-GCM encryption for the admin Basic credential. This module uses
// Node's crypto and must only be imported from Node-runtime code (Route
// Handlers), never from the edge middleware. The key comes from SESSION_SECRET.

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

function loadKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  const key = Buffer.from(secret, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error("SESSION_SECRET must be 32 bytes (base64-encoded)");
  }
  return key;
}

// Returns iv.authTag.ciphertext, base64url-encoded, as a single string.
export function encryptCredentials(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, loadKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64url");
}

// Decrypts a value produced by encryptCredentials. Throws if the ciphertext was
// tampered with (GCM auth tag mismatch) or the key is wrong.
export function decryptCredentials(encoded: string): string {
  const data = Buffer.from(encoded, "base64url");
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, loadKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
