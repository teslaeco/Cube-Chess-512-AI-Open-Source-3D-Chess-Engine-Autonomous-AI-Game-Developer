import { describe, expect, it } from "vitest";
import { generateLegalMovesForColor } from "../../src/engine3d/index.ts";
import { chooseAdvancedMove } from "./advancedSearch.js";
import { createBoard } from "./searchEngine.js";
import {
  assessRootMoveSafety,
  filterRootMovesBySafety,
  staticExchangeNet,
} from "./rootMoveSafety.js";

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
  piece("white-king", "king", "white", 7, 0, 0),
  piece("black-king", "king", "black", 7, 7, 7),
];

describe("hard AI root move safety", () => {
  it("rejects a queen-for-pawn capture when a rook immediately recaptures", () => {
    const board = createBoard([
      ...kings,
      piece("black-queen", "queen", "black", 0, 4, 0, true),
      piece("white-pawn", "pawn", "white", 0, 3, 0, true),
      piece("white-rook", "rook", "white", 0, 0, 0, true),
    ]);
    const move = findMove(board, "black", "black-queen", 0, 3, 0);

    expect(move).toBeDefined();
    expect(staticExchangeNet(board, move)).toBe(-1300);
    expect(assessRootMoveSafety(board, move, "black")).toMatchObject({
      safe: false,
      reason: "uncompensated-high-value-sacrifice",
      exchangeNet: -1300,
    });

    const filtered = filterRootMovesBySafety(
      board,
      generateLegalMovesForColor(board, "black"),
      "black",
    );
    expect(filtered).not.toContainEqual(move);
  });

  it("wires the safety policy into the actual hard-AI move choice", () => {
    const pieces = [
      ...kings,
      piece("black-queen", "queen", "black", 0, 4, 0, true),
      piece("black-knight", "knight", "black", 5, 5, 5, true),
      piece("white-pawn", "pawn", "white", 0, 3, 0, true),
      piece("white-rook", "rook", "white", 0, 0, 0, true),
    ];

    const selected = chooseAdvancedMove(pieces, "black", {
      maxDepth: 1,
      quiescenceDepth: 1,
      milliseconds: 60_000,
      now: () => 0,
    });

    expect(selected).not.toBeNull();
    expect(selected).not.toMatchObject({
      pieceId: "black-queen",
      capturedPieceId: "white-pawn",
      to: { x: 0, y: 3, z: 0 },
    });
    expect(selected.search).toMatchObject({
      policy: "runtime-blunder-veto-v5",
      rejectedRootMoves: expect.any(Number),
    });
    expect(selected.search.rejectedRootMoves).toBeGreaterThan(0);
  });

  it("allows a materially winning capture even when the rook is recaptured", () => {
    const board = createBoard([
      ...kings,
      piece("black-rook", "rook", "black", 0, 4, 0, true),
      piece("white-queen", "queen", "white", 0, 3, 0, true),
      piece("white-rook", "rook", "white", 0, 0, 0, true),
    ]);
    const move = findMove(board, "black", "black-rook", 0, 3, 0);

    expect(move).toBeDefined();
    expect(staticExchangeNet(board, move)).toBe(800);
    expect(assessRootMoveSafety(board, move, "black")).toMatchObject({
      safe: true,
      reason: "sound-exchange",
      exchangeNet: 800,
    });
  });

  it("allows the narrow exception when promotion remains legal after recapture", () => {
    const board = createBoard([
      ...kings,
      piece("black-queen", "queen", "black", 0, 3, 6, true),
      piece("black-pawn-g", "pawn", "black", 1, 2, 6, true),
      piece("white-pawn", "pawn", "white", 1, 3, 6, true),
      piece("white-rook", "rook", "white", 4, 3, 6, true),
    ]);
    const move = findMove(board, "black", "black-queen", 1, 3, 6);

    expect(move).toBeDefined();
    expect(staticExchangeNet(board, move)).toBe(-1300);
    expect(assessRootMoveSafety(board, move, "black")).toMatchObject({
      safe: true,
      reason: "supports-level-seven-promotion",
      exchangeNet: -1300,
      promotionCredit: 1300,
    });
  });

  it("rejects the exception when the recapture gives check and stops promotion", () => {
    const board = createBoard([
      piece("white-king", "king", "white", 7, 0, 0),
      piece("black-king", "king", "black", 1, 7, 6),
      piece("black-queen", "queen", "black", 0, 3, 6, true),
      piece("black-pawn-g", "pawn", "black", 2, 2, 6, true),
      piece("white-pawn", "pawn", "white", 1, 3, 6, true),
      piece("white-rook", "rook", "white", 4, 3, 6, true),
    ]);
    const move = findMove(board, "black", "black-queen", 1, 3, 6);

    expect(move).toBeDefined();
    expect(staticExchangeNet(board, move)).toBe(-1300);
    expect(assessRootMoveSafety(board, move, "black")).toMatchObject({
      safe: false,
      reason: "uncompensated-high-value-sacrifice",
      exchangeNet: -1300,
      promotionCredit: 0,
    });
  });
});
