import { createLevelSquares } from "../renderer/coordinates.js";
import { createInitialPieces } from "../state/initialPosition.js";

/** Presentation-only state boundary. It intentionally contains no move rules. */
export class GamePresentation {
  constructor() {
    this.activeLevel = 0;
    this.levels = [{ index: 0, name: "A", visible: true }];
    this.squares = createLevelSquares(this.activeLevel);
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

  snapshot() {
    return JSON.parse(JSON.stringify({
      activeLevel: this.activeLevel, levels: this.levels, squares: this.squares, pieces: this.pieces,
      selectedSquare: this.selectedSquare, selectedPieceId: this.selectedPieceId,
      highlightedSquares: this.highlightedSquares,
    }));
  }
}
