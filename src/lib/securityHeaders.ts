// Single source of truth for the panel's security headers. Kept as pure logic
// (no Next imports) so it can be unit-tested and reused by next.config.ts.

export interface SecurityHeader {
  key: string;
  value: string;
}

export interface SecurityHeadersOptions {
  isDev: boolean;
  backendOrigin: string;
}

// Strict CSP: deny by default, then open only what the admin panel needs.
// Next's inline bootstrap/runtime requires 'unsafe-inline' for script-src; in
// dev, Turbopack HMR additionally needs 'unsafe-eval' and a websocket origin.
// Tailwind injects styles at runtime, hence 'unsafe-inline' for style-src.
// Product images come from the backend, so img-src allows the backend origin.
export function buildContentSecurityPolicy({
  isDev,
  backendOrigin,
}: SecurityHeadersOptions): string {
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'";
  const connectSrc = isDev ? `'self' ws: ${backendOrigin}` : "'self'";

  return [
    "default-src 'none'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${backendOrigin}`,
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "form-action 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ]
    .join("; ")
    .concat(";");
}

export function buildSecurityHeaders(
  options: SecurityHeadersOptions,
): SecurityHeader[] {
  return [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(options) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
  ];
}
