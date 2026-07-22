import { defineConfig } from "vite";

const repositoryName =
  "Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer";

export default defineConfig({
  base: process.env.TAURI_ENV_PLATFORM ? "./" : `/${repositoryName}/`,
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three", "three/addons/controls/OrbitControls.js"],
        },
      },
    },
  },
});
