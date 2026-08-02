import { describe, expect, it } from "vitest";
import { generateLegalMovesForColor } from "../../src/engine3d/index.ts";
import {
  PIECE_VALUES,
  applyMoveForSearch,
  createBoard,
  requiresSearchPromotion,
} from "./searchEngine.js";

function piece(id, type, color, x, y, z, hasMoved = false) {
  return { id, type, color, position: { x, y, z }, hasMoved };
}

const kings = [
  piece("white-king", "king", "white", 7, 0, 0),
  piece("black-king", "king", "black", 6, 7, 7),
];

function moveTo(board, color, x, y, z) {
  return generateLegalMovesForColor(board, color).find(
    (move) => move.to.x === x && move.to.y === y && move.to.z === z,
  );
}

describe("promotion-aware AI search", () => {
  it("sees a pawn entering Level H as an immediate queen", () => {
    const board = createBoard([
      ...kings,
      piece("white-pawn", "pawn", "white", 3, 3, 6, true),
    ]);
    const move = moveTo(board, "white", 3, 3, 7);

    expect(move).toBeDefined();
    expect(requiresSearchPromotion(board.getPieceAt(move.from), move.to)).toBe(true);
    expect(
      applyMoveForSearch(board, move).getAllPieces().find((candidate) => candidate.id === "white-pawn")?.type,
    ).toBe("queen");
  });

  it("sees classical last-rank promotion on Levels A through G", () => {
    const board = createBoard([
      ...kings,
      piece("white-pawn", "pawn", "white", 3, 6, 2, true),
    ]);
    const move = moveTo(board, "white", 3, 7, 2);

    expect(move).toBeDefined();
    expect(
      applyMoveForSearch(board, move).getAllPieces().find((candidate) => candidate.id === "white-pawn")?.type,
    ).toBe("queen");
  });

  it("does not promote an ordinary pawn advance", () => {
    const board = createBoard([
      ...kings,
      piece("white-pawn", "pawn", "white", 3, 2, 2, true),
    ]);
    const move = moveTo(board, "white", 3, 3, 2);

    expect(move).toBeDefined();
    expect(
      applyMoveForSearch(board, move).getAllPieces().find((candidate) => candidate.id === "white-pawn")?.type,
    ).toBe("pawn");
  });

  it("uses Cube Chess material values rather than classical 2D values", () => {
    expect(PIECE_VALUES).toMatchObject({
      pawn: 100,
      knight: 430,
      bishop: 500,
      rook: 600,
      queen: 1400,
    });
    expect(PIECE_VALUES.queen).toBeGreaterThan(2 * PIECE_VALUES.rook);
  });
});
