import { describe, expect, it, vi } from "vitest";
import { executeAutomatedMovePreservingLevel } from "./automatedMove.js";

describe("automated move level handling", () => {
  it("restores the player's active level after a successful AI move", () => {
    const presentation = {
      activeLevel: 2,
      executeMove: vi.fn(() => {
        presentation.activeLevel = 6;
        return true;
      }),
      setActiveLevel: vi.fn((level) => {
        presentation.activeLevel = level;
      }),
    };

    expect(executeAutomatedMovePreservingLevel(presentation, { pieceId: "black-rook" })).toBe(true);
    expect(presentation.executeMove).toHaveBeenCalledWith(
      { pieceId: "black-rook" },
      { allowBusy: true },
    );
    expect(presentation.setActiveLevel).toHaveBeenCalledWith(2);
    expect(presentation.activeLevel).toBe(2);
  });

  it("does not alter the level when the automated move is rejected", () => {
    const presentation = {
      activeLevel: 4,
      executeMove: vi.fn(() => false),
      setActiveLevel: vi.fn(),
    };

    expect(executeAutomatedMovePreservingLevel(presentation, null)).toBe(false);
    expect(presentation.setActiveLevel).not.toHaveBeenCalled();
    expect(presentation.activeLevel).toBe(4);
  });
});
