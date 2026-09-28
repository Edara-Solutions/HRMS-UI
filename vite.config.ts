import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  envPrefix: ["VITE_", "ALLOW_"],
  plugins: [
    tanstackRouter({
      target: "react",
      routesDirectory: "src/app/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
      quoteStyle: "double",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@/app": fileURLToPath(new URL("./src/app", import.meta.url)),
      "@/features": fileURLToPath(new URL("./src/features", import.meta.url)),
      "@/pages": fileURLToPath(new URL("./src/pages", import.meta.url)),
      "@/routeTree.gen": fileURLToPath(new URL("./src/routeTree.gen.ts", import.meta.url)),
      "@/shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
      "@/widgets": fileURLToPath(new URL("./src/widgets", import.meta.url)),
    },
  },
  build: {
    // Budget the shared vendor chunk separately from route-specific contracts.
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          const path = id.replaceAll("\\", "/");
          if (path.includes("/node_modules/")) return "vendor";
          if (
            path.includes("/src/shared/public-api/") ||
            /\/src\/shared\/api\/(public-api|config)\.ts$/.test(path)
          )
            return "public-transport";
          if (/\/src\/shared\/(ui|lib|config|i18n)\//.test(path)) return "presentation";
          if (/\/src\/shared\/api\/generated\/(runtime|metadata)\.ts$/.test(path))
            return "contract-runtime";
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: false,
  },
});
