import { BOARD_SIZE, createCubeSquareAddresses } from "../renderer/coordinates.js";
import { createInitialPieces } from "../state/initialPosition.js";

/** Presentation-only state boundary. It intentionally contains no move rules. */
export class GamePresentation {
  constructor() {
    this.activeLevel = 0;
    this.levels = Array.from({ length: BOARD_SIZE }, (_, index) => ({ index, name: String.fromCharCode(65 + index), visible: true }));
    this.squares = createCubeSquareAddresses();
    this.pieces = createInitialPieces();
    this.selectedSquare = null;
    this.selectedPieceId = null;
    this.highlightedSquares = [];
  }

  selectSquare(square) {
    this.selectedSquare = square;
    this.selectedPieceId = null;
    this.highlightedSquares = square ? [square.square3D] : [];
  }

  selectPiece(piece) {
    this.selectedPieceId = piece.id;
    this.selectedSquare = piece.position;
    this.highlightedSquares = [piece.position.square3D];
  }

  clearSelection() {
    this.selectedSquare = null;
    this.selectedPieceId = null;
    this.highlightedSquares = [];
  }

  setActiveLevel(levelIndex) { this.assertLevel(levelIndex); this.activeLevel = levelIndex; }
  setLevelVisible(levelIndex, visible) { this.assertLevel(levelIndex); this.levels[levelIndex].visible = Boolean(visible); }
  showAllLevels() { this.levels.forEach((level) => { level.visible = true; }); }
  isolateActiveLevel() { this.levels.forEach((level) => { level.visible = level.index === this.activeLevel; }); }
  assertLevel(levelIndex) { if (!Number.isInteger(levelIndex) || levelIndex < 0 || levelIndex >= BOARD_SIZE) throw new RangeError(`Level must be 0 to 7; received ${levelIndex}`); }

  snapshot() {
    return JSON.parse(JSON.stringify({
      activeLevel: this.activeLevel, levels: this.levels, squares: this.squares, pieces: this.pieces,
      selectedSquare: this.selectedSquare, selectedPieceId: this.selectedPieceId,
      highlightedSquares: this.highlightedSquares,
    }));
  }
}
