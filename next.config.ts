import type { NextConfig } from "next";
import { buildStaticSecurityHeaders } from "./src/lib/securityHeaders";

// Static hardening headers apply to every response. The Content-Security-Policy
// is NOT set here: it carries a per-request nonce and is emitted by the edge
// proxy instead (see src/proxy.ts).
const securityHeaders = buildStaticSecurityHeaders();

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Dev-only: allow HMR/dev resources to be served to this machine over the
  // local network (e.g. testing on a phone at http://192.168.1.x:3000). Next 16
  // blocks cross-origin dev requests by default. No effect in production.
  allowedDevOrigins: ["192.168.1.236", "192.168.1.*"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
