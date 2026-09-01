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
  sessionStorage.setItem(
    "cubeChessIdentity",
    JSON.stringify({
      mode: "guest",
      provider: "guest",
      playerId: "guest-forgemcp-live-verification",
      displayName: "ForgeMCP Verification",
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

try {
  await page.goto(`${baseUrl}/?e2e=1`, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForFunction(() => document.querySelector("#app")?.dataset?.authMode === "guest", null, { timeout: 20_000 });
  await page.waitForFunction(() => document.querySelector(".auth-gate")?.classList.contains("auth-gate-hidden"), null, { timeout: 20_000 });
  await page.waitForFunction(() => globalThis.__forgeMcpVisualToolRegistration?.registered === 4, null, { timeout: 20_000 });
  await page.waitForFunction(() => Boolean(globalThis.__forgeMcpCubeApplication?.renderer?.pieceRenderer), null, { timeout: 20_000 });

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
  await page.waitForFunction(() => globalThis.__forgeMcpCubeApplication?.renderer?.pieceRenderer?.pieces?.size === 32, null, { timeout: 20_000 });
  await page.locator("canvas").first().waitFor({ state: "visible", timeout: 20_000 });

  const initialRollback = await page.evaluate(async () => {
    const tool = globalThis.__forgemcpRegisteredTools?.rollback_piece_visuals;
    if (!tool?.execute) throw new Error("rollback_piece_visuals was not registered");
    return tool.execute({ humanApproved: true });
  });
  if (initialRollback?.state !== "PASS") throw new Error(`Could not establish a real legacy baseline: ${JSON.stringify(initialRollback)}`);
  if (initialRollback?.data?.presetAfter !== "LEGACY_COMPACT") throw new Error("Legacy baseline preset was not applied");
  if (initialRollback?.data?.qa?.legacyModelsReady !== true) throw new Error(`Legacy compact models were not ready: ${JSON.stringify(initialRollback.data?.legacyModels)}`);

  const before = await page.evaluate(async () => {
    const tool = globalThis.__forgemcpRegisteredTools?.inspect_piece_visuals;
    if (!tool?.execute) throw new Error("inspect_piece_visuals was not registered");
    return tool.execute({});
  });
  if (before?.data?.preset !== "LEGACY_COMPACT") throw new Error(`BEFORE is not the legacy preset: ${JSON.stringify(before)}`);
  if (!before?.data?.sources?.includes("compact-meshy-runtime")) throw new Error(`BEFORE lacks compact Meshy provenance: ${JSON.stringify(before.data?.sources)}`);
  await page.screenshot({ path: `${artifactDir}/before.png`, fullPage: true });

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
  if (upgraded?.data?.liveMutationPerformed !== true) throw new Error("Upgrade did not perform a live mutation");
  if (upgraded?.data?.qa?.geometryChanged !== true || upgraded?.data?.qa?.sourceChanged !== true) throw new Error("Upgrade did not measurably change geometry and provenance");
  if (upgraded?.data?.qa?.premiumSourceVerified !== true) throw new Error(`Premium source was not verified: ${JSON.stringify(upgraded.data?.after?.sources)}`);

  await page.screenshot({ path: `${artifactDir}/after.png`, fullPage: true });

  const rollback = await page.evaluate(async () => {
    const tool = globalThis.__forgemcpRegisteredTools?.rollback_piece_visuals;
    return tool.execute({ humanApproved: true });
  });
  if (rollback?.state !== "PASS") throw new Error(`Rollback failed: ${JSON.stringify(rollback)}`);
  if (rollback?.data?.presetAfter !== "LEGACY_COMPACT") throw new Error("Legacy preset was not restored");
  if (rollback?.data?.qa?.result !== "PASS") throw new Error(`Rollback QA failed: ${JSON.stringify(rollback.data.qa)}`);
  if (rollback?.data?.qa?.legacyModelsReady !== true) throw new Error(`Rollback compact models were not ready: ${JSON.stringify(rollback.data?.legacyModels)}`);
  if (rollback?.data?.qa?.geometryChanged !== true || rollback?.data?.qa?.sourceChanged !== true) throw new Error("Rollback did not measurably restore legacy geometry and provenance");

  await page.screenshot({ path: `${artifactDir}/rollback.png`, fullPage: true });

  if (consoleErrors.length > 0) {
    throw new Error(`Browser console errors were recorded: ${JSON.stringify(consoleErrors)}`);
  }

  const evidence = {
    verification: "PASS",
    harness: "Chromium browser E2E with injected document.modelContext registration collector",
    limitation: "Final compatibility with the platform-provided WebMCP API still requires Chrome 149+ or ChatGPT in-app browser testing.",
    url: page.url(),
    authGateHidden: true,
    visibleCanvasVerified: true,
    initialRollback,
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
