import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = process.env.FORGEMCP_PREVIEW_URL ?? "http://127.0.0.1:4173";
const artifactDir = process.env.FORGEMCP_CLOSEUP_DIR ?? "artifacts/forgemcp-premium-live/closeups";
const types = ["pawn", "rook", "knight", "bishop", "queen", "king"];
const sides = ["white", "black"];

await mkdir(artifactDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1000, height: 1000 } });

await context.addInitScript(() => {
  sessionStorage.setItem(
    "cubeChessIdentity",
    JSON.stringify({
      mode: "guest",
      provider: "guest",
      playerId: "guest-staunton-closeups",
      displayName: "Staunton Close-up Verification",
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
  await page.goto(`${baseUrl}/?e2e=1`, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForFunction(() => document.querySelector("#app")?.dataset?.authMode === "guest", null, { timeout: 20_000 });
  await page.waitForFunction(() => document.querySelector(".auth-gate")?.classList.contains("auth-gate-hidden"), null, { timeout: 20_000 });
  await page.waitForFunction(() => Boolean(globalThis.__forgeMcpCubeApplication?.renderer?.pieceRenderer), null, { timeout: 20_000 });
  await page.evaluate(() => {
    globalThis.__forgeMcpCubeApplication.startGame({
      mode: "local",
      humanSide: "white",
      whiteName: "Close-up White",
      blackName: "Close-up Black",
      clockMinutes: 0,
    });
  });
  await page.waitForFunction(() => globalThis.__forgeMcpCubeApplication?.renderer?.pieceRenderer?.pieces?.size === 32, null, { timeout: 20_000 });

  const canvas = page.locator("canvas").first();
  await canvas.waitFor({ state: "visible", timeout: 20_000 });
  const evidence = [];

  for (const side of sides) {
    for (const type of types) {
      const inspection = await page.evaluate(({ side: targetSide, type: targetType }) => {
        const renderer = globalThis.__forgeMcpCubeApplication.renderer;
        const pieceRenderer = renderer.pieceRenderer;
        renderer.boardRenderer.group.visible = false;
        pieceRenderer.capturedGroup.visible = false;

        let target = null;
        for (const object of pieceRenderer.pieces.values()) {
          const piece = object.userData?.piece;
          const matches = piece?.color === targetSide && piece?.type === targetType;
          object.visible = matches && !target;
          if (object.visible) target = object;
        }
        if (!target) throw new Error(`No rendered ${targetSide} ${targetType} was found`);

        const fittedHeights = { pawn: 0.23, rook: 0.30, knight: 0.34, bishop: 0.37, queen: 0.41, king: 0.45 };
        target.position.set(0, 0, 0);
        target.scale.setScalar(2.6 / fittedHeights[targetType]);
        target.updateMatrixWorld(true);

        const cameraController = renderer.cameraController;
        cameraController.cancelAutomaticMove();
        cameraController.camera.position.set(3.1, 2.25, 3.8);
        cameraController.controls.target.set(0, 1.15, 0);
        cameraController.controls.update();

        let meshes = 0;
        let triangles = 0;
        const roles = new Set();
        const sources = new Set();
        target.traverse((child) => {
          if (child.userData?.openSourceStauntonRole) roles.add(child.userData.openSourceStauntonRole);
          if (child.userData?.forgeVisualSource) sources.add(child.userData.forgeVisualSource);
          if (!child.isMesh || child.userData?.decorative) return;
          meshes += 1;
          triangles += child.geometry?.index?.count
            ? Math.floor(child.geometry.index.count / 3)
            : Math.floor((child.geometry?.attributes?.position?.count ?? 0) / 3);
        });
        if (target.userData?.forgeVisualSource) sources.add(target.userData.forgeVisualSource);
        return { side: targetSide, type: targetType, meshes, triangles, roles: [...roles], sources: [...sources] };
      }, { side, type });

      if (!inspection.sources.includes("open-source-staunton-v14-carved-polyhedral")) {
        throw new Error(`Close-up ${side} ${type} lacks v14 provenance: ${JSON.stringify(inspection.sources)}`);
      }
      if (inspection.meshes === 0 || inspection.triangles === 0 || inspection.roles.length === 0) {
        throw new Error(`Close-up ${side} ${type} has invalid model evidence: ${JSON.stringify(inspection)}`);
      }
      await page.waitForTimeout(100);
      await canvas.screenshot({ path: `${artifactDir}/${side}-${type}.png` });
      evidence.push(inspection);
    }
  }

  if (consoleErrors.length > 0) {
    throw new Error(`Browser console errors were recorded: ${JSON.stringify(consoleErrors)}`);
  }

  await writeFile(
    `${artifactDir}/evidence.json`,
    JSON.stringify({ verification: "PASS", authGateHidden: true, visibleCanvasVerified: true, pieces: evidence, consoleErrors, capturedAt: new Date().toISOString() }, null, 2),
  );
  console.log(`STAUNTON_CLOSEUPS_CAPTURED=${evidence.length}`);
} finally {
  await browser.close();
}
