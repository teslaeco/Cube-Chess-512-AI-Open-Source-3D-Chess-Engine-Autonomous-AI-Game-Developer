import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = process.env.FORGEMCP_PREVIEW_URL ?? "http://127.0.0.1:4173";
const artifactDir = process.env.FORGEMCP_ARTIFACT_DIR ?? "artifacts/forgemcp-premium-live";
const types = ["pawn", "rook", "knight", "bishop", "queen", "king"];
const sides = ["black", "white"];
await mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 900, height: 900 } });
await context.addInitScript(() => {
  sessionStorage.setItem(
    "cubeChessIdentity",
    JSON.stringify({
      mode: "guest",
      provider: "guest",
      playerId: "guest-staunton-closeup-ci",
      displayName: "Staunton Closeup CI",
    }),
  );
});
const page = await context.newPage();
const results = [];

try {
  await page.goto(`${baseUrl}/?e2e=1`, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForFunction(() => Boolean(globalThis.__forgeMcpCubeApplication?.renderer?.pieceRenderer), null, { timeout: 20_000 });
  await page.waitForFunction(() => document.querySelector("#app")?.dataset?.authMode === "guest", null, { timeout: 20_000 });
  await page.evaluate(() => {
    globalThis.__forgeMcpCubeApplication.startGame({
      mode: "local",
      humanSide: "white",
      whiteName: "Closeup White",
      blackName: "Closeup Black",
      clockMinutes: 0,
    });
  });
  await page.waitForFunction(() => globalThis.__forgeMcpCubeApplication?.renderer?.pieceRenderer?.pieces?.size === 32, null, { timeout: 20_000 });

  for (const side of sides) {
    for (const type of types) {
      const metrics = await page.evaluate(({ side, type }) => {
        const app = globalThis.__forgeMcpCubeApplication;
        const renderer = app?.renderer;
        const pieceRenderer = renderer?.pieceRenderer;
        const cameraController = renderer?.cameraController;
        if (!renderer || !pieceRenderer || !cameraController) throw new Error("Closeup renderer unavailable");

        const all = [...pieceRenderer.pieces.values()];
        const sample = all.find((object) => object.userData?.piece?.type === type && object.userData?.piece?.color === side);
        if (!sample) throw new Error(`Missing runtime sample ${side} ${type}`);

        if (!globalThis.__stauntonCloseupRestore) {
          globalThis.__stauntonCloseupRestore = {
            boardVisible: renderer.boardRenderer.group.visible,
            capturedVisible: pieceRenderer.capturedGroup.visible,
            cameraPosition: cameraController.camera.position.clone(),
            cameraTarget: cameraController.controls.target.clone(),
            minDistance: cameraController.controls.minDistance,
            maxDistance: cameraController.controls.maxDistance,
            pieceVisibility: all.map((object) => [object, object.visible]),
          };
        }

        renderer.boardRenderer.group.visible = false;
        pieceRenderer.capturedGroup.visible = false;
        for (const object of all) object.visible = object === sample;
        sample.updateMatrixWorld(true);

        // Compute a real world-space AABB directly from rendered mesh vertices.
        // This deliberately avoids a bare `import("three")` in production preview,
        // which browsers cannot resolve outside Vite's source-module graph.
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        let vertexCount = 0;
        sample.traverse((child) => {
          if (!child.isMesh || !child.geometry?.attributes?.position) return;
          child.updateMatrixWorld(true);
          const position = child.geometry.attributes.position;
          const e = child.matrixWorld.elements;
          for (let i = 0; i < position.count; i += 1) {
            const x = position.getX(i);
            const y = position.getY(i);
            const z = position.getZ(i);
            const wx = e[0] * x + e[4] * y + e[8] * z + e[12];
            const wy = e[1] * x + e[5] * y + e[9] * z + e[13];
            const wz = e[2] * x + e[6] * y + e[10] * z + e[14];
            minX = Math.min(minX, wx); maxX = Math.max(maxX, wx);
            minY = Math.min(minY, wy); maxY = Math.max(maxY, wy);
            minZ = Math.min(minZ, wz); maxZ = Math.max(maxZ, wz);
            vertexCount += 1;
          }
        });
        if (!vertexCount || ![minX,minY,minZ,maxX,maxY,maxZ].every(Number.isFinite)) {
          throw new Error(`Invalid bounds ${side} ${type}`);
        }

        const width = maxX - minX;
        const height = maxY - minY;
        const depth = maxZ - minZ;
        const center = {
          x: (minX + maxX) / 2,
          y: (minY + maxY) / 2,
          z: (minZ + maxZ) / 2,
        };
        const radius = Math.hypot(width, height, depth) / 2;
        if (!Number.isFinite(radius) || radius <= 0) throw new Error(`Invalid radius ${side} ${type}`);

        const camera = cameraController.camera;
        const controls = cameraController.controls;
        cameraController.cancelAutomaticMove();
        controls.minDistance = 0.18;
        controls.maxDistance = 12;
        const verticalFov = camera.fov * Math.PI / 180;
        const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
        const limitingFov = Math.max(0.25, Math.min(verticalFov, horizontalFov));
        const distance = Math.max(0.55, (radius / Math.sin(limitingFov / 2)) * 1.55);
        const dx = 1.35, dy = 0.58, dz = 2.2;
        const dLen = Math.hypot(dx, dy, dz);
        camera.position.set(
          center.x + (dx / dLen) * distance,
          center.y + (dy / dLen) * distance,
          center.z + (dz / dLen) * distance,
        );
        controls.target.set(center.x, center.y, center.z);
        controls.update();
        camera.updateMatrixWorld(true);

        return {
          type,
          side,
          width,
          height,
          depth,
          radius,
          cameraDistance: distance,
          vertexCount,
          source: sample.userData?.forgeVisualSource ?? null,
          revision: sample.userData?.openSourceStauntonRevision ?? null,
        };
      }, { side, type });

      await page.waitForTimeout(180);
      await page.screenshot({ path: `${artifactDir}/closeup-${side}-${type}.png`, fullPage: true });
      results.push(metrics);
    }
  }

  await page.evaluate(() => {
    const app = globalThis.__forgeMcpCubeApplication;
    const renderer = app?.renderer;
    const pieceRenderer = renderer?.pieceRenderer;
    const cameraController = renderer?.cameraController;
    const restore = globalThis.__stauntonCloseupRestore;
    if (!renderer || !pieceRenderer || !cameraController || !restore) return;
    renderer.boardRenderer.group.visible = restore.boardVisible;
    pieceRenderer.capturedGroup.visible = restore.capturedVisible;
    for (const [object, visible] of restore.pieceVisibility) object.visible = visible;
    cameraController.cancelAutomaticMove();
    cameraController.camera.position.copy(restore.cameraPosition);
    cameraController.controls.target.copy(restore.cameraTarget);
    cameraController.controls.minDistance = restore.minDistance;
    cameraController.controls.maxDistance = restore.maxDistance;
    cameraController.controls.update();
    delete globalThis.__stauntonCloseupRestore;
  });

  await writeFile(`${artifactDir}/closeup-metrics.json`, JSON.stringify({ verification: "PASS", results }, null, 2));
  console.log(`STAUNTON_CLOSEUPS=${results.length}`);
} finally {
  await browser.close();
}
