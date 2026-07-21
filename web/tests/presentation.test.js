import { describe, expect, it } from "vitest";
import { boardPosition, createCubeSquareAddresses, createLevelSquares, createSquareAddress } from "../renderer/coordinates.js";
import { GamePresentation } from "../app/GamePresentation.js";
import { createInitialPieces } from "../state/initialPosition.js";

describe("browser presentation data", () => {
  it("maps a board square into a centered 3D position", () => {
    const address = createSquareAddress(4, 3, 0);
    expect(address).toMatchObject({ file: "e", rank: 4, level: "A", algebraic2D: "e4", square3D: "A:e4" });
    expect(boardPosition(address)).toMatchObject({ y: 0 });
  });
  it("generates level A and all cube addresses", () => { expect(createLevelSquares(0)).toHaveLength(64); expect(createCubeSquareAddresses()).toHaveLength(512); });
  it("creates a unique classical set of 32 pieces", () => {
    const pieces = createInitialPieces(); expect(pieces).toHaveLength(32); expect(new Set(pieces.map((piece) => piece.id)).size).toBe(32);
    expect(pieces.filter((piece) => piece.color === "white" && piece.position.rank <= 2)).toHaveLength(16); expect(pieces.filter((piece) => piece.color === "black" && piece.position.rank >= 7)).toHaveLength(16);
  });
  it("keeps selection state serializable in the presentation adapter", () => { const presentation = new GamePresentation(); presentation.selectPiece(presentation.pieces[0]); const state = presentation.snapshot(); expect(state.selectedPieceId).toBe(presentation.pieces[0].id); expect(state.selectedSquare.square3D).toBe("A:a1"); });
});
