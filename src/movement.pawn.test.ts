import { describe, expect, it } from "vitest";
import { generatePseudoLegalMoves } from "./movement.js";
import type { Coord3, Piece, Position } from "./types.js";

function pawn(position: Coord3, hasMoved = false): Piece {
  return {
    id: "white-pawn-h2",
    color: "white",
    type: "pawn",
    position,
    hasMoved,
  };
}

function positionWith(piece: Piece): Position {
  return {
    sideToMove: "white",
    pieces: new Map([[piece.id, piece]]),
  };
}

function destinations(piece: Piece): string[] {
  return generatePseudoLegalMoves(positionWith(piece), piece)
    .map((move) => `${move.to.x},${move.to.y},${move.to.z}`)
    .sort();
}

describe("Cube Chess 512 pawn opening movement", () => {
  it("offers exactly four opening advances from level A", () => {
    const piece = pawn({ x: 7, y: 1, z: 0 });

    expect(destinations(piece)).toEqual([
      "7,1,2",
      "7,2,0",
      "7,2,1",
      "7,3,0",
    ]);
  });

  it("disables both double opening advances after the pawn has moved", () => {
    const piece = pawn({ x: 7, y: 2, z: 1 }, true);

    expect(destinations(piece)).toEqual([
      "7,3,1",
      "7,3,2",
    ]);
  });
});
