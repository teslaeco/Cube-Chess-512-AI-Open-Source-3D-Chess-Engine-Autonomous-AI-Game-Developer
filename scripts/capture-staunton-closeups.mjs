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
      const metrics = await page.evaluate(async ({ side, type }) => {
        const THREE = await import("three");
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

        const box = new THREE.Box3().setFromObject(sample);
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        const size = box.getSize(new THREE.Vector3());
        if (box.isEmpty() || !Number.isFinite(sphere.radius) || sphere.radius <= 0) throw new Error(`Invalid bounds ${side} ${type}`);

        const camera = cameraController.camera;
        const controls = cameraController.controls;
        cameraController.cancelAutomaticMove();
        controls.minDistance = 0.18;
        controls.maxDistance = 12;
        const verticalFov = THREE.MathUtils.degToRad(camera.fov);
        const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
        const limitingFov = Math.max(0.25, Math.min(verticalFov, horizontalFov));
        const distance = Math.max(0.55, (sphere.radius / Math.sin(limitingFov / 2)) * 1.55);
        const direction = new THREE.Vector3(1.35, 0.58, 2.2).normalize();
        camera.position.copy(sphere.center).addScaledVector(direction, distance);
        controls.target.copy(sphere.center);
        controls.update();
        camera.updateMatrixWorld(true);

        return {
          type,
          side,
          width: size.x,
          height: size.y,
          depth: size.z,
          radius: sphere.radius,
          cameraDistance: distance,
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
