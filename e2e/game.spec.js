import { expect, test } from "@playwright/test";

async function projectedPoint(page, kind, id) {
  return page.evaluate(
    ({ kind, id }) => {
      const app = window.__cubeChessApplication;
      const renderer = app.renderer;
      const object =
        kind === "piece"
          ? renderer.pieceRenderer.pieces.get(id)
          : renderer.boardRenderer.overlays.get(id);
      if (!object) throw new Error(`Missing ${kind} ${id}`);
      renderer.sceneController.scene.updateMatrixWorld(true);
      renderer.cameraController.camera.updateMatrixWorld(true);

      // Keep the click inside the lower body shared by every selectable figure set.
      const position = kind === "piece"
        ? object.localToWorld(object.position.clone().set(0, 0.10, 0))
        : object.getWorldPosition(object.position.clone().set(0, 0, 0));
      position.project(renderer.cameraController.camera);
      const rect = renderer.sceneController.renderer.domElement.getBoundingClientRect();
      return {
        x: rect.left + ((position.x + 1) / 2) * rect.width,
        y: rect.top + ((1 - position.y) / 2) * rect.height,
      };
    },
    { kind, id },
  );
}

async function clickProjected(page, kind, id) {
  const point = await projectedPoint(page, kind, id);
  const hasTouch = await page.evaluate(() => navigator.maxTouchPoints > 0);
  if (hasTouch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}

async function waitForSceneSettled(page) {
  await expect
    .poll(
      () => page.evaluate(() => !window.__cubeChessApplication.presentation.busy),
      { timeout: 20_000 },
    )
    .toBe(true);
  await page.evaluate(() => {
    const camera = window.__cubeChessApplication.renderer.cameraController;
    if (camera.desiredPosition && camera.desiredTarget) {
      camera.moveTo(camera.desiredPosition, camera.desiredTarget, true);
    }
  });
  await page.waitForTimeout(100);
}

test.beforeEach(async ({ page }) => {
  await page.goto("?e2e=1");
  await expect(page.locator("canvas.game-canvas")).toBeVisible();
});

test("opens nine functional menu sections and switches ar-PS to RTL", async ({ page }) => {
  test.setTimeout(90_000);
  await expect(page.locator("[data-panel]")).toHaveCount(9);
  for (const [index, panel] of [
    "newGame",
    "save",
    "online",
    "settings",
    "subscribe",
    "license",
    "help",
    "about",
    "forgemcp",
  ].entries()) {
    await page.getByTestId(`menu-${panel}`).click({ force: true });
    await expect(page.locator(".panel-heading > span")).toHaveText(
      String(index + 1).padStart(2, "0"),
    );
  }
  await page.getByTestId("menu-about").click({ force: true });
  await expect(page.locator(".about-copy")).toContainText("Sebastian Laskowski");
  await page.getByTestId("menu-forgemcp").click({ force: true });
  await expect(page.locator(".forgemcp-panel")).toContainText("PROMOTE or REJECT");
  await expect(page.locator('.forgemcp-links a[href="./forgemcp/"]')).toBeVisible();
  await page.locator("[data-language]").selectOption("ar-PS");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByTestId("menu-newGame")).toContainText("لعبة جديدة");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.locator("[data-language]").selectOption("pl");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-start-menu]")).not.toHaveClass(/open/);
  await page.locator('[data-action="open-menu"]').click({ force: true });
  await page.getByTestId("close-menu").click({ force: true });
  await expect(page.locator("[data-start-menu]")).not.toHaveClass(/open/);
});

test("starts a local game and executes a real raycast pawn move", async ({ page }) => {
  await page.locator("[data-language]").selectOption("pl");
  await page.getByTestId("start-game").click();
  await expect(page.locator("[data-start-menu]")).not.toHaveClass(/open/);
  await waitForSceneSettled(page);
  await clickProjected(page, "piece", "white-pawn-5");
  await expect(page.locator("[data-legal]")).not.toHaveText("0");
  await clickProjected(page, "square", "A:e3");
  await expect(page.locator("[data-turn]")).toHaveText("Czarne");
});

test("chooses Crayon Cathedral before player mode and uses it in the real game", async ({ page }) => {
  test.setTimeout(90_000);
  await page.locator("[data-language]").selectOption("pl");
  const pickerOrder = await page.locator("[data-new-game-form]").evaluate((form) => {
    const sets = form.querySelector(".piece-set-picker");
    const modes = form.querySelector(".game-mode-picker");
    return Boolean(sets && modes && (sets.compareDocumentPosition(modes) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(pickerOrder).toBe(true);

  await page.locator('input[name="pieceSet"][value="CRAYON_CATHEDRAL"]').check();
  await expect(page.locator("#app")).toHaveAttribute("data-piece-set", "CRAYON_CATHEDRAL");
  await expect.poll(() => page.evaluate(() => {
    const app = window.__cubeChessApplication;
    const objects = [...app.renderer.pieceRenderer.pieces.values()];
    return {
      preset: app.renderer.pieceRenderer.factory.__forgeVisualMode,
      ready: objects.filter((object) => object.userData.crayonCathedralModelState === "ready").length,
    };
  }), { timeout: 30_000 }).toEqual({ preset: "CRAYON_CATHEDRAL", ready: 32 });

  await page.locator('input[name="mode"][value="computer"]').check();
  await page.getByTestId("start-game").click();
  await expect(page.locator("[data-start-menu]")).not.toHaveClass(/open/);
  const gameConfig = await page.evaluate(() => ({
    pieceSet: window.__cubeChessApplication.presentation.gameConfig.pieceSet,
    mode: window.__cubeChessApplication.presentation.gameConfig.mode,
    persisted: localStorage.getItem("cubeChessPieceSet"),
  }));
  expect(gameConfig).toEqual({
    pieceSet: "CRAYON_CATHEDRAL",
    mode: "computer",
    persisted: "CRAYON_CATHEDRAL",
  });
});

test("uses Lab high-detail geometry for the third Classic Black & White board", async ({ page }) => {
  test.setTimeout(90_000);
  await page.locator("[data-language]").selectOption("pl");
  await page.locator('input[name="pieceSet"][value="CLASSIC_BLACK_WHITE"]').check();
  await expect(page.locator("#app")).toHaveAttribute(
    "data-piece-set",
    "CLASSIC_BLACK_WHITE",
  );
  await expect(page.locator("#app")).toHaveAttribute(
    "data-visual-theme",
    "CLASSIC_BLACK_WHITE",
  );
  await expect(page.locator("[data-lab-ledcolor-config]")).toBeHidden();

  await expect.poll(() => page.evaluate(() => {
    const app = window.__cubeChessApplication;
    const objects = [...app.renderer.pieceRenderer.pieces.values()];
    const styles = new Set();
    for (const object of objects) {
      object.traverse((child) => {
        const material = Array.isArray(child.material)
          ? child.material[0]
          : child.material;
        if (material?.userData?.forgeTextureStyle) {
          styles.add(material.userData.forgeTextureStyle);
        }
      });
    }
    const board = app.renderer.boardRenderer;
    return {
      ready: objects.filter(
        (object) => object.userData.highDetailModelState === "ready",
      ).length,
      styles: [...styles],
      lightSquare: board.levelMaterials.get(0)[0].color.getHexString(),
      darkSquare: board.levelMaterials.get(0)[1].color.getHexString(),
      activeOpacity: board.visualTheme.activeOpacity,
    };
  }), { timeout: 30_000 }).toEqual({
    ready: 32,
    styles: ["classic-black-white-sculpted-pbr"],
    lightSquare: "f2f0e9",
    darkSquare: "090a0d",
    activeOpacity: 0.94,
  });

  await page.getByTestId("start-game").click();
  await expect(page.locator("[data-start-menu]")).not.toHaveClass(/open/);
  expect(await page.evaluate(() => ({
    pieceSet: window.__cubeChessApplication.presentation.gameConfig.pieceSet,
    persisted: localStorage.getItem("cubeChessPieceSet"),
  }))).toEqual({
    pieceSet: "CLASSIC_BLACK_WHITE",
    persisted: "CLASSIC_BLACK_WHITE",
  });
});

test("opens the Lab LEDColor tab and applies saved live colors and lighting", async ({ page }) => {
  test.setTimeout(90_000);
  await page.locator("[data-language]").selectOption("pl");
  await page.locator('input[name="pieceSet"][value="FORGEMCP_PREMIUM"]').check();
  await expect(page.getByTestId("lab-ledcolor-tab")).toBeVisible();
  await expect(page.locator("[data-lab-ledcolor-panel]")).toBeVisible();

  for (const [testId, value] of [
    ["lab-lightSquareColor", "#ccddee"],
    ["lab-darkSquareColor", "#172033"],
    ["lab-whitePieceColor", "#ffddaa"],
    ["lab-blackPieceColor", "#aaccee"],
    ["lab-ledColor", "#ff3366"],
    ["lab-lightColor", "#badaff"],
    ["lab-light-intensity", "1.25"],
  ]) {
    await page.getByTestId(testId).fill(value);
  }

  await expect.poll(() => page.evaluate(() => {
    const app = window.__cubeChessApplication;
    const objects = [...app.renderer.pieceRenderer.pieces.values()];
    const white = objects.find(
      (object) => object.userData.piece?.color === "white" &&
        object.userData.highDetailModelState === "ready",
    );
    const surface = white?.getObjectByProperty("isMesh", true);
    const board = app.renderer.boardRenderer;
    return {
      ready: objects.filter(
        (object) => object.userData.highDetailModelState === "ready",
      ).length,
      lightSquare: board.levelMaterials.get(0)[0].color.getHexString(),
      darkSquare: board.levelMaterials.get(0)[1].color.getHexString(),
      pieceTint: surface?.material?.color?.getHexString?.(),
      led: surface?.material?.emissive?.getHexString?.(),
      keyLight: app.renderer.sceneController.keyLight.color.getHexString(),
      keyIntensity: app.renderer.sceneController.keyLight.intensity,
    };
  }), { timeout: 30_000 }).toEqual({
    ready: 32,
    lightSquare: "ccddee",
    darkSquare: "172033",
    pieceTint: "ffddaa",
    led: "ff3366",
    keyLight: "badaff",
    keyIntensity: 3.375,
  });

  await page.getByTestId("start-game").click();
  const savedSettings = await page.evaluate(() => ({
    config: window.__cubeChessApplication.presentation.gameConfig.labLedColorSettings,
    stored: JSON.parse(localStorage.getItem("cubeChessLabLedColorSettings")),
  }));
  expect(savedSettings.config).toEqual(savedSettings.stored);
  expect(savedSettings.config.ledColor).toBe("#ff3366");
  expect(savedSettings.config.lightIntensity).toBe(1.25);
});

test("keeps selection while a White pawn moves from level A to B", async ({ page }) => {
  await page.locator("[data-language]").selectOption("pl");
  await page.getByTestId("start-game").click();
  await page.locator('[data-action="isolate"]').click({ force: true });
  await page.locator('[data-action="active"]').click({ force: true });
  await waitForSceneSettled(page);
  await clickProjected(page, "piece", "white-pawn-5");
  await expect
    .poll(() =>
      page.evaluate(() => window.__cubeChessApplication.presentation.selectedPieceId),
    )
    .toBe("white-pawn-5");
  await page.locator('[data-action="all"]').click({ force: true });
  await page.locator('[data-level="1"]').click();
  await expect(page.locator("[data-active-level]")).toHaveText("2B");
  await waitForSceneSettled(page);
  await clickProjected(page, "square", "B:e2");
  await expect(page.locator("[data-turn]")).toHaveText("Czarne");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__cubeChessApplication.presentation.pieces.find(
            (piece) => piece.id === "white-pawn-5",
          )?.position.square3D,
      ),
    )
    .toBe("B:e2");
});

test("moves a Black pawn from level A to B through the real canvas", async ({ page }) => {
  await page.locator("[data-language]").selectOption("pl");
  await page.getByTestId("start-game").click();
  await page.evaluate(() => {
    const app = window.__cubeChessApplication;
    app.presentation.sideToMove = "black";
    app.presentation.message = null;
    app.renderer.refresh();
  });
  await page.locator('[data-action="isolate"]').click({ force: true });
  await page.locator('[data-action="active"]').click({ force: true });
  await waitForSceneSettled(page);
  await clickProjected(page, "piece", "black-pawn-5");
  await expect
    .poll(() =>
      page.evaluate(() => window.__cubeChessApplication.presentation.selectedPieceId),
    )
    .toBe("black-pawn-5");
  await page.locator('[data-action="all"]').click({ force: true });
  await page.locator('[data-level="1"]').click();
  await waitForSceneSettled(page);
  await clickProjected(page, "square", "B:e7");
  await expect(page.locator("[data-turn]")).toHaveText("Białe");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__cubeChessApplication.presentation.pieces.find(
            (piece) => piece.id === "black-pawn-5",
          )?.position.square3D,
      ),
    )
    .toBe("B:e7");
});

test("clicking an enemy piece on a legal target executes the capture", async ({ page }) => {
  await page.locator("[data-language]").selectOption("pl");
  await page.getByTestId("start-game").click();
  await page.evaluate(() => {
    const app = window.__cubeChessApplication;
    const pawn = app.presentation.pieces.find((piece) => piece.id === "black-pawn-6");
    pawn.position = {
      x: 5,
      y: 2,
      z: 0,
      file: "f",
      rank: 3,
      level: "A",
      algebraic2D: "f3",
      square3D: "A:f3",
    };
    app.renderer.refresh();
  });
  await page.locator('[data-action="isolate"]').click({ force: true });
  await page.locator('[data-action="active"]').click({ force: true });
  await waitForSceneSettled(page);
  await clickProjected(page, "piece", "white-pawn-5");
  await expect
    .poll(() =>
      page.evaluate(() => window.__cubeChessApplication.presentation.selectedPieceId),
    )
    .toBe("white-pawn-5");
  await clickProjected(page, "piece", "black-pawn-6");
  await expect(page.locator("[data-turn]")).toHaveText("Czarne");
  await expect
    .poll(() =>
      page.evaluate(() => ({
        captured: window.__cubeChessApplication.presentation.capturedPieces.length,
        stillOnBoard: window.__cubeChessApplication.presentation.pieces.some(
          (piece) => piece.id === "black-pawn-6",
        ),
      })),
    )
    .toEqual({ captured: 1, stillOnBoard: false });
});

test("persists and reloads an exact game through IndexedDB", async ({ page }) => {
  await page.locator("[data-language]").selectOption("pl");
  await page.getByTestId("start-game").click();
  await waitForSceneSettled(page);
  await clickProjected(page, "piece", "white-pawn-1");
  await clickProjected(page, "square", "A:a3");
  await expect(page.locator("[data-turn]")).toHaveText("Czarne");

  await page.locator('[data-action="open-menu"]').click();
  await page.getByTestId("menu-save").click();
  await page.locator('[data-action="save-current"]').click();
  await expect.poll(() => page.locator(".save-list article").count()).toBeGreaterThan(0);

  await page.reload();
  await page.getByTestId("menu-save").click();
  await expect.poll(() => page.locator(".save-list article").count()).toBeGreaterThan(0);
  await page.locator('[data-action="load-save"]').first().click();
  await expect(page.locator("[data-turn]")).toHaveText("Czarne");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__cubeChessApplication.presentation.pieces.find(
            (piece) => piece.id === "white-pawn-1",
          )?.position.square3D,
      ),
    )
    .toBe("A:a3");
});

test("camera drag does not select a piece", async ({ page }) => {
  await page.locator("[data-language]").selectOption("pl");
  await page.getByTestId("start-game").click();
  const canvas = page.locator("canvas.game-canvas");
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.62, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.locator("[data-piece]")).toHaveText("Brak");
});

test("menu remains within desktop and mobile viewports", async ({ page }) => {
  const result = await page.locator(".start-menu-card").evaluate((card) => {
    const rect = card.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      width: innerWidth,
      height: innerHeight,
    };
  });
  expect(result.top).toBeGreaterThanOrEqual(0);
  expect(result.left).toBeGreaterThanOrEqual(0);
  expect(result.right).toBeLessThanOrEqual(result.width);
  expect(result.bottom).toBeLessThanOrEqual(result.height);
});

test("background demo uses legal engine moves and stops when a game starts", async ({ page }) => {
  await expect
    .poll(() => page.evaluate(() => window.__cubeChessApplication.presentation.history.length))
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => window.__cubeChessApplication.presentation.appState))
    .toBe("demo");
  await page.getByTestId("start-game").click();
  await expect
    .poll(() => page.evaluate(() => window.__cubeChessApplication.presentation.appState))
    .toBe("playing");
});

test("computer makes the first legal move when the player chooses Black", async ({ page }) => {
  await page.locator("[data-language]").selectOption("pl");
  await page.locator('input[name="mode"][value="computer"]').check();
  await page.locator('select[name="humanSide"]').selectOption("black");
  await page.getByTestId("start-game").click();
  await expect(page.locator("[data-turn]")).toHaveText("Czarne", {
    timeout: 8_000,
  });
  await expect
    .poll(() => page.evaluate(() => window.__cubeChessApplication.presentation.history.length))
    .toBeGreaterThan(0);
});
