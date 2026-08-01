import { describe, expect, it } from "vitest";
import { chooseDiverseMove, shouldPreferDifferentPiece } from "./MoveDiversity.js";

describe("AI move diversity", () => {
  const repeated = { pieceId: "black-pawn-1", square3D: "A:a5", kind: "move" };
  const alternative = { pieceId: "black-knight-1", square3D: "B:c6", kind: "move" };

  it("prefers another piece after two consecutive quiet moves by one piece", () => {
    expect(chooseDiverseMove(repeated, [repeated, alternative], ["black-pawn-1", "black-pawn-1"]))
      .toEqual(alternative);
  });

  it("does not weaken a capture or promotion", () => {
    const capture = { ...repeated, kind: "capture", capturedPieceId: "white-queen" };
    expect(shouldPreferDifferentPiece(capture, [capture.pieceId, capture.pieceId])).toBe(false);
    expect(chooseDiverseMove(capture, [alternative], [capture.pieceId, capture.pieceId])).toEqual(capture);
  });

  it("keeps the best move when no other piece can move", () => {
    expect(chooseDiverseMove(repeated, [repeated], [repeated.pieceId, repeated.pieceId])).toEqual(repeated);
  });
});
