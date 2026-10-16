// Edge-safe signed-cookie layer. Uses Web Crypto (crypto.subtle), which exists
// in both the edge middleware and Node runtimes — unlike node:crypto. The
// middleware uses verifySignedToken to check presence + signature + expiry
// WITHOUT ever decrypting the AES credential blob carried in the payload.

const encoder = new TextEncoder();

export interface SessionPayload {
  // AES-GCM encrypted "user:pass" credential (opaque at the edge).
  enc: string;
  // Expiry as epoch milliseconds.
  exp: number;
  // Refresh rotation id, present only on the refresh token.
  rid?: string;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }
  return stripTrailing(
    btoa(binary).replaceAll("+", "-").replaceAll("/", "_"),
    "=",
  );
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.codePointAt(i) ?? 0;
  }
  return bytes;
}

// Removes trailing occurrences of a single-character suffix without a regex
// (avoids an anchored-quantifier pattern that static analysis flags as ReDoS).
function stripTrailing(value: string, suffix: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === suffix) {
    end -= 1;
  }
  return value.slice(0, end);
}

function loadSigningSecret(): string {
  const secret = process.env.SESSION_SIGNING_SECRET;
  if (!secret) {
    throw new Error("SESSION_SIGNING_SECRET is not set");
  }
  return secret;
}

async function importKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(loadSigningSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signToken(payload: SessionPayload): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body),
  );
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

// Verifies the HMAC and expiry, returning the payload or null. Does not decrypt
// the credential; that happens only in Node-runtime handlers.
export async function verifySignedToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }
  const [body, signature] = parts;
  const key = await importKey();
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(signature),
    encoder.encode(body),
  );
  if (!valid) {
    return null;
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(body)),
    ) as SessionPayload;
  } catch {
    return null;
  }

  if (typeof payload.exp !== "number" || Date.now() >= payload.exp) {
    return null;
  }
  return payload;
}

// Lightweight presence+signature+expiry check for the edge middleware.
export async function hasValidToken(
  token: string | undefined,
): Promise<boolean> {
  return (await verifySignedToken(token)) !== null;
}
