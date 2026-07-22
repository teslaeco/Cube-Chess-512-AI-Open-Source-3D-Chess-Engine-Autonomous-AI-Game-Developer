import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const baseUrl =
  process.env.CUBE_CHESS_URL ??
  "http://127.0.0.1:4173/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/?screenshots=1";
const output = "docs/audits/screenshots";
await mkdir(output, { recursive: true });

const server = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4173"],
  { stdio: "ignore" },
);

for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    const response = await fetch(baseUrl);
    if (response.ok) break;
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 100));
}

const browser = await chromium.launch({ headless: true });
try {
  for (const target of [
    { name: "desktop", viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
    { name: "mobile", viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 },
  ]) {
    const context = await browser.newContext({
      viewport: target.viewport,
      deviceScaleFactor: target.deviceScaleFactor,
      isMobile: target.name === "mobile",
      hasTouch: target.name === "mobile",
    });
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.locator("canvas.game-canvas").waitFor({ state: "visible" });
    await page.locator("[data-language]").selectOption("pl");
    await page.screenshot({
      path: `${output}/${target.name}-main-menu.png`,
      fullPage: true,
    });
    await page.getByTestId("start-game").click();
    await page.locator("[data-start-menu]").waitFor({ state: "hidden" });
    await page.screenshot({
      path: `${output}/${target.name}-game.png`,
      fullPage: true,
    });
    await context.close();
  }
  console.log(`Saved responsive UI evidence in ${output}`);
} finally {
  await browser.close();
  server.kill("SIGTERM");
}
