import { describe, expect, it } from "vitest";
import { chooseBestMove } from "../ai/searchEngine.js";

function piece(id, type, color, x, y, z) {
  return {
    id,
    type,
    color,
    hasMoved: false,
    position: { x, y, z },
  };
}

describe("computer opponent tactical search", () => {
  it("captures a free queen with a rook instead of ignoring it", () => {
    const pieces = [
      piece("white-king", "king", "white", 7, 0, 0),
      piece("white-queen", "queen", "white", 0, 3, 0),
      piece("black-king", "king", "black", 7, 7, 7),
      piece("black-rook", "rook", "black", 0, 7, 0),
    ];

    const move = chooseBestMove(pieces, "black", "hard", {
      maxDepth: 2,
      quiescenceDepth: 3,
      milliseconds: 10_000,
      now: () => 0,
    });

    expect(move).toMatchObject({
      pieceId: "black-rook",
      capturedPieceId: "white-queen",
      to: { x: 0, y: 3, z: 0 },
    });
  });

  it("returns a legal move when the time budget expires during deeper iterations", () => {
    const pieces = [
      piece("white-king", "king", "white", 4, 0, 0),
      piece("white-pawn", "pawn", "white", 3, 1, 0),
      piece("black-king", "king", "black", 4, 7, 0),
      piece("black-pawn", "pawn", "black", 3, 6, 0),
    ];
    let ticks = 0;

    const move = chooseBestMove(pieces, "black", "hard", {
      maxDepth: 4,
      milliseconds: 4,
      now: () => ticks++,
    });

    expect(move).not.toBeNull();
    expect(move.pieceId).toBeTruthy();
    expect(move.from).toBeTruthy();
    expect(move.to).toBeTruthy();
  });
});
