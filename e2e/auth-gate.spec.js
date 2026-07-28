import { expect, test } from "@playwright/test";

test.describe("startup authentication gate", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("./");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
  });

  test("blocks the game until a login method or guest mode is selected", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Witaj w Cube Chess 512" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Zaloguj przez Google" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Zaloguj przez Apple" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Zagraj jako gość/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Cube Chess 512 AI/ })).toHaveCount(1);
  });

  test("guest mode stores a temporary identity and opens the main menu", async ({ page }) => {
    await page.getByRole("button", { name: /Zagraj jako gość/ }).click();

    await expect(page.getByRole("heading", { name: "Witaj w Cube Chess 512" })).toBeHidden();
    await expect(page.getByTestId("menu-newGame")).toBeVisible();

    const identity = await page.evaluate(() => JSON.parse(sessionStorage.getItem("cubeChessIdentity")));
    expect(identity).toMatchObject({ mode: "guest", provider: "guest", displayName: "Gość" });
    expect(identity.playerId).toMatch(/^guest-/);
  });
});
