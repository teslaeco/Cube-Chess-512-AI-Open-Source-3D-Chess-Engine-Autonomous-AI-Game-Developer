import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = process.env.FORGEMCP_PREVIEW_URL ?? "http://127.0.0.1:4173";
const artifactDir = process.env.FORGEMCP_ARTIFACT_DIR ?? "artifacts/forgemcp-premium-live";
await mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

// Browser E2E harness: this captures the exact tool objects the app registers and
// executes their real callbacks. It is NOT a substitute for final Chrome 149+
// / ChatGPT WebMCP compatibility testing against the platform-provided API.
await context.addInitScript(() => {
  // Vite preview runs the production build, so the DEV-only ?e2e=1 identity
  // bootstrap in web/main.js is intentionally unavailable. Seed the same guest
  // identity before application modules execute so visual evidence captures the
  // actual board rather than the authentication overlay.
  sessionStorage.setItem(
    "cubeChessIdentity",
    JSON.stringify({
      mode: "guest",
      provider: "guest",
      playerId: "guest-forgemcp-visual-ci",
      displayName: "ForgeMCP Visual CI",
    }),
  );

  const registered = {};
  Object.defineProperty(window, "__forgemcpRegisteredTools", { value: registered, configurable: false });
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: {
      async registerTool(tool) {
        registered[tool.name] = tool;
      },
    },
  });
});

const page = await context.newPage();
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

async function captureDesktopAndMobile(name) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: `${artifactDir}/${name}.png`, fullPage: true });
  await page.setViewportSize({ width: 675, height: 1500 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${artifactDir}/${name}-mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(150);
}

// Visual QA needs more than a full-board screenshot: the strict 8x8x8 scale makes
// individual pieces too small to judge anatomy. This studio pass temporarily hides
// the board and non-sample pieces, enlarges one live runtime instance of each role,
// and photographs all six roles for each side. It mutates only transient Three.js
// presentation state inside CI and restores every transform/visibility afterwards.
async function captureStudioSide(side) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate((requestedSide) => {
    const app = globalThis.__forgeMcpCubeApplication;
    const renderer = app?.renderer;
    const pieceRenderer = renderer?.pieceRenderer;
    const cameraController = renderer?.cameraController;
    if (!pieceRenderer || !cameraController) throw new Error("Studio QA renderer is unavailable");

    const types = ["pawn", "rook", "knight", "bishop", "queen", "king"];
    const all = [...pieceRenderer.pieces.values()];
    const samples = types.map((type) => all.find((object) => {
      const piece = object.userData?.piece;
      return piece?.type === type && piece?.color === requestedSide;
    }));
    if (samples.some((sample) => !sample)) throw new Error(`Missing ${requestedSide} studio sample`);

    const restore = {
      boardVisible: renderer.boardRenderer.group.visible,
      cameraPosition: cameraController.camera.position.clone(),
      cameraTarget: cameraController.controls.target.clone(),
      pieces: all.map((object) => ({
        object,
        visible: object.visible,
        position: object.position.clone(),
        scale: object.scale.clone(),
      })),
    };
    globalThis.__forgeStudioRestore = restore;

    renderer.boardRenderer.group.visible = false;
    for (const object of all) object.visible = false;
    samples.forEach((object, index) => {
      object.visible = true;
      object.position.set((index - 2.5) * 1.18, 0, 0);
      object.scale.setScalar(4.0);
    });

    cameraController.cancelAutomaticMove();
    cameraController.camera.position.set(0, 2.35, 7.0);
    cameraController.controls.target.set(0, 0.72, 0);
    cameraController.controls.update();
  }, side);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${artifactDir}/studio-${side}.png`, fullPage: true });

  await page.evaluate(() => {
    const app = globalThis.__forgeMcpCubeApplication;
    const renderer = app?.renderer;
    const cameraController = renderer?.cameraController;
    const restore = globalThis.__forgeStudioRestore;
    if (!restore || !renderer || !cameraController) throw new Error("Studio QA restore state is unavailable");
    renderer.boardRenderer.group.visible = restore.boardVisible;
    for (const item of restore.pieces) {
      item.object.visible = item.visible;
      item.object.position.copy(item.position);
      item.object.scale.copy(item.scale);
    }
    cameraController.cancelAutomaticMove();
    cameraController.camera.position.copy(restore.cameraPosition);
    cameraController.controls.target.copy(restore.cameraTarget);
    cameraController.controls.update();
    delete globalThis.__forgeStudioRestore;
  });
  await page.waitForTimeout(250);
}

try {
  await page.goto(`${baseUrl}/?e2e=1`, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForFunction(() => globalThis.__forgeMcpVisualToolRegistration?.registered === 4, null, { timeout: 20_000 });
  await page.waitForFunction(() => Boolean(globalThis.__forgeMcpCubeApplication?.renderer?.pieceRenderer), null, { timeout: 20_000 });
  await page.waitForFunction(() => document.querySelector("#app")?.dataset?.authMode === "guest", null, { timeout: 20_000 });

  await page.evaluate(() => {
    const app = globalThis.__forgeMcpCubeApplication;
    app.startGame({
      mode: "local",
      humanSide: "white",
      whiteName: "ForgeMCP White",
      blackName: "ForgeMCP Black",
      clockMinutes: 0,
    });
  });

  await page.waitForFunction(() => {
    const pieces = globalThis.__forgeMcpCubeApplication?.renderer?.pieceRenderer?.pieces;
    return pieces instanceof Map && pieces.size === 32;
  }, null, { timeout: 20_000 });

  // Give the real legacy compact Meshy pipeline a chance to fetch/parse its
  // .ccm.b64 browser assets before measuring BEFORE. If any asset fails, the
  // inspect result still records the actual fallback state rather than faking it.
  await page.waitForTimeout(1_500);
  await captureDesktopAndMobile("before");

  const before = await page.evaluate(async () => {
    const tool = globalThis.__forgemcpRegisteredTools?.inspect_piece_visuals;
    if (!tool?.execute) throw new Error("inspect_piece_visuals was not registered");
    return tool.execute({});
  });

  const preview = await page.evaluate(async () => {
    const tool = globalThis.__forgemcpRegisteredTools?.preview_piece_visual_upgrade;
    return tool.execute({ preset: "FORGEMCP_PREMIUM" });
  });

  const denied = await page.evaluate(async () => {
    const tool = globalThis.__forgemcpRegisteredTools?.upgrade_piece_visuals;
    return tool.execute({ preset: "FORGEMCP_PREMIUM", humanApproved: false });
  });
  if (denied?.state !== "FAIL") throw new Error("Human-approval gate did not reject unapproved mutation");

  const upgraded = await page.evaluate(async () => {
    const tool = globalThis.__forgemcpRegisteredTools?.upgrade_piece_visuals;
    return tool.execute({ preset: "FORGEMCP_PREMIUM", humanApproved: true });
  });
  if (upgraded?.state !== "PASS") throw new Error(`Premium live upgrade failed: ${JSON.stringify(upgraded)}`);
  if (upgraded?.data?.presetAfter !== "FORGEMCP_PREMIUM") throw new Error("Premium preset was not applied");
  if (upgraded?.data?.qa?.result !== "PASS") throw new Error(`Premium live QA failed: ${JSON.stringify(upgraded.data.qa)}`);

  await captureDesktopAndMobile("after");
  await captureStudioSide("black");
  await captureStudioSide("white");

  const rollback = await page.evaluate(async () => {
    const tool = globalThis.__forgemcpRegisteredTools?.rollback_piece_visuals;
    return tool.execute({ humanApproved: true });
  });
  if (rollback?.state !== "PASS") throw new Error(`Rollback failed: ${JSON.stringify(rollback)}`);
  if (rollback?.data?.presetAfter !== "LEGACY_COMPACT") throw new Error("Legacy preset was not restored");
  if (rollback?.data?.qa?.result !== "PASS") throw new Error(`Rollback QA failed: ${JSON.stringify(rollback.data.qa)}`);

  await captureDesktopAndMobile("rollback");

  const evidence = {
    verification: "PASS",
    harness: "Chromium browser E2E with injected document.modelContext registration collector",
    visualEvidence: "Desktop 1440x1000 and mobile 675x1500 board screenshots plus isolated 6-role black/white studio screenshots from the live runtime objects.",
    limitation: "Final compatibility with the platform-provided WebMCP API still requires Chrome 149+ or ChatGPT in-app browser testing.",
    url: page.url(),
    before,
    preview,
    denied,
    upgraded,
    rollback,
    consoleErrors,
    capturedAt: new Date().toISOString(),
  };
  await writeFile(`${artifactDir}/evidence.json`, JSON.stringify(evidence, null, 2));
  console.log("FORGEMCP_LIVE_BEFORE_AFTER=" + JSON.stringify({
    beforePreset: upgraded.data.presetBefore,
    afterPreset: upgraded.data.presetAfter,
    activePieces: upgraded.data.activePieces,
    capturedPieces: upgraded.data.capturedPieces,
    trianglesBefore: upgraded.data.trianglesBefore,
    trianglesAfter: upgraded.data.trianglesAfter,
    triangleDelta: upgraded.data.triangleDelta,
    perTypePremiumTriangles: upgraded.data.perTypePremiumTriangles,
    qa: upgraded.data.qa,
    rollbackPreset: rollback.data.presetAfter,
    rollbackQa: rollback.data.qa,
  }));
} finally {
  await browser.close();
}
