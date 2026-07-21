import { describe, expect, it } from "vitest";
import {
  Board3D,
  Coordinate3D,
  evaluatePosition,
  generateLegalMovesForPiece,
  isInCheck,
  isSquareAttacked,
  type Piece,
  type PieceColor,
  type PieceType,
} from "../index.js";

let sequence = 0;

function piece(
  type: PieceType,
  color: PieceColor,
  x: number,
  y: number,
  z: number,
): Piece {
  sequence += 1;
  return {
    id: `${type}-${color}-${sequence}`,
    type,
    color,
    position: new Coordinate3D(x, y, z),
    hasMoved: false,
  };
}

describe("Cube Chess 512 legal rules", () => {
  it("detects attacks through the height axis", () => {
    const rook = piece("rook", "black", 3, 3, 7);
    const target = new Coordinate3D(3, 3, 0);
    const board = new Board3D([rook]);

    expect(isSquareAttacked(board, target, "black")).toBe(true);
  });

  it("treats a friendly occupied square as defended", () => {
    const rook = piece("rook", "white", 0, 0, 0);
    const pawn = piece("pawn", "white", 0, 0, 3);
    const board = new Board3D([rook, pawn]);

    expect(isSquareAttacked(board, pawn.position, "white")).toBe(true);
    expect(
      isSquareAttacked(board, new Coordinate3D(0, 0, 4), "white"),
    ).toBe(false);
  });

  it("detects check from a spatial bishop diagonal", () => {
    const whiteKing = piece("king", "white", 0, 0, 0);
    const blackKing = piece("king", "black", 7, 7, 6);
    const bishop = piece("bishop", "black", 7, 7, 7);
    const board = new Board3D([whiteKing, blackKing, bishop]);

    expect(isInCheck(board, "white")).toBe(true);
    expect(isInCheck(board, "black")).toBe(false);
  });

  it("rejects a pinned piece move that exposes its king", () => {
    const whiteKing = piece("king", "white", 0, 0, 0);
    const whiteRook = piece("rook", "white", 3, 0, 0);
    const blackRook = piece("rook", "black", 7, 0, 0);
    const blackKing = piece("king", "black", 7, 7, 7);
    const board = new Board3D([
      whiteKing,
      whiteRook,
      blackRook,
      blackKing,
    ]);

    const legalMoves = generateLegalMovesForPiece(board, whiteRook);

    expect(legalMoves.length).toBeGreaterThan(0);
    expect(
      legalMoves.every(
        (move) => move.to.y === 0 && move.to.z === 0,
      ),
    ).toBe(true);
    expect(legalMoves.some((move) => move.to.equals(blackRook.position))).toBe(
      true,
    );
  });

  it("does not allow a king to enter an attacked square", () => {
    const whiteKing = piece("king", "white", 0, 0, 0);
    const blackKing = piece("king", "black", 7, 7, 7);
    const blackRook = piece("rook", "black", 1, 7, 0);
    const board = new Board3D([whiteKing, blackKing, blackRook]);

    const legalMoves = generateLegalMovesForPiece(board, whiteKing);

    expect(
      legalMoves.some((move) => move.to.equals(new Coordinate3D(1, 0, 0))),
    ).toBe(false);
  });

  it("classifies an active checked position when an escape exists", () => {
    const whiteKing = piece("king", "white", 0, 0, 0);
    const blackKing = piece("king", "black", 7, 7, 7);
    const blackRook = piece("rook", "black", 0, 0, 7);
    const board = new Board3D([whiteKing, blackKing, blackRook]);

    expect(evaluatePosition(board, "white")).toEqual({
      kind: "active",
      inCheck: true,
    });
  });

  it("detects checkmate in a corner of the 8x8x8 board", () => {
    const blackKing = piece("king", "black", 0, 0, 0);
    const whiteQueen = piece("queen", "white", 1, 1, 1);
    const whiteKing = piece("king", "white", 2, 2, 2);
    const board = new Board3D([blackKing, whiteQueen, whiteKing]);

    expect(evaluatePosition(board, "black")).toEqual({
      kind: "checkmate",
      winner: "white",
    });
  });

  it("detects stalemate when every neighboring cube is attacked", () => {
    const blackKing = piece("king", "black", 0, 0, 0);
    const whiteKing = piece("king", "white", 7, 7, 7);
    const knightSources: readonly [number, number, number][] = [
      [3, 1, 0],
      [1, 3, 0],
      [1, 0, 3],
      [3, 2, 0],
      [3, 0, 2],
      [0, 3, 2],
      [3, 2, 1],
    ];
    const knights = knightSources.map(([x, y, z]) =>
      piece("knight", "white", x, y, z),
    );
    const board = new Board3D([blackKing, whiteKing, ...knights]);

    expect(isInCheck(board, "black")).toBe(false);
    expect(evaluatePosition(board, "black")).toEqual({ kind: "stalemate" });
  });
});
