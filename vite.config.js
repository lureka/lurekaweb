import { defineConfig } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: "public",
  base: "/",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "public/index.html"),
        "3dcity": resolve(__dirname, "public/js/main.js")
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Mantener main.js en js/ para 3dcity.html
          if (chunkInfo.name === "3dcity") {
            return "js/main-[hash].js";
          }
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          // Mantener fuentes en fonts/ y otros assets en assets/
          if (assetInfo.name && assetInfo.name.endsWith('.woff2')) {
            return "assets/[name]";
          }
          return "assets/[name]-[hash][extname]";
        }
      }
    }
  },
  optimizeDeps: {
    include: ["three", "@tweenjs/tween.js"],
  },
  resolve: {
    alias: {
      "three": "three"
    }
  }
});