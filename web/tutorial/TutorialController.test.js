import { describe, expect, it } from "vitest";
import {
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

  it("loads versioned progress and clamps damaged step values", () => {
    const storage = {
      getItem: () => JSON.stringify({ version: 1, step: 999, autoExplain: false }),
    };
    expect(loadTutorialProgress(storage)).toMatchObject({
      version: 1,
      step: 4,
      autoExplain: false,
    });
  });

  it("falls back safely for invalid or old stored data", () => {
    expect(loadTutorialProgress({ getItem: () => "broken" })).toMatchObject({
      version: 1,
      step: 0,
      skipped: false,
      complete: false,
      autoExplain: true,
    });
    expect(loadTutorialProgress({ getItem: () => JSON.stringify({ version: 0, step: 3 }) }).step).toBe(0);
  });
});
