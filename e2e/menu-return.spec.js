import { test, expect } from "@playwright/test";

// Each individual action must still complete within 30 seconds on software WebGL.
test.use({ actionTimeout: 30_000, navigationTimeout: 30_000 });

async function localOnly(page) {
  page.on("pageerror", error => console.error("LOCAL_GAME_PAGE_ERROR:", error.message));
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    return ["127.0.0.1", "localhost"].includes(url.hostname) ? route.continue() : route.abort();
  });
}

async function openWelcomeAsGuest(page) {
  await localOnly(page);
  await page.goto("./", { waitUntil: "domcontentloaded" });
  await page.locator('[data-auth="guest"]').click();
  await expect(page.getByTestId("start-game")).toBeVisible();
}

test("cancel keeps the match; confirm returns to menu without reloading and preserves saves", async ({ page }) => {
  // Three complete matches share one document. The previous desktop run passed
  // cancel/confirm/save/no-reload, then exhausted its total 90s in repeat setup.
  // Give the whole stress sequence 180s without loosening per-action deadlines.
  test.setTimeout(180_000);
  await openWelcomeAsGuest(page);
  await page.getByTestId("start-game").click();
  await page.evaluate(() => {
    const app = window.__forgeMcpCubeApplication;
    app.renderer.executeAutomatedMove(app.presentation.getLegalMovesForSide()[0]);
    window.__menuDocumentSentinel = "same-document";
  });
  await expect.poll(() => page.evaluate(() => window.__forgeMcpCubeApplication.presentation.busy)).toBe(false);
  const before = await page.evaluate(() => {
    const state = window.__forgeMcpCubeApplication.presentation;
    return { id: state.gameId, pieces: JSON.stringify(state.pieces), sequence: state.moveSequence };
  });
  await page.evaluate(() => window.__forgeMcpCubeApplication.saveGame());
  let documentRequests = 0;
  page.on("request", request => { if (request.resourceType() === "document") documentRequests++; });
  page.once("dialog", async dialog => {
    const warning = dialog.message();
    await dialog.dismiss();
    expect(warning).toContain("Unsaved progress will be lost");
  });
  await page.getByTestId("return-to-menu").click();
  expect(await page.evaluate(() => {
    const state = window.__forgeMcpCubeApplication.presentation;
    return { id: state.gameId, pieces: JSON.stringify(state.pieces), sequence: state.moveSequence };
  })).toEqual(before);
  await expect(page.locator("[data-start-menu]")).toHaveAttribute("aria-hidden", "true");

  page.once("dialog", dialog => dialog.accept());
  await page.getByTestId("return-to-menu").click();
  await expect(page.getByTestId("start-game")).toBeVisible();
  expect(await page.evaluate(() => window.__menuDocumentSentinel)).toBe("same-document");
  expect(documentRequests).toBe(0);
  const saved = await page.evaluate(() => window.__forgeMcpCubeApplication.saveRepository.list());
  expect(saved.some(record => record.id === before.id)).toBe(true);
  for (let repeat = 0; repeat < 2; repeat++) {
    await page.getByTestId("start-game").click();
    expect(await page.evaluate(() => window.__forgeMcpCubeApplication.presentation.moveSequence)).toBe(0);
    page.once("dialog", dialog => dialog.accept());
    await page.getByTestId("return-to-menu").click();
    await expect(page.getByTestId("start-game")).toBeVisible();
  }
  expect(documentRequests).toBe(0);
});

test("About presents the new chess-focused copy in English and Polish", async ({ page }) => {
  await openWelcomeAsGuest(page);
  await page.getByTestId("menu-about").click();
  await expect(page.locator(".about-copy")).toContainText("512 squares");
  await expect(page.locator(".about-copy")).toContainText("updates are coming soon");
  await page.evaluate(() => window.__forgeMcpCubeApplication.renderer.setLanguage("pl"));
  await expect(page.locator(".about-copy")).toContainText("512 polami");
  await expect(page.locator(".about-copy")).toContainText("aktualizacje będą dostępne wkrótce");
});

test("the direct guest entry becomes interactive instead of looping its mutation observer", async ({ page }) => {
  await localOnly(page);
  await page.goto("./guest.html?guest=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("start-game")).toBeVisible();
  await expect(page.locator("#forgemcp-guest-loading")).toBeHidden();
  await page.getByTestId("menu-about").click();
  await expect(page.locator(".about-copy")).toContainText("512 squares");
});
