import { describe, expect, it } from "vitest";
import { formatSquare3D, generatePseudoLegalMoves, parseSquare3D } from "../src/index.js";
import type { Piece, Position } from "../src/index.js";

function positionOf(...pieces: Piece[]): Position {
  return { sideToMove: "white", pieces: new Map(pieces.map(p => [p.id,p])) };
}

describe("3D coordinates", () => {
  it("round-trips L4:e5", () => {
    expect(formatSquare3D(parseSquare3D("L4:e5"))).toBe("L4:e5");
  });
});

describe("rook", () => {
  it("moves vertically through levels", () => {
    const rook: Piece = {id:"wr1",color:"white",type:"rook",position:{x:4,y:3,z:0},hasMoved:false};
    const moves = generatePseudoLegalMoves(positionOf(rook), rook);
    expect(moves.some(m => formatSquare3D(m.to) === "L8:e4")).toBe(true);
  });
});

describe("king", () => {
  it("has 26 moves in the center of an empty cube", () => {
    const king: Piece = {id:"wk",color:"white",type:"king",position:{x:3,y:3,z:3},hasMoved:false};
    expect(generatePseudoLegalMoves(positionOf(king), king)).toHaveLength(26);
  });
});

describe("knight", () => {
  it("has 24 three-dimensional L moves in the center", () => {
    const knight: Piece = {id:"wn",color:"white",type:"knight",position:{x:3,y:3,z:3},hasMoved:false};
    expect(generatePseudoLegalMoves(positionOf(knight), knight)).toHaveLength(24);
  });
});
