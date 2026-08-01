import { describe, expect, it } from "vitest";
import {
  TutorialController,
  classifyMove,
  loadTutorialProgress,
  pieceExplanationKey,
} from "./TutorialController.js";

describe("Cube Chess 512 tutorial helpers", () => {
  it("classifies same-level, spatial and capture moves", () => {
    expect(classifyMove({ from: { z: 1 }, to: { z: 1 } })).toBe("same-level");
    expect(classifyMove({ from: { z: 1 }, to: { z: 4 } })).toBe("spatial");
    expect(classifyMove({ from: { z: 1 }, to: { z: 4 }, kind: "capture" })).toBe("capture");
    expect(classifyMove(null)).toBe("unknown");
  });

  it("maps supported pieces to explanation keys", () => {
    expect(pieceExplanationKey({ type: "rook" })).toBe("rook");
    expect(pieceExplanationKey({ kind: "KNIGHT" })).toBe("knight");
    expect(pieceExplanationKey({ type: "dragon" })).toBe("generic");
  });

  it("loads current progress and clamps damaged step values", () => {
    const storage = {
      getItem: () => JSON.stringify({ version: 2, step: 999, autoExplain: false }),
    };
    expect(loadTutorialProgress(storage)).toMatchObject({
      version: 2,
      step: 4,
      autoExplain: false,
      complete: false,
    });
  });

  it("migrates version one progress without restoring the removed launcher state", () => {
    const storage = {
      getItem: () => JSON.stringify({ version: 1, step: 2, skipped: true, autoExplain: true }),
    };
    expect(loadTutorialProgress(storage)).toEqual({
      version: 2,
      step: 2,
      complete: false,
      autoExplain: true,
    });
  });

  it("falls back safely for invalid or unsupported stored data", () => {
    expect(loadTutorialProgress({ getItem: () => "broken" })).toEqual({
      version: 2,
      step: 0,
      complete: false,
      autoExplain: true,
    });
    expect(loadTutorialProgress({ getItem: () => JSON.stringify({ version: 0, step: 3 }) })).toEqual({
      version: 2,
      step: 0,
      complete: false,
      autoExplain: true,
    });
  });

  it("activates only in the dedicated tutorial game mode", () => {
    const controller = Object.create(TutorialController.prototype);
    const playing = { appState: "playing", menuOpen: false };
    expect(controller.isTutorialState({ ...playing, gameConfig: { mode: "tutorial" } })).toBe(true);
    expect(controller.isTutorialState({ ...playing, gameConfig: { mode: "computer" } })).toBe(false);
    expect(controller.isTutorialState({ ...playing, gameConfig: { mode: "local" } })).toBe(false);
    expect(controller.isTutorialState({ ...playing, menuOpen: true, gameConfig: { mode: "tutorial" } })).toBe(false);
  });
});
