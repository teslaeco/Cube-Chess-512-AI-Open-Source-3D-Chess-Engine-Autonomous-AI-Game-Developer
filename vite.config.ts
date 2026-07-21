import { defineConfig } from "vite";

const repositoryName =
  "Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer";

// Keep source imports aligned with the native browser import map while telling
// Vite not to look for unavailable local npm copies during development.
export default defineConfig({
  base: `/${repositoryName}/`,
  resolve: {
    alias: [
      {
        find: /^three$/,
        replacement:
          "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
      },
      {
        find: /^three\/addons\//,
        replacement:
          "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/",
      },
    ],
  },
  optimizeDeps: { exclude: ["three"] },
});
