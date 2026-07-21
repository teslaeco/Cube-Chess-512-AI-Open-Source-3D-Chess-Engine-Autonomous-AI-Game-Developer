import { describe, expect, it } from "vitest";
import {
  CELL_SIZE,
  TOTAL_SQUARES,
  boardPosition,
  createCubeSquareAddresses,
  createLevelSquares,
  createSquareAddress,
} from "../renderer/coordinates.js";
import { visibleLayerOpacity } from "../renderer/layerVisibility.js";
import { GamePresentation } from "../app/GamePresentation.js";
import { createInitialPieces } from "../state/initialPosition.js";

describe("browser presentation data", () => {
  it("maps a board square into a centered 3D position", () => {
    const address = createSquareAddress(4, 3, 0);
    expect(address).toMatchObject({
      file: "e",
      rank: 4,
      level: "A",
      algebraic2D: "e4",
      square3D: "A:e4",
    });
    expect(boardPosition(address)).toMatchObject({ y: 0 });
  });

  it("generates exactly 512 unique cube addresses", () => {
    const cube = createCubeSquareAddresses();
    expect(TOTAL_SQUARES).toBe(512);
    expect(createLevelSquares(0)).toHaveLength(64);
    expect(cube).toHaveLength(512);
    expect(new Set(cube.map((square) => square.square3D)).size).toBe(512);
    expect(cube[0].square3D).toBe("A:a1");
    expect(cube.at(-1).square3D).toBe("H:h8");
  });

  it("uses equal spacing on x, y and z to create a true cubic lattice", () => {
    const origin = boardPosition(createSquareAddress(0, 0, 0));
    const nextFile = boardPosition(createSquareAddress(1, 0, 0));
    const nextRank = boardPosition(createSquareAddress(0, 1, 0));
    const nextLevel = boardPosition(createSquareAddress(0, 0, 1));

    expect(nextFile.x - origin.x).toBe(CELL_SIZE);
    expect(nextRank.z - origin.z).toBe(CELL_SIZE);
    expect(nextLevel.y - origin.y).toBe(CELL_SIZE);
  });

  it("creates a unique classical set of 32 pieces", () => {
    const pieces = createInitialPieces();
    expect(pieces).toHaveLength(32);
    expect(new Set(pieces.map((piece) => piece.id)).size).toBe(32);
    expect(
      pieces.filter(
        (piece) => piece.color === "white" && piece.position.rank <= 2,
      ),
    ).toHaveLength(16);
    expect(
      pieces.filter(
        (piece) => piece.color === "black" && piece.position.rank >= 7,
      ),
    ).toHaveLength(16);
  });

  it("keeps selection state serializable in the presentation adapter", () => {
    const presentation = new GamePresentation();
    presentation.selectPiece(presentation.pieces[0]);
    const state = presentation.snapshot();
    expect(state.selectedPieceId).toBe(presentation.pieces[0].id);
    expect(state.selectedSquare.square3D).toBe("A:a1");
  });

  it("tracks eight level visibility states and can isolate the active level", () => {
    const presentation = new GamePresentation();
    expect(presentation.levels).toHaveLength(8);
    expect(presentation.squares).toHaveLength(512);
    presentation.setActiveLevel(3);
    presentation.isolateActiveLevel();
    expect(
      presentation.levels
        .filter((level) => level.visible)
        .map((level) => level.name),
    ).toEqual(["D"]);
    presentation.showAllLevels();
    expect(presentation.levels.every((level) => level.visible)).toBe(true);
  });

  it("maps a piece position onto level D vertically", () => {
    const position = createSquareAddress(4, 3, 3);
    expect(position.square3D).toBe("D:e4");
    expect(boardPosition(position).y).toBe(CELL_SIZE * 3);
  });

  it("keeps every enabled distant level faintly visible", () => {
    expect(visibleLayerOpacity(0, 0)).toBe(0.82);
    expect(visibleLayerOpacity(1, 0)).toBe(0.28);
    expect(visibleLayerOpacity(2, 0)).toBe(0.08);
    expect(visibleLayerOpacity(7, 0)).toBe(0.08);
  });

  it("restores manually hidden H through Show All Levels", () => {
    const presentation = new GamePresentation();
    presentation.setLevelVisible(7, false);
    expect(presentation.levels[7].visible).toBe(false);
    presentation.showAllLevels();
    expect(presentation.levels[7].visible).toBe(true);
  });
});
