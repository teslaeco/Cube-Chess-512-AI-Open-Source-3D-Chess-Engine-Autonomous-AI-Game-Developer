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

function addresses(moves: ReturnType<typeof generatePseudoLegalMoves>): string[] {
  return moves.map((move) => move.to.toSquareAddress());
}

describe("Cube Chess 512 pseudo-legal movement geometry", () => {
  it("defines the canonical number of 3D directions", () => {
    expect(ROOK_DIRECTIONS).toHaveLength(6);
    expect(BISHOP_DIRECTIONS).toHaveLength(20);
    expect(QUEEN_DIRECTIONS).toHaveLength(26);
    expect(KING_DIRECTIONS).toHaveLength(26);
    expect(KNIGHT_OFFSETS).toHaveLength(24);
  });

  it("keeps classic rook movement on one level and adds vertical movement", () => {
    const rook = piece("rook");
    const moves = generatePseudoLegalMoves(new Board3D([rook]), rook);
    const result = addresses(moves);

    expect(result).toContain("D:d8");
    expect(result).toContain("D:h4");
    expect(result).toContain("A:d4");
    expect(result).toContain("H:d4");
    expect(moves).toHaveLength(21);
  });

  it("stops a sliding piece at a friendly blocker", () => {
    const rook = piece("rook");
    const blocker = piece("pawn", 3, 3, 5);
    const moves = generatePseudoLegalMoves(new Board3D([rook, blocker]), rook);
    const result = addresses(moves);

    expect(result).toContain("E:d4");
    expect(result).not.toContain("F:d4");
    expect(result).not.toContain("G:d4");
  });

  it("captures an enemy and never moves beyond it", () => {
    const rook = piece("rook");
    const enemy = piece("pawn", 3, 3, 6, "black");
    const moves = generatePseudoLegalMoves(new Board3D([rook, enemy]), rook);
    const capture = moves.find((move) => move.to.equals(enemy.position));

    expect(capture?.kind).toBe("capture");
    expect(capture?.capturedPieceId).toBe(enemy.id);
    expect(moves.some((move) => move.to.z === 7)).toBe(false);
  });

  it("supports bishop diagonals in a level, between two axes, and through 3D space", () => {
    const bishop = piece("bishop");
    const result = addresses(generatePseudoLegalMoves(new Board3D([bishop]), bishop));

    expect(result).toContain("D:h8");
    expect(result).toContain("H:h4");
    expect(result).toContain("H:h8");
    expect(result).not.toContain("H:d4");
  });

  it("gives a central king 26 one-step destinations", () => {
    const king = piece("king");
    const moves = generatePseudoLegalMoves(new Board3D([king]), king);

    expect(moves).toHaveLength(26);
    expect(new Set(addresses(moves)).size).toBe(26);
  });

  it("gives a central knight 24 unique 2-1-0 destinations", () => {
    const knight = piece("knight");
    const moves = generatePseudoLegalMoves(new Board3D([knight]), knight);

    expect(moves).toHaveLength(24);
    expect(new Set(addresses(moves)).size).toBe(24);
    for (const move of moves) {
      const delta = move.to.subtract(knight.position);
      expect([Math.abs(delta.x), Math.abs(delta.y), Math.abs(delta.z)].sort()).toEqual([0, 1, 2]);
    }
  });

  it("preserves classic knight movement when filtered to the same level", () => {
    const knight = piece("knight");
    const sameLevel = generatePseudoLegalMoves(new Board3D([knight]), knight)
      .filter((move) => move.to.z === knight.position.z);

    expect(sameLevel).toHaveLength(8);
  });

  it("implements white pawn advances on y and z plus captures on x-y and x-z", () => {
    const pawn = piece("pawn");
    const enemyForwardDiagonal = piece("pawn", 4, 4, 3, "black");
    const enemyVerticalDiagonal = piece("pawn", 4, 3, 4, "black");
    const moves = generatePseudoLegalMoves(
      new Board3D([pawn, enemyForwardDiagonal, enemyVerticalDiagonal]),
      pawn,
    );
    const result = addresses(moves);

    expect(result).toContain("D:d5");
    expect(result).toContain("E:d4");
    expect(result).toContain("D:d6");
    expect(moves.find((move) => move.to.equals(enemyForwardDiagonal.position))?.kind).toBe("capture");
    expect(moves.find((move) => move.to.equals(enemyVerticalDiagonal.position))?.kind).toBe("capture");
  });

  it("does not allow a moved pawn to advance two squares", () => {
    const pawn = piece("pawn", 3, 3, 3, "white", true);
    const result = addresses(generatePseudoLegalMoves(new Board3D([pawn]), pawn));

    expect(result).not.toContain("D:d6");
  });

  it("does not mutate the board while generating moves", () => {
    const queen = piece("queen");
    const board = new Board3D([queen]);
    const before = board.getAllPieces();

    generatePseudoLegalMoves(board, queen);

    expect(board.getAllPieces()).toEqual(before);
    expect(board.getPieceAt(queen.position)).toEqual(queen);
  });
});
