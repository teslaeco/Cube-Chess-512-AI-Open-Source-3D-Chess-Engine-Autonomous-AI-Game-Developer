import { defineConfig, devices } from "@playwright/test";

const basePath =
  "/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["line"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:4173${basePath}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npx vite --host 127.0.0.1 --port 4173",
    url: `http://127.0.0.1:4173${basePath}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } },
    },
    {
      name: "firefox-desktop",
      use: { ...devices["Desktop Firefox"], viewport: { width: 1920, height: 1080 } },
    },
    {
      name: "webkit-desktop",
      use: { ...devices["Desktop Safari"], viewport: { width: 1366, height: 768 } },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"], deviceScaleFactor: 1 },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 13"], deviceScaleFactor: 1 },
    },
    {
      name: "tablet",
      use: { ...devices["iPad (gen 7)"], deviceScaleFactor: 1 },
    },
  ],
});
