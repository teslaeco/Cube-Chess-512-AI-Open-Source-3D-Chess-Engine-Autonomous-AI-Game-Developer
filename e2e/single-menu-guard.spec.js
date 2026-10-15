import { test, expect } from "@playwright/test";

async function enterGuestMatch(page) {
  await page.route("**/*", route => {
    const host = new URL(route.request().url()).hostname;
    return host === "localhost" || host === "127.0.0.1" ? route.continue() : route.abort();
  });
  await page.goto("./", { waitUntil: "domcontentloaded" });
  await page.locator('[data-auth="guest"]').click();
  await expect(page.getByTestId("start-game")).toBeVisible();
  await page.getByTestId("start-game").click();
  await expect(page.getByTestId("return-to-menu")).toBeVisible();
}

test("exactly one game menu control remains and an active match requests native unload confirmation", async ({ page }) => {
  await enterGuestMatch(page);
  const exit = page.getByTestId("return-to-menu");
  const oldMenu = page.locator('.game-header [data-action="open-menu"]');
  await expect(exit).toHaveCount(1);
  await expect(exit).toBeVisible();
  await expect(oldMenu).toBeHidden();
  await expect(page.getByTestId("menu-return-to-menu")).toHaveCount(0);

  // A real click to start the match supplies the user activation required by
  // browsers before a native beforeunload dialog is permitted.
  const before = await page.evaluate(() => ({
    gameId: window.__forgeMcpCubeApplication.presentation.gameId,
    state: window.__forgeMcpCubeApplication.presentation.appState,
  }));
  expect(before.state).toBe("playing");
  const attemptedReload = page.evaluate(() => window.location.reload()).catch(() => undefined);
  const dialog = await page.waitForEvent("dialog", { timeout: 12_000 });
  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
  await attemptedReload;
  expect(await page.evaluate(() => window.__forgeMcpCubeApplication.presentation.gameId)).toBe(before.gameId);
  await expect(exit).toBeVisible();
});

test("cancelled in-page Exit keeps protection, confirmed Exit stops warning without navigation", async ({ page }) => {
  await enterGuestMatch(page);
  const dispatch = () => page.evaluate(() => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });

  expect(await dispatch()).toBe(true);
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByTestId("return-to-menu").click();
  expect(await dispatch()).toBe(true);
  await expect(page.locator('.game-header [data-action="open-menu"]')).toBeHidden();

  page.once("dialog", dialog => dialog.accept());
  await page.getByTestId("return-to-menu").click();
  await expect(page.getByTestId("start-game")).toBeVisible();
  expect(await dispatch()).toBe(false);
  await expect(page.getByTestId("return-to-menu")).toBeHidden();
  await expect(page.locator('.game-header [data-action="open-menu"]')).toBeVisible();
});
