import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/lib/securityHeaders";

const securityHeaders = buildSecurityHeaders({
  isDev: process.env.NODE_ENV !== "production",
  backendOrigin: process.env.BACKEND_PUBLIC_ORIGIN ?? "http://localhost:8080",
});

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
