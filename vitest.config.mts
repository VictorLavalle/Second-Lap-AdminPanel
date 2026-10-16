import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    // 'threads' workers are more stable than the default 'forks' on CI runners
    // (forks can fail to start with "Cannot read properties of undefined").
    pool: "threads",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.css",
        "**/*.ico",
        "src/types/**", // solo tipos, sin lógica ejecutable
        "src/data/**", // datos semilla / configuración
        "src/app/layout.tsx", // shell raíz: fuentes, metadata
        "src/app/page.tsx", // solo redirect a /productos
        "src/app/login/page.tsx", // página estática que solo compone el form
        "src/app/productos/page.tsx", // página estática que solo compone header + vista
        "src/app/productos/nuevo/page.tsx", // página estática que solo compone header + vista
        "src/app/productos/[id]/editar/page.tsx", // página estática que solo compone header + vista
        "src/app/pedidos/page.tsx", // página estática que solo compone header + vista
      ],
      thresholds: {
        statements: 90,
        branches: 88,
        functions: 90,
        lines: 90,
      },
    },
  },
});
