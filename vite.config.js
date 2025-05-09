import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    include: ["three"],
  },
  resolve: {
    alias: {
      "three": "three"
    }
  }
});