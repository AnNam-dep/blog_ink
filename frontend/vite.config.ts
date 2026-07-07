import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173
  },
  test: {
    environment: "node"
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@stellar")) {
            return "stellar";
          }

          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "react";
          }

          if (id.includes("node_modules")) {
            return "vendor";
          }
        }
      }
    }
  }
});