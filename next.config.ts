import type { NextConfig } from "next";
import { buildStaticSecurityHeaders } from "./src/lib/securityHeaders";

// Static hardening headers apply to every response. The Content-Security-Policy
// is NOT set here: it carries a per-request nonce and is emitted by the
// middleware instead (see src/middleware.ts).
const securityHeaders = buildStaticSecurityHeaders();

const nextConfig: NextConfig = {
  reactCompiler: true,
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
