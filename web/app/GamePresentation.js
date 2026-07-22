import {
  BOARD_SIZE,
  createCubeSquareAddresses,
  createSquareAddress,
} from "../renderer/coordinates.js";
import { createInitialPieces } from "../state/initialPosition.js";
import {
  legalTargetsForPiece,
  positionStatus,
} from "./EngineMoveAdapter.js";

const LEVEL_NAMES = "ABCDEFGH";
const clone = (value) => JSON.parse(JSON.stringify(value));
const storage = typeof localStorage === "undefined" ? null : localStorage;

export class GamePresentation {
  constructor() {
    this.levels = Array.from({ length: BOARD_SIZE }, (_, index) => ({
      index,
      name: LEVEL_NAMES[index],
      label: `${index + 1}${LEVEL_NAMES[index]}`,
      visible: true,
    }));
    this.squares = createCubeSquareAddresses();
    this.language = storage?.getItem("cubeChessLanguage") ?? "pl";
    this.menuOpen = true;
    this.resetGame();
  }

  resetGame() {
    this.activeLevel = 0;
    this.levels.forEach((level) => { level.visible = true; });
    this.pieces = createInitialPieces();
    this.sideToMove = "white";
    this.fullMoveNumber = 1;
    this.status = { kind: "active", inCheck: false };
    this.history = [];
    this.redoStack = [];
    this.lastMove = null;
    this.message = null;
    this.clearSelection();
  }

  startLocalGame() { this.resetGame(); this.menuOpen = false; }
  openMenu() { this.menuOpen = true; }
  closeMenu() { this.menuOpen = false; }
  setLanguage(language) {
    this.language = language;
    storage?.setItem("cubeChessLanguage", language);
  }

  selectSquare(square) {
    if (!square || square.z !== this.activeLevel || this.status.kind !== "active") return false;
    const target = this.legalTargets.find((candidate) => candidate.square3D === square.square3D);
    if (this.selectedPieceId && target) return this.executeTarget(target);
    this.selectedSquare = square;
    this.message = this.selectedPieceId ? "illegalMove" : null;
    return false;
  }

  selectPiece(piece) {
    if (!piece || piece.position.z !== this.activeLevel || this.status.kind !== "active") return false;
    if (piece.color !== this.sideToMove) {
      this.message = this.sideToMove === "white" ? "whiteToMove" : "blackToMove";
      return false;
    }
    if (piece.id === this.selectedPieceId) {
      this.clearSelection();
      return true;
    }
    this.selectedPieceId = piece.id;
    this.selectedSquare = piece.position;
    this.legalTargets = legalTargetsForPiece(this.pieces, piece.id);
    this.pendingMoveSelection = {
      pieceId: piece.id,
      sourceSquare: piece.position.square3D,
      sourceLevel: piece.position.z,
    };
    this.highlightedSquares = [piece.position.square3D, ...this.legalTargets.map((target) => target.square3D)];
    this.message = null;
    return true;
  }

  executeTarget(target) {
    const selected = this.pieces.find((piece) => piece.id === this.selectedPieceId);
    if (!selected || selected.color !== this.sideToMove) return false;
    const verified = legalTargetsForPiece(this.pieces, selected.id).find((move) => move.square3D === target.square3D);
    if (!verified) { this.message = "illegalMove"; return false; }
    this.history.push(this.captureState());
    this.redoStack = [];
    if (verified.capturedPieceId) this.pieces = this.pieces.filter((piece) => piece.id !== verified.capturedPieceId);
    const moved = this.pieces.find((piece) => piece.id === selected.id);
    moved.position = createSquareAddress(verified.to.x, verified.to.y, verified.to.z);
    moved.hasMoved = true;
    this.lastMove = clone(verified);
    this.activeLevel = verified.to.z;
    this.sideToMove = this.sideToMove === "white" ? "black" : "white";
    if (this.sideToMove === "white") this.fullMoveNumber += 1;
    this.status = positionStatus(this.pieces, this.sideToMove);
    this.clearSelection();
    this.message = this.status.kind;
    return true;
  }

  captureState() {
    return clone({ pieces: this.pieces, sideToMove: this.sideToMove, fullMoveNumber: this.fullMoveNumber, status: this.status, activeLevel: this.activeLevel, lastMove: this.lastMove });
  }

  restoreState(state) {
    this.pieces = clone(state.pieces);
    this.sideToMove = state.sideToMove;
    this.fullMoveNumber = state.fullMoveNumber;
    this.status = clone(state.status);
    this.activeLevel = state.activeLevel;
    this.lastMove = clone(state.lastMove);
    this.clearSelection();
  }

  undo() {
    if (!this.history.length) return false;
    this.redoStack.push(this.captureState());
    this.restoreState(this.history.pop());
    return true;
  }

  redo() {
    if (!this.redoStack.length) return false;
    this.history.push(this.captureState());
    this.restoreState(this.redoStack.pop());
    return true;
  }

  clearSelection() {
    this.selectedSquare = null;
    this.selectedPieceId = null;
    this.highlightedSquares = [];
    this.legalTargets = [];
    this.pendingMoveSelection = null;
  }

  setActiveLevel(levelIndex) { this.assertLevel(levelIndex); this.activeLevel = levelIndex; }
  setLevelVisible(levelIndex, visible) { this.assertLevel(levelIndex); this.levels[levelIndex].visible = Boolean(visible); }
  showAllLevels() { this.levels.forEach((level) => { level.visible = true; }); }
  isolateActiveLevel() { this.levels.forEach((level) => { level.visible = level.index === this.activeLevel; }); }
  assertLevel(levelIndex) {
    if (!Number.isInteger(levelIndex) || levelIndex < 0 || levelIndex >= BOARD_SIZE) throw new RangeError(`Level must be 0 to 7; received ${levelIndex}`);
  }

  snapshot() {
    return clone({
      activeLevel: this.activeLevel, levels: this.levels, squares: this.squares, pieces: this.pieces,
      selectedSquare: this.selectedSquare, selectedPieceId: this.selectedPieceId,
      highlightedSquares: this.highlightedSquares, legalTargets: this.legalTargets,
      pendingMoveSelection: this.pendingMoveSelection, sideToMove: this.sideToMove,
      fullMoveNumber: this.fullMoveNumber, status: this.status, lastMove: this.lastMove,
      canUndo: this.history.length > 0, canRedo: this.redoStack.length > 0,
      menuOpen: this.menuOpen, language: this.language, message: this.message,
    });
  }
}
