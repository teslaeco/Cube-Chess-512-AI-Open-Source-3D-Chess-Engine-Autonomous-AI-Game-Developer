import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "test/**/*.test.ts",
      "src/engine3d/**/*.test.ts",
      "web/**/*.test.js",
    ],
  },
});
