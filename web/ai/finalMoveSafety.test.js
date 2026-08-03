import { describe, expect, it } from "vitest";
import { generateLegalMovesForColor } from "../../src/engine3d/index.ts";
import {
  assessImmediateMaterialSafety,
  filterMovesByFinalSafety,
} from "./finalMoveSafety.js";
import { createBoard } from "./searchEngine.js";

function piece(id, type, color, x, y, z, hasMoved = false) {
  return { id, type, color, position: { x, y, z }, hasMoved };
}

function findMove(board, side, pieceId, x, y, z) {
  return generateLegalMovesForColor(board, side).find(
    (move) =>
      move.pieceId === pieceId &&
      move.to.x === x &&
      move.to.y === y &&
      move.to.z === z,
  );
}

const kings = [
  piece("white-king", "king", "white", 7, 0, 7),
  piece("black-king", "king", "black", 7, 7, 7),
];

describe("final runtime material safety", () => {
  it("vetoes queen for pawn when a legal rook recapture exists", () => {
    const board = createBoard([
      ...kings,
      piece("black-queen", "queen", "black", 0, 4, 0, true),
      piece("white-pawn", "pawn", "white", 0, 3, 0, true),
      piece("white-rook", "rook", "white", 0, 0, 0, true),
    ]);
    const move = findMove(board, "black", "black-queen", 0, 3, 0);

    expect(move).toBeDefined();
    expect(assessImmediateMaterialSafety(board, move, "black")).toMatchObject({
      safe: false,
      reason: "immediate-high-value-for-low-value-blunder",
      materialNet: -1300,
      recaptureCount: 1,
      exposedPieceType: "queen",
      capturedPieceType: "pawn",
    });
    expect(
      filterMovesByFinalSafety(
        board,
        generateLegalMovesForColor(board, "black"),
        "black",
      ),
    ).not.toContainEqual(move);
  });

  it("vetoes queen for rook because the queen is still the stronger piece", () => {
    const board = createBoard([
      ...kings,
      piece("black-queen", "queen", "black", 0, 4, 0, true),
      piece("white-rook-target", "rook", "white", 0, 3, 0, true),
      piece("white-rook-recapture", "rook", "white", 0, 0, 0, true),
    ]);
    const move = findMove(board, "black", "black-queen", 0, 3, 0);

    expect(move).toBeDefined();
    expect(assessImmediateMaterialSafety(board, move, "black")).toMatchObject({
      safe: false,
      materialNet: -800,
    });
  });

  it("allows rook for queen even when the rook is immediately recaptured", () => {
    const board = createBoard([
      ...kings,
      piece("black-rook", "rook", "black", 0, 4, 0, true),
      piece("white-queen", "queen", "white", 0, 3, 0, true),
      piece("white-rook", "rook", "white", 0, 0, 0, true),
    ]);
    const move = findMove(board, "black", "black-rook", 0, 3, 0);

    expect(move).toBeDefined();
    expect(assessImmediateMaterialSafety(board, move, "black")).toMatchObject({
      safe: true,
      reason: "equal-or-winning-immediate-exchange",
      materialNet: 800,
    });
  });

  it.each([
    ["bishop", 0, 4, 0],
    ["knight", 0, 5, 0],
  ])("vetoes %s for a pawn with an immediate rook recapture", (type, x, y, z) => {
    const board = createBoard([
      ...kings,
      piece(`black-${type}`, type, "black", x, y, z, true),
      piece("white-pawn", "pawn", "white", 1, 3, 0, true),
      piece("white-rook", "rook", "white", 1, 0, 0, true),
    ]);
    const move = findMove(board, "black", `black-${type}`, 1, 3, 0);

    expect(move).toBeDefined();
    expect(assessImmediateMaterialSafety(board, move, "black")).toMatchObject({
      safe: false,
      reason: "immediate-high-value-for-low-value-blunder",
      capturedPieceType: "pawn",
    });
  });
});
