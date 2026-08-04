import { describe, expect, it } from "vitest";
import { createInitialPieces } from "../state/initialPosition.js";
import { chooseBasicArmyMove, needsArmyAlternative } from "./basicArmySearch.js";
import { chooseBestMove } from "./searchEngine.js";

function piece(id, type, color, x, y, z, hasMoved = false) {
  return { id, type, color, position: { x, y, z }, hasMoved };
}

describe("basic whole-army search", () => {
  it("detects repeated-piece and early queen monopoly pressure", () => {
    expect(
      needsArmyAlternative({
        selectedPieceId: "black-knight-1",
        selectedPieceType: "knight",
        recentAiPieceIds: ["black-knight-1", "black-knight-1"],
        aiUsageCounts: { "black-knight-1": 2 },
      }),
    ).toBe(true);
    expect(
      needsArmyAlternative({
        selectedPieceId: "black-queen",
        selectedPieceType: "queen",
        recentAiPieceIds: [],
        aiUsageCounts: { "black-queen": 1, "black-pawn-1": 1 },
      }),
    ).toBe(true);
  });

  it("changes a repeated quiet easy move to a safe underused unit", () => {
    const pieces = createInitialPieces();
    const searchOptions = {
      maxDepth: 1,
      quiescenceDepth: 0,
      milliseconds: 60_000,
      now: () => 0,
    };
    const searched = chooseBestMove(pieces, "black", "easy", searchOptions);
    const selected = chooseBasicArmyMove(pieces, "black", "easy", {
      ...searchOptions,
      recentAiPieceIds: [searched.pieceId, searched.pieceId],
      aiUsageCounts: { [searched.pieceId]: 4 },
    });

    expect(selected.pieceId).not.toBe(searched.pieceId);
    expect(selected.search).toMatchObject({
      engine: "classical-basic-army-tiebreak-v1",
      resultSource: "quiet-whole-army-tiebreak",
      replacedPieceId: searched.pieceId,
      armyBroadens: true,
    });
  });

  it("keeps a decisive queen capture even after repeated rook use", () => {
    const pieces = [
      piece("white-king", "king", "white", 7, 0, 7),
      piece("black-king", "king", "black", 7, 7, 7),
      piece("black-rook", "rook", "black", 0, 0, 0, true),
      piece("white-queen", "queen", "white", 0, 3, 0, true),
      piece("black-knight", "knight", "black", 5, 5, 5, true),
    ];
    const selected = chooseBasicArmyMove(pieces, "black", "medium", {
      maxDepth: 1,
      quiescenceDepth: 0,
      milliseconds: 60_000,
      now: () => 0,
      recentAiPieceIds: ["black-rook", "black-rook", "black-rook"],
      aiUsageCounts: { "black-rook": 5 },
    });

    expect(selected).toMatchObject({
      pieceId: "black-rook",
      capturedPieceId: "white-queen",
      to: { x: 0, y: 3, z: 0 },
    });
  });
});
