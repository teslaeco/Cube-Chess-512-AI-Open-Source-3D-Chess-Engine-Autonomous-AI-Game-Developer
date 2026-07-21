import {
  BOARD_SIZE,
  createCubeSquareAddresses,
} from "../renderer/coordinates.js";
import { createInitialPieces } from "../state/initialPosition.js";
import { legalTargetsForPiece } from "./EngineMoveAdapter.js";

const LEVEL_NAMES = "ABCDEFGH";

export class GamePresentation {
  constructor() {
    this.activeLevel = 0;
    this.levels = Array.from({ length: BOARD_SIZE }, (_, index) => ({
      index,
      name: LEVEL_NAMES[index],
      label: `${index + 1}${LEVEL_NAMES[index]}`,
      visible: true,
    }));
    this.squares = createCubeSquareAddresses();
    this.pieces = createInitialPieces();
    this.selectedSquare = null;
    this.selectedPieceId = null;
    this.highlightedSquares = [];
    this.legalTargets = [];
  }

  selectSquare(square) {
    if (!square || square.z !== this.activeLevel) {
      return false;
    }

    this.selectedSquare = square;
    this.selectedPieceId = null;
    this.legalTargets = [];
    this.highlightedSquares = [square.square3D];
    return true;
  }

  selectPiece(piece) {
    if (!piece || piece.position.z !== this.activeLevel) {
      return false;
    }

    this.selectedPieceId = piece.id;
    this.selectedSquare = piece.position;
    this.legalTargets = legalTargetsForPiece(this.pieces, piece.id);
    this.highlightedSquares = [
      piece.position.square3D,
      ...this.legalTargets.map((target) => target.square3D),
    ];
    return true;
  }

  clearSelection() {
    this.selectedSquare = null;
    this.selectedPieceId = null;
    this.highlightedSquares = [];
    this.legalTargets = [];
  }

  setActiveLevel(levelIndex) {
    this.assertLevel(levelIndex);
    if (this.activeLevel !== levelIndex) {
      this.activeLevel = levelIndex;
      this.clearSelection();
    }
  }

  resetGame() {
    this.activeLevel = 0;
    this.levels.forEach((level) => {
      level.visible = true;
    });
    this.pieces = createInitialPieces();
    this.clearSelection();
  }

  setLevelVisible(levelIndex, visible) {
    this.assertLevel(levelIndex);
    this.levels[levelIndex].visible = Boolean(visible);
  }

  showAllLevels() {
    this.levels.forEach((level) => {
      level.visible = true;
    });
  }

  isolateActiveLevel() {
    this.levels.forEach((level) => {
      level.visible = level.index === this.activeLevel;
    });
  }

  assertLevel(levelIndex) {
    if (
      !Number.isInteger(levelIndex) ||
      levelIndex < 0 ||
      levelIndex >= BOARD_SIZE
    ) {
      throw new RangeError(`Level must be 0 to 7; received ${levelIndex}`);
    }
  }

  snapshot() {
    return JSON.parse(
      JSON.stringify({
        activeLevel: this.activeLevel,
        levels: this.levels,
        squares: this.squares,
        pieces: this.pieces,
        selectedSquare: this.selectedSquare,
        selectedPieceId: this.selectedPieceId,
        highlightedSquares: this.highlightedSquares,
        legalTargets: this.legalTargets,
      }),
    );
  }
}
