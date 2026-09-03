import { resolve } from "node:path";
import { defineConfig } from "vite";

const repositoryName =
  "Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer";

export default defineConfig({
  base: process.env.TAURI_ENV_PLATFORM ? "./" : `/${repositoryName}/`,
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        guest: resolve(__dirname, "guest.html"),
      },
      output: {
        manualChunks: {
          three: ["three", "three/addons/controls/OrbitControls.js"],
        },
      },
    },
  },
});
