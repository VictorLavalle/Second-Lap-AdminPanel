import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  buildStaticSecurityHeaders,
} from "./securityHeaders";

const backendOrigin = "http://localhost:8080";

describe("buildContentSecurityPolicy", () => {
  it("denies everything by default and forbids framing", () => {
    const csp = buildContentSecurityPolicy({ isDev: false, backendOrigin });

    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  it("allows the backend origin for images", () => {
    const csp = buildContentSecurityPolicy({ isDev: false, backendOrigin });

    expect(csp).toContain(`img-src 'self' data: blob: ${backendOrigin}`);
  });

  it("uses a nonce and strict-dynamic in production, dropping unsafe-inline for scripts", () => {
    const csp = buildContentSecurityPolicy({
      isDev: false,
      backendOrigin,
      nonce: "abc123",
    });

    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("connect-src 'self';");
  });

  it("falls back to unsafe-inline in production only when no nonce is supplied", () => {
    const csp = buildContentSecurityPolicy({ isDev: false, backendOrigin });

    expect(csp).toContain("script-src 'self' 'unsafe-inline';");
    expect(csp).not.toContain("'nonce-");
  });

  it("relaxes script-src and connect-src for HMR in development", () => {
    const csp = buildContentSecurityPolicy({
      isDev: true,
      backendOrigin,
      nonce: "ignored-in-dev",
    });

    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("'unsafe-inline'");
    expect(csp).not.toContain("'nonce-");
    expect(csp).toContain(`connect-src 'self' ws: ${backendOrigin}`);
  });

  it("uses a nonce for style-src and drops unsafe-inline in production", () => {
    const csp = buildContentSecurityPolicy({
      isDev: false,
      backendOrigin,
      nonce: "abc123",
    });

    expect(csp).toContain("style-src 'self' 'nonce-abc123'");
    expect(csp).not.toContain("style-src 'self' 'unsafe-inline'");
    // Inline style ATTRIBUTES (framework-emitted) are scoped to style-src-attr,
    // keeping style-src strict against injected <style> blocks.
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
  });

  it("keeps unsafe-inline on style-src and omits style-src-attr in development", () => {
    const csp = buildContentSecurityPolicy({
      isDev: true,
      backendOrigin,
      nonce: "ignored-in-dev",
    });

    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain("style-src-attr");
  });

  it("falls back to unsafe-inline on style-src in prod when no nonce is supplied", () => {
    const csp = buildContentSecurityPolicy({ isDev: false, backendOrigin });

    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain("style-src-attr");
  });
});

describe("buildStaticSecurityHeaders", () => {
  it("includes the hardening headers and does NOT include the CSP", () => {
    const headers = buildStaticSecurityHeaders();
    const byKey = new Map(headers.map((h) => [h.key, h.value]));

    expect(byKey.get("X-Content-Type-Options")).toBe("nosniff");
    expect(byKey.get("X-Frame-Options")).toBe("DENY");
    expect(byKey.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(byKey.has("Permissions-Policy")).toBe(true);
    // CSP is per-request (middleware), so it must not be in the static set.
    expect(byKey.has("Content-Security-Policy")).toBe(false);
  });
});
