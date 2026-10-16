// Edge-safe per-request CSP nonce. Uses Web Crypto getRandomValues (available
// in the edge runtime; no node:crypto) and base64-encodes 16 random bytes.
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
