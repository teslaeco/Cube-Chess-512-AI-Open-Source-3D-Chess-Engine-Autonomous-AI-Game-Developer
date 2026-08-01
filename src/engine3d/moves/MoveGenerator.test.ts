import { describe, expect, it } from "vitest";
import {
  BISHOP_DIRECTIONS,
  Board3D,
  Coordinate3D,
  KING_DIRECTIONS,
  KNIGHT_OFFSETS,
  QUEEN_DIRECTIONS,
  ROOK_DIRECTIONS,
  generatePseudoLegalMoves,
  type Piece,
} from "../index.js";

function piece(
  type: Piece["type"],
  x = 3,
  y = 3,
  z = 3,
  color: Piece["color"] = "white",
  hasMoved = false,
): Piece {
  return {
    id: `${type}-${color}-${x}-${y}-${z}`,
    type,
    color,
    position: new Coordinate3D(x, y, z),
    hasMoved,
  };
}

function movesFor(subject: Piece, others: Piece[] = []) {
  return generatePseudoLegalMoves(new Board3D([subject, ...others]), subject);
}

function hasTarget(subject: Piece, x: number, y: number, z: number, others: Piece[] = []) {
  return movesFor(subject, others).some((move) =>
    move.to.equals(new Coordinate3D(x, y, z)),
  );
}

describe("Cube Chess 512 movement geometry audit", () => {
  it("defines the ruleset sliding direction families", () => {
    expect(ROOK_DIRECTIONS).toHaveLength(6);
    expect(BISHOP_DIRECTIONS).toHaveLength(12);
    expect(QUEEN_DIRECTIONS).toHaveLength(26);
    expect(KING_DIRECTIONS).toHaveLength(26);
    expect(KNIGHT_OFFSETS).toHaveLength(24);

    expect(
      BISHOP_DIRECTIONS.every(
        ([x, y]) => x !== 0 && y !== 0,
      ),
    ).toBe(true);
    expect(
      ROOK_DIRECTIONS.every(
        (vector) => vector.filter((value) => value !== 0).length === 1,
      ),
    ).toBe(true);
  });

  describe("rook", () => {
    it("moves along all three axes and never diagonally", () => {
      const rook = piece("rook");
      const moves = movesFor(rook);

      expect(moves).toHaveLength(21);
      expect(hasTarget(rook, 7, 3, 3)).toBe(true);
      expect(hasTarget(rook, 3, 7, 3)).toBe(true);
      expect(hasTarget(rook, 3, 3, 7)).toBe(true);
      expect(hasTarget(rook, 4, 4, 3)).toBe(false);
      expect(hasTarget(rook, 4, 3, 4)).toBe(false);
    });

    it("stops at friendly blockers and after enemy captures", () => {
      const rook = piece("rook");
      const friendly = piece("pawn", 3, 3, 5);
      const enemy = piece("pawn", 6, 3, 3, "black");
      const moves = movesFor(rook, [friendly, enemy]);

      expect(moves.some((move) => move.to.z === 4)).toBe(true);
      expect(moves.some((move) => move.to.z >= 5)).toBe(false);
      expect(moves.find((move) => move.to.equals(enemy.position))?.kind).toBe("capture");
      expect(moves.some((move) => move.to.x === 7 && move.to.y === 3 && move.to.z === 3)).toBe(false);
    });
  });

  describe("bishop", () => {
    it("moves diagonally on the current board level", () => {
      const bishop = piece("bishop");
      expect(hasTarget(bishop, 7, 7, 3)).toBe(true);
      expect(hasTarget(bishop, 0, 0, 3)).toBe(true);
    });

    it("does not turn a straight x move into an x-z diagonal", () => {
      const bishop = piece("bishop");
      expect(hasTarget(bishop, 7, 3, 7)).toBe(false);
      expect(hasTarget(bishop, 0, 3, 0)).toBe(false);
    });

    it("does not turn a straight y move into a y-z diagonal", () => {
      const bishop = piece("bishop");
      expect(hasTarget(bishop, 3, 7, 7)).toBe(false);
      expect(hasTarget(bishop, 3, 0, 0)).toBe(false);
    });

    it("transfers its classical diagonal through height on full spatial diagonals", () => {
      const bishop = piece("bishop");
      expect(hasTarget(bishop, 7, 7, 7)).toBe(true);
      expect(hasTarget(bishop, 0, 0, 0)).toBe(true);
    });

    it("never receives a straight rook move", () => {
      const bishop = piece("bishop");
      expect(hasTarget(bishop, 7, 3, 3)).toBe(false);
      expect(hasTarget(bishop, 3, 7, 3)).toBe(false);
      expect(hasTarget(bishop, 3, 3, 7)).toBe(false);
    });

    it("stops every legal diagonal ray at blockers", () => {
      const bishop = piece("bishop");
      const friendly = piece("pawn", 4, 4, 4);
      const enemy = piece("pawn", 5, 1, 3, "black");
      const moves = movesFor(bishop, [friendly, enemy]);

      expect(moves.some((move) => move.to.equals(friendly.position))).toBe(false);
      expect(hasTarget(bishop, 5, 5, 5, [friendly, enemy])).toBe(false);
      expect(moves.find((move) => move.to.equals(enemy.position))?.kind).toBe("capture");
      expect(hasTarget(bishop, 6, 0, 3, [friendly, enemy])).toBe(false);
    });
  });

  describe("queen", () => {
    it("slides along all 26 3D direction families", () => {
      const queen = piece("queen");
      expect(hasTarget(queen, 7, 3, 3)).toBe(true);
      expect(hasTarget(queen, 7, 7, 3)).toBe(true);
      expect(hasTarget(queen, 7, 3, 7)).toBe(true);
      expect(hasTarget(queen, 3, 7, 7)).toBe(true);
      expect(hasTarget(queen, 7, 7, 7)).toBe(true);
    });

    it("captures forward diagonally on the current and higher levels", () => {
      const queen = piece("queen");
      const sameLevel = piece("rook", 5, 5, 3, "black");
      const forwardUp = piece("bishop", 3, 5, 5, "black");
      const sidewaysUp = piece("knight", 5, 3, 5, "black");
      const fullSpatial = piece("pawn", 1, 1, 1, "black");
      const moves = movesFor(queen, [sameLevel, forwardUp, sidewaysUp, fullSpatial]);

      for (const target of [sameLevel, forwardUp, sidewaysUp, fullSpatial]) {
        expect(moves.find((move) => move.to.equals(target.position))?.kind).toBe("capture");
      }
    });

    it("cannot jump over a captured piece on any queen ray", () => {
      const queen = piece("queen");
      const enemy = piece("pawn", 3, 5, 5, "black");
      const moves = movesFor(queen, [enemy]);

      expect(moves.find((move) => move.to.equals(enemy.position))?.kind).toBe("capture");
      expect(hasTarget(queen, 3, 6, 6, [enemy])).toBe(false);
    });
  });

  describe("king", () => {
    it("has all 26 adjacent destinations from the center", () => {
      const king = piece("king");
      const moves = movesFor(king);
      expect(moves).toHaveLength(26);
      expect(new Set(moves.map((move) => move.to.toSquareAddress())).size).toBe(26);
    });

    it("never moves farther than one cube", () => {
      const king = piece("king");
      for (const move of movesFor(king)) {
        const delta = move.to.subtract(king.position);
        expect(Math.max(Math.abs(delta.x), Math.abs(delta.y), Math.abs(delta.z))).toBe(1);
      }
    });
  });

  describe("knight", () => {
    it("has 24 unique 2-1-0 jumps from the center", () => {
      const knight = piece("knight");
      const moves = movesFor(knight);
      expect(moves).toHaveLength(24);
      expect(new Set(moves.map((move) => move.to.toSquareAddress())).size).toBe(24);
      for (const move of moves) {
        const delta = move.to.subtract(knight.position);
        expect([Math.abs(delta.x), Math.abs(delta.y), Math.abs(delta.z)].sort()).toEqual([0, 1, 2]);
      }
    });

    it("jumps over occupied intermediate cubes", () => {
      const knight = piece("knight");
      const blockers = [
        piece("pawn", 4, 3, 3),
        piece("pawn", 3, 4, 3),
        piece("pawn", 3, 3, 4),
      ];
      expect(movesFor(knight, blockers)).toHaveLength(24);
    });
  });

  describe("pawn", () => {
    it("keeps forward, vertical and forward-up opening advances", () => {
      const pawn = piece("pawn");
      expect(hasTarget(pawn, 3, 4, 3)).toBe(true);
      expect(hasTarget(pawn, 3, 3, 4)).toBe(true);
      expect(hasTarget(pawn, 3, 4, 4)).toBe(true);
      expect(hasTarget(pawn, 3, 5, 3)).toBe(true);
      expect(hasTarget(pawn, 3, 3, 5)).toBe(true);
    });

    it("captures on horizontal and vertical diagonals", () => {
      const pawn = piece("pawn");
      const horizontal = piece("rook", 4, 4, 3, "black");
      const vertical = piece("knight", 4, 3, 4, "black");
      const moves = movesFor(pawn, [horizontal, vertical]);
      expect(moves.find((move) => move.to.equals(horizontal.position))?.kind).toBe("capture");
      expect(moves.find((move) => move.to.equals(vertical.position))?.kind).toBe("capture");
    });

    it("loses both double advances after its first move", () => {
      const pawn = piece("pawn", 3, 3, 3, "white", true);
      expect(hasTarget(pawn, 3, 4, 3)).toBe(true);
      expect(hasTarget(pawn, 3, 5, 3)).toBe(false);
      expect(hasTarget(pawn, 3, 3, 5)).toBe(false);
    });
  });

  it("never mutates the board while generating moves", () => {
    const queen = piece("queen");
    const board = new Board3D([queen]);
    const before = board.getAllPieces();
    generatePseudoLegalMoves(board, queen);
    expect(board.getAllPieces()).toEqual(before);
    expect(board.getPieceAt(queen.position)).toEqual(queen);
  });
});
