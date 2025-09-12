import { defineConfig } from "vite";

export default defineConfig({
  root: "public",
  build: {
    outDir: "../dist",
    emptyOutDir: true
  },
  optimizeDeps: {
    include: ["three"],
  },
  resolve: {
    alias: {
      "three": "three"
    }
  }
});