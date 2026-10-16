import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
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

  it("tightens script-src and connect-src in production", () => {
    const csp = buildContentSecurityPolicy({ isDev: false, backendOrigin });

    expect(csp).toContain("script-src 'self' 'unsafe-inline';");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("connect-src 'self';");
    expect(csp).not.toContain("ws:");
  });

  it("relaxes script-src and connect-src for HMR in development", () => {
    const csp = buildContentSecurityPolicy({ isDev: true, backendOrigin });

    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain(`connect-src 'self' ws: ${backendOrigin}`);
  });
});

describe("buildSecurityHeaders", () => {
  it("includes the hardening headers alongside the CSP", () => {
    const headers = buildSecurityHeaders({ isDev: false, backendOrigin });
    const byKey = new Map(headers.map((h) => [h.key, h.value]));

    expect(byKey.get("X-Content-Type-Options")).toBe("nosniff");
    expect(byKey.get("X-Frame-Options")).toBe("DENY");
    expect(byKey.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(byKey.has("Content-Security-Policy")).toBe(true);
    expect(byKey.has("Permissions-Policy")).toBe(true);
  });
});
