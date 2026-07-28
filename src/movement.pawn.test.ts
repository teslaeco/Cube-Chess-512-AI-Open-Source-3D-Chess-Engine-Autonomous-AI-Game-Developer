import { describe, expect, it } from "vitest";
import { generatePseudoLegalMoves } from "./movement.js";
import type { Piece, Position } from "./types.js";

function positionWith(...pieces: Piece[]): Position {
  return {
    sideToMove: "white",
    pieces: new Map(pieces.map((piece) => [piece.id, piece])),
  };
}

function destinations(position: Position, pawn: Piece): string[] {
  return generatePseudoLegalMoves(position, pawn)
    .map((move) => `${move.to.x},${move.to.y},${move.to.z}`)
    .sort();
}

describe("Cube Chess 512 pawn movement", () => {
  it("gives an unmoved white pawn all four opening advances", () => {
    const pawn: Piece = {
      id: "white-pawn-h2",
      color: "white",
      type: "pawn",
      position: { x: 7, y: 1, z: 0 },
      hasMoved: false,
    };

    expect(destinations(positionWith(pawn), pawn)).toEqual([
      "7,1,2", // two levels upward
      "7,2,0", // one square forward
      "7,2,1", // one level upward and one square forward
      "7,3,0", // two squares forward
    ]);
  });

  it("treats the two-level opening advance as one atomic 3D move", () => {
    const pawn: Piece = {
      id: "white-pawn-h2",
      color: "white",
      type: "pawn",
      position: { x: 7, y: 1, z: 0 },
      hasMoved: false,
    };
    const intermediateBlocker: Piece = {
      id: "white-blocker",
      color: "white",
      type: "pawn",
      position: { x: 7, y: 1, z: 1 },
      hasMoved: false,
    };

    expect(destinations(positionWith(pawn, intermediateBlocker), pawn)).toContain("7,1,2");
  });

  it("removes both double advances after the pawn has moved", () => {
    const pawn: Piece = {
      id: "white-pawn-h3",
      color: "white",
      type: "pawn",
      position: { x: 7, y: 2, z: 0 },
      hasMoved: true,
    };

    expect(destinations(positionWith(pawn), pawn)).toEqual([
      "7,3,0",
      "7,3,1",
    ]);
  });
});
