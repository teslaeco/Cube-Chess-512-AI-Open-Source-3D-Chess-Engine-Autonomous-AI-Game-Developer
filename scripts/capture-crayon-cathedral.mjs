import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

const defaultBase =
  "http://127.0.0.1:4173/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer";
let baseUrl = process.env.FORGEMCP_PREVIEW_URL ?? defaultBase;
const artifactDir =
  process.env.FORGEMCP_CRAYON_DIR ?? "artifacts/crayon-cathedral-live";
const types = (process.env.FORGEMCP_CRAYON_TYPES ?? "pawn,rook,knight,bishop,queen,king")
  .split(",")
  .filter(Boolean);
const sides = (process.env.FORGEMCP_CRAYON_SIDES ?? "white,black")
  .split(",")
  .filter(Boolean);

await mkdir(artifactDir, { recursive: true });
let viteServer = null;
if (!process.env.FORGEMCP_PREVIEW_URL) {
  viteServer = await createServer({
    server: { host: "127.0.0.1", port: 4173, strictPort: false },
  });
  await viteServer.listen();
  const origin = viteServer.resolvedUrls?.local?.[0]?.replace(/\/$/, "");
  if (origin) {
    baseUrl = origin.includes("/Cube-Chess-512-")
      ? origin
      : `${origin}/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer`;
  }
}
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
await context.addInitScript(() => {
  localStorage.setItem("cubeChessPieceSet", "CRAYON_CATHEDRAL");
  localStorage.setItem("cubeChessLanguage", "pl");
  sessionStorage.setItem(
    "cubeChessIdentity",
    JSON.stringify({
      mode: "guest",
      provider: "guest",
      playerId: "guest-crayon-cathedral-qa",
      displayName: "Crayon Cathedral QA",
    }),
  );
});

const page = await context.newPage();
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

try {
  const navigationStarted = Date.now();
  await page.goto(`${baseUrl}/?e2e=1`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForFunction(
    () => Boolean(globalThis.__cubeChessApplication?.renderer?.pieceRenderer),
    null,
    { timeout: 60_000 },
  );
  await page.waitForFunction(() => {
    const renderer = globalThis.__cubeChessApplication.renderer.pieceRenderer;
    return renderer.factory.__forgeVisualMode === "CRAYON_CATHEDRAL" &&
      renderer.pieces.size === 32 &&
      [...renderer.pieces.values()].every(
        (object) => object.userData?.crayonCathedralModelState === "ready",
      );
  }, null, { timeout: 60_000 });
  const readyMilliseconds = Date.now() - navigationStarted;

  const captureLayout = process.env.FORGEMCP_CRAYON_SKIP_LAYOUT !== "1";
  if (captureLayout) {
    await page.screenshot({ path: `${artifactDir}/menu-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${artifactDir}/menu-mobile.png` });
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.getByTestId("start-game").click();
  } else {
    await page.evaluate(() => globalThis.__cubeChessApplication.startGame({
      mode: "local",
      pieceSet: "CRAYON_CATHEDRAL",
    }));
  }
  await page.waitForFunction(
    () => !document.querySelector("[data-start-menu]")?.classList.contains("open"),
  );
  if (captureLayout) {
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${artifactDir}/board-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      const app = globalThis.__cubeChessApplication;
      app.renderer.cameraController.activeLayerView(app.presentation.activeLevel, true);
    });
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${artifactDir}/board-mobile.png` });
  }

  await page.setViewportSize({ width: 900, height: 900 });
  const canvas = page.locator("canvas.game-canvas");
  const pieces = [];
  for (const side of sides) {
    for (const type of types) {
      const inspection = await page.evaluate(({ side: targetSide, type: targetType }) => {
        const renderer = globalThis.__cubeChessApplication.renderer;
        renderer.boardRenderer.group.visible = false;
        renderer.pieceRenderer.capturedGroup.visible = false;
        let target = null;
        for (const object of renderer.pieceRenderer.pieces.values()) {
          const piece = object.userData?.piece;
          object.visible = !target && piece?.color === targetSide && piece?.type === targetType;
          if (object.visible) target = object;
        }
        if (!target) throw new Error(`Missing ${targetSide} ${targetType}`);

        const fittedHeights = {
          pawn: 0.66,
          rook: 0.81,
          knight: 0.84,
          bishop: 0.87,
          queen: 0.92,
          king: 0.96,
        };
        target.position.set(0, 0, 0);
        target.scale.setScalar(2.75 / fittedHeights[targetType]);
        target.updateMatrixWorld(true);

        const camera = renderer.cameraController;
        camera.cancelAutomaticMove();
        camera.camera.position.set(3.8, 2.7, 5.2);
        camera.controls.target.set(0, 1.28, 0);
        camera.controls.update();

        let triangles = 0;
        let meshes = 0;
        let fullyTexturedMeshes = 0;
        const roles = new Set();
        target.traverse((child) => {
          if (!child.isMesh) return;
          meshes += 1;
          triangles += child.geometry.index?.count
            ? child.geometry.index.count / 3
            : (child.geometry.attributes?.position?.count ?? 0) / 3;
          if (child.userData?.forgeCrayonCathedralRole) {
            roles.add(child.userData.forgeCrayonCathedralRole);
          }
          const material = Array.isArray(child.material) ? child.material[0] : child.material;
          if (material?.map && material.roughnessMap && material.metalnessMap && material.bumpMap && material.emissiveMap) {
            fullyTexturedMeshes += 1;
          }
        });
        return {
          side: targetSide,
          type: targetType,
          source: target.userData.forgeVisualSource,
          state: target.userData.crayonCathedralModelState,
          triangles: Math.round(triangles),
          meshes,
          fullyTexturedMeshes,
          roles: [...roles],
        };
      }, { side, type });

      if (
        inspection.source !== "original-procedural-crayon-cathedral" ||
        inspection.state !== "ready" ||
        inspection.triangles < 45_000 ||
        inspection.fullyTexturedMeshes !== inspection.meshes ||
        !inspection.roles.some((role) => role.includes("window")) ||
        !inspection.roles.some((role) => role.includes("crayon"))
      ) {
        throw new Error(`Invalid Crayon Cathedral evidence: ${JSON.stringify(inspection)}`);
      }
      await page.waitForTimeout(80);
      await canvas.screenshot({ path: `${artifactDir}/${side}-${type}.png` });
      pieces.push(inspection);
    }
  }

  if (consoleErrors.length) {
    throw new Error(`Browser console errors: ${JSON.stringify(consoleErrors)}`);
  }
  await writeFile(
    `${artifactDir}/evidence.json`,
    JSON.stringify({
      verification: "PASS",
      preset: "CRAYON_CATHEDRAL",
      readyMilliseconds,
      desktopAndMobileCaptured: captureLayout,
      pieces,
      consoleErrors,
      capturedAt: new Date().toISOString(),
    }, null, 2),
  );
  console.log(`CRAYON_CATHEDRAL_CAPTURED=${pieces.length}`);
  console.log(`CRAYON_CATHEDRAL_READY_MS=${readyMilliseconds}`);
} finally {
  await browser.close();
  await viteServer?.close();
}
