// Single source of truth for the panel's security headers. Pure logic (no Next
// imports) so it can be unit-tested and reused by both next.config.ts (static
// headers) and the middleware (per-request CSP with a nonce).

export interface SecurityHeader {
  key: string;
  value: string;
}

export interface CspOptions {
  isDev: boolean;
  backendOrigin: string;
  // Per-request nonce used in production to authorize framework scripts without
  // 'unsafe-inline'. Omitted in dev, where HMR requires unsafe-inline/eval.
  nonce?: string;
}

// Strict CSP: deny by default, then open only what the admin panel needs.
//
// Production uses a per-request nonce plus 'strict-dynamic', which lets the
// nonced Next bootstrap script load the rest of the chunks while still
// forbidding arbitrary inline scripts — so 'unsafe-inline' is dropped for
// scripts. Development keeps 'unsafe-inline'/'unsafe-eval' because Turbopack HMR
// injects eval'd inline scripts a nonce cannot cover. Tailwind injects styles
// at runtime, hence 'unsafe-inline' remains on style-src. Product images come
// from the backend, so img-src allows the backend origin.
export function buildContentSecurityPolicy({
  isDev,
  backendOrigin,
  nonce,
}: CspOptions): string {
  const connectSrc = isDev ? `'self' ws: ${backendOrigin}` : "'self'";

  const directives = [
    "default-src 'none'",
    `script-src ${scriptSrcDirective(isDev, nonce)}`,
    `style-src ${styleSrcDirective(isDev, nonce)}`,
    `img-src 'self' data: blob: ${backendOrigin}`,
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "form-action 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ];

  // In production, style-src uses a nonce and no 'unsafe-inline', which also
  // blocks inline style ATTRIBUTES (e.g. the `style="color:transparent"` the
  // Next <Image> component emits) — nonces only authorize <style> elements, not
  // attributes. We scope those to style-src-attr 'unsafe-inline': it permits the
  // unavoidable framework-emitted style attributes while keeping style-src
  // strict against injected <style> blocks (the real XSS vector). Dev already
  // allows 'unsafe-inline' on style-src, so no style-src-attr is needed there.
  const styleAttr = styleSrcAttrDirective(isDev, nonce);
  if (styleAttr) {
    directives.push(styleAttr);
  }

  return directives.join("; ").concat(";");
}

function scriptSrcDirective(isDev: boolean, nonce?: string): string {
  if (isDev) {
    // HMR injects eval'd inline scripts a nonce cannot cover.
    return "'self' 'unsafe-inline' 'unsafe-eval'";
  }
  if (nonce) {
    return `'self' 'nonce-${nonce}' 'strict-dynamic'`;
  }
  // Production fallback when no nonce is available (should not happen once the
  // middleware supplies one): keep the previous, looser behavior.
  return "'self' 'unsafe-inline'";
}

function styleSrcDirective(isDev: boolean, nonce?: string): string {
  if (isDev) {
    // Turbopack injects runtime <style> tags during HMR.
    return "'self' 'unsafe-inline'";
  }
  if (nonce) {
    return `'self' 'nonce-${nonce}'`;
  }
  return "'self' 'unsafe-inline'";
}

// Only emitted in production with a strict style-src: permits inline style
// attributes (not <style> elements) so framework-emitted attributes do not
// trip CSP. Returns null when not needed (dev, or no nonce / loose style-src).
function styleSrcAttrDirective(isDev: boolean, nonce?: string): string | null {
  if (!isDev && nonce) {
    return "style-src-attr 'unsafe-inline'";
  }
  return null;
}

// Non-CSP hardening headers that are identical on every response. The CSP is set
// per-request in the middleware (it carries a nonce), so it is NOT included here
// to avoid emitting two conflicting Content-Security-Policy headers.
export function buildStaticSecurityHeaders(): SecurityHeader[] {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
  ];
}
