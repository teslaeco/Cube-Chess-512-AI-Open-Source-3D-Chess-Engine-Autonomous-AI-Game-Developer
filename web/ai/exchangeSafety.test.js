import { describe, expect, it } from "vitest";
import { chooseAdvancedMove } from "./advancedSearch.js";
import { createBoard } from "./searchEngine.js";
import { evaluateStrategicPosition } from "./strategicEvaluation.js";

function piece(id, type, color, x, y, z, hasMoved = false) {
  return { id, type, color, position: { x, y, z }, hasMoved };
}

const kings = [
  piece("white-king", "king", "white", 7, 0, 0),
  piece("black-king", "king", "black", 6, 7, 7),
];

describe("exchange-safe Cube Chess strategy", () => {
  it("scores a safe rook above a rook hanging to a pawn", () => {
    const hanging = createBoard([
      ...kings,
      piece("white-rook", "rook", "white", 3, 3, 0, true),
      piece("black-pawn", "pawn", "black", 2, 4, 0, true),
    ]);
    const safe = createBoard([
      ...kings,
      piece("white-rook", "rook", "white", 4, 3, 0, true),
      piece("black-pawn", "pawn", "black", 2, 4, 0, true),
    ]);

    expect(evaluateStrategicPosition(safe, "white"))
      .toBeGreaterThan(evaluateStrategicPosition(hanging, "white"));
  });

  it("does not give a rook for a pawn when the queen recapture is forced", () => {
    const pieces = [
      ...kings,
      piece("white-queen", "queen", "white", 0, 0, 0),
      piece("white-pawn", "pawn", "white", 0, 3, 0, true),
      piece("black-rook", "rook", "black", 0, 4, 0, true),
      piece("black-knight", "knight", "black", 4, 5, 4, true),
    ];

    const move = chooseAdvancedMove(pieces, "black", {
      maxDepth: 1,
      quiescenceDepth: 2,
      milliseconds: 60_000,
      now: () => 0,
    });

    expect(move).not.toBeNull();
    expect(move).not.toMatchObject({
      pieceId: "black-rook",
      capturedPieceId: "white-pawn",
      to: { x: 0, y: 3, z: 0 },
    });
    expect(move.search.policy).toBe("runtime-blunder-veto-v5");
  });

  it("prefers coordinated development over an unsupported pawn march", () => {
    const pawnMarch = createBoard([
      ...kings,
      piece("white-pawn", "pawn", "white", 3, 5, 0, true),
      piece("white-knight", "knight", "white", 1, 0, 0),
      piece("white-bishop", "bishop", "white", 2, 0, 0),
    ]);
    const coordinated = createBoard([
      ...kings,
      piece("white-pawn", "pawn", "white", 3, 2, 0, true),
      piece("white-knight", "knight", "white", 2, 2, 1, true),
      piece("white-bishop", "bishop", "white", 3, 3, 1, true),
    ]);

    expect(evaluateStrategicPosition(coordinated, "white"))
      .toBeGreaterThan(evaluateStrategicPosition(pawnMarch, "white"));
  });
});
