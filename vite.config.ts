import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/ui/api": {
        target: "http://localhost:2019",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ui\/api/, ""),
        configure: (proxy) => {
          // Remove headers so Caddy's admin API treats the request
          // as a non-browser client, bypassing origin enforcement
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.removeHeader("origin");
            proxyReq.removeHeader("sec-fetch-mode");
          });
        },
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
