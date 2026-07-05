import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      routesDirectory: "src/app/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
      quoteStyle: "double",
      routeFileIgnorePattern: ".*\\.page\\.tsx$|.*-layout\\.tsx$|.*\\.test\\.tsx$",
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
      "@/shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
      "@/widgets": fileURLToPath(new URL("./src/widgets", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    // ApexCharts is an intentional core dashboard dependency. Keep it out of
    // the app shell, then budget the known chart vendor chunk explicitly.
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("apexcharts") || id.includes("react-apexcharts")) {
            return "charts";
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
