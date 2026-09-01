import {
  BOARD_SIZE,
  createCubeSquareAddresses,
  createSquareAddress,
} from "../renderer/coordinates.js";
import { createInitialPieces } from "../state/initialPosition.js";
import { normalizePlayerVisualPreset } from "../state/pieceVisualPresets.js";
import {
  detectInitialLocale,
  resolveLocale,
} from "../i18n/locales.js";
import {
  legalMovesForSide,
  legalTargetsForPiece,
  positionStatus,
} from "./EngineMoveAdapter.js";

const LEVEL_NAMES = "ABCDEFGH";
const SAVE_VERSION = 1;
const clone = (value) => JSON.parse(JSON.stringify(value));
const storage = typeof localStorage === "undefined" ? null : localStorage;

function createGameId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `game-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultGameConfig() {
  return {
    mode: "local",
    whiteName: "Gracz 1",
    blackName: "Gracz 2",
    humanSide: "white",
    aiSide: null,
    difficulty: "easy",
    clockMinutes: 0,
    pieceSet: normalizePlayerVisualPreset(),
  };
}

export class GamePresentation {
  constructor() {
    this.levels = Array.from({ length: BOARD_SIZE }, (_, index) => ({
      index,
      name: LEVEL_NAMES[index],
      label: `${index + 1}${LEVEL_NAMES[index]}`,
      visible: true,
    }));
    this.squares = createCubeSquareAddresses();
    this.language = detectInitialLocale(
      storage?.getItem("cubeChessLanguage"),
      typeof navigator === "undefined" ? ["pl"] : navigator.languages,
    );
    this.menuOpen = true;
    this.gameConfig = defaultGameConfig();
    this.resetGame({ appState: "playing", preserveMenu: true });
  }

  resetGame({ appState = "playing", preserveMenu = true } = {}) {
    const menuOpen = preserveMenu ? this.menuOpen : false;
    this.gameId = createGameId();
    this.startedAt = new Date().toISOString();
    this.activeLevel = 0;
    this.levels.forEach((level) => {
      level.visible = true;
    });
    this.pieces = createInitialPieces();
    this.capturedPieces = [];
    this.sideToMove = "white";
    this.fullMoveNumber = 1;
    this.status = { kind: "active", inCheck: false };
    this.history = [];
    this.redoStack = [];
    this.lastMove = null;
    this.moveSequence = 0;
    this.message = null;
    this.busy = false;
    this.appState = appState;
    this.menuOpen = menuOpen;
    this.clearSelection();
  }

  startDemo() {
    this.gameConfig = { ...defaultGameConfig(), mode: "demo" };
    this.menuOpen = true;
    this.resetGame({ appState: "demo", preserveMenu: true });
  }

  startGame(config = {}) {
    const requestedMode = ["local", "computer", "tutorial"].includes(
      config.mode,
    )
      ? config.mode
      : "local";
    let humanSide = ["white", "black"].includes(config.humanSide)
      ? config.humanSide
      : "white";
    if (config.humanSide === "random") {
      humanSide = Math.random() < 0.5 ? "white" : "black";
    }
    const aiSide =
      requestedMode === "local"
        ? null
        : humanSide === "white"
          ? "black"
          : "white";
    this.gameConfig = {
      mode: requestedMode,
      whiteName:
        String(config.whiteName || (aiSide === "white" ? "Computer" : "Gracz 1")).trim() ||
        "Gracz 1",
      blackName:
        String(config.blackName || (aiSide === "black" ? "Computer" : "Gracz 2")).trim() ||
        "Gracz 2",
      humanSide,
      aiSide,
      difficulty: ["easy", "medium", "hard"].includes(config.difficulty)
        ? config.difficulty
        : "easy",
      clockMinutes: Math.max(0, Number(config.clockMinutes) || 0),
      pieceSet: normalizePlayerVisualPreset(
        config.pieceSet ?? this.gameConfig.pieceSet,
      ),
    };
    this.menuOpen = false;
    this.resetGame({ appState: "playing", preserveMenu: true });
    this.message = aiSide === "white" ? "computerStarts" : "gameStarted";
  }

  startLocalGame() {
    this.startGame({ mode: "local" });
  }

  openMenu() {
    this.menuOpen = true;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  setLanguage(language) {
    this.language = resolveLocale(language);
    storage?.setItem("cubeChessLanguage", this.language);
  }

  setBusy(busy) {
    this.busy = Boolean(busy);
    if (this.status.kind !== "active") this.appState = "gameOver";
  }

  canHumanInteract() {
    if (
      this.appState !== "playing" ||
      this.busy ||
      this.status.kind !== "active"
    ) {
      return false;
    }
    return this.gameConfig.aiSide !== this.sideToMove;
  }

  selectSquare(square) {
    if (!this.canHumanInteract() || !square || square.z !== this.activeLevel) {
      return false;
    }
    const target = this.legalTargets.find(
      (candidate) => candidate.square3D === square.square3D,
    );
    if (this.selectedPieceId && target) return this.executeTarget(target);
    this.selectedSquare = square;
    this.message = this.selectedPieceId ? "illegalMove" : null;
    return false;
  }

  selectPiece(piece) {
    if (!this.canHumanInteract() || !piece || piece.position.z !== this.activeLevel) {
      return false;
    }

    // A piece standing on a legal capture destination is a move target first,
    // not a request to select the opponent's piece.
    if (this.selectedPieceId) {
      const capture = this.legalTargets.find(
        (candidate) =>
          candidate.kind === "capture" &&
          candidate.square3D === piece.position.square3D,
      );
      if (capture) return this.executeTarget(capture);
    }

    if (piece.color !== this.sideToMove) {
      this.message =
        this.sideToMove === "white" ? "whiteToMove" : "blackToMove";
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
    this.highlightedSquares = [
      piece.position.square3D,
      ...this.legalTargets.map((target) => target.square3D),
    ];
    this.message = this.legalTargets.length ? null : "noLegalMoves";
    return true;
  }

  executeTarget(target) {
    const selected = this.pieces.find(
      (piece) => piece.id === this.selectedPieceId,
    );
    if (!selected || selected.color !== this.sideToMove) return false;
    return this.executeMove(target, { allowBusy: false });
  }

  executeMove(move, { allowBusy = false } = {}) {
    if (this.status.kind !== "active") return false;
    if (this.busy && !allowBusy) return false;
    const selected = this.pieces.find((piece) => piece.id === move?.pieceId);
    if (!selected || selected.color !== this.sideToMove) return false;
    const verified = legalTargetsForPiece(this.pieces, selected.id).find(
      (candidate) => candidate.square3D === move.square3D,
    );
    if (!verified) {
      this.message = "illegalMove";
      return false;
    }

    this.history.push(this.captureState());
    this.redoStack = [];
    if (verified.capturedPieceId) {
      const captured = this.pieces.find(
        (piece) => piece.id === verified.capturedPieceId,
      );
      if (captured) {
        this.capturedPieces.push({
          ...clone(captured),
          capturedBy: selected.color,
          capturedOnMove: this.fullMoveNumber,
          captureIndex: this.capturedPieces.length,
        });
      }
      this.pieces = this.pieces.filter(
        (piece) => piece.id !== verified.capturedPieceId,
      );
    }
    const moved = this.pieces.find((piece) => piece.id === selected.id);
    moved.position = createSquareAddress(
      verified.to.x,
      verified.to.y,
      verified.to.z,
    );
    moved.hasMoved = true;
    this.moveSequence += 1;
    this.lastMove = { ...clone(verified), sequence: this.moveSequence };
    this.activeLevel = verified.to.z;
    this.sideToMove = this.sideToMove === "white" ? "black" : "white";
    if (this.sideToMove === "white") this.fullMoveNumber += 1;
    this.status = positionStatus(this.pieces, this.sideToMove);
    this.clearSelection();
    this.message =
      this.status.kind === "active" && this.status.inCheck
        ? "check"
        : this.status.kind;
    if (this.status.kind !== "active") this.appState = "gameOver";
    return true;
  }

  getLegalMovesForSide() {
    if (this.status.kind !== "active") return [];
    return legalMovesForSide(this.pieces, this.sideToMove);
  }

  captureState() {
    return clone({
      pieces: this.pieces,
      capturedPieces: this.capturedPieces,
      sideToMove: this.sideToMove,
      fullMoveNumber: this.fullMoveNumber,
      status: this.status,
      activeLevel: this.activeLevel,
      lastMove: this.lastMove,
      moveSequence: this.moveSequence,
      message: this.message,
      appState: this.appState,
    });
  }

  restoreState(state) {
    this.pieces = clone(state.pieces);
    this.capturedPieces = clone(state.capturedPieces ?? []);
    this.sideToMove = state.sideToMove;
    this.fullMoveNumber = state.fullMoveNumber;
    this.status = clone(state.status);
    this.activeLevel = state.activeLevel;
    this.lastMove = clone(state.lastMove);
    this.moveSequence = Number(state.moveSequence) || 0;
    this.message = state.message ?? null;
    this.appState = state.appState ?? "playing";
    this.busy = false;
    this.clearSelection();
  }

  undo() {
    if (!this.history.length || this.busy) return false;
    this.redoStack.push(this.captureState());
    this.restoreState(this.history.pop());
    return true;
  }

  redo() {
    if (!this.redoStack.length || this.busy) return false;
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

  setActiveLevel(levelIndex) {
    this.assertLevel(levelIndex);
    this.activeLevel = levelIndex;
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

  serialize() {
    return {
      version: SAVE_VERSION,
      id: this.gameId,
      savedAt: new Date().toISOString(),
      startedAt: this.startedAt,
      language: this.language,
      gameConfig: clone(this.gameConfig),
      state: this.captureState(),
      history: clone(this.history),
      redoStack: clone(this.redoStack),
    };
  }

  load(serialized) {
    if (!serialized || serialized.version !== SAVE_VERSION || !serialized.state) {
      throw new Error("Unsupported or damaged Cube Chess save");
    }
    this.gameId = String(serialized.id || createGameId());
    this.startedAt = serialized.startedAt || new Date().toISOString();
    this.gameConfig = { ...defaultGameConfig(), ...clone(serialized.gameConfig) };
    this.gameConfig.pieceSet = normalizePlayerVisualPreset(
      this.gameConfig.pieceSet,
    );
    this.history = clone(serialized.history ?? []);
    this.redoStack = clone(serialized.redoStack ?? []);
    this.restoreState(serialized.state);
    this.menuOpen = false;
    this.appState = this.status.kind === "active" ? "playing" : "gameOver";
  }

  snapshot() {
    return clone({
      gameId: this.gameId,
      startedAt: this.startedAt,
      activeLevel: this.activeLevel,
      levels: this.levels,
      squares: this.squares,
      pieces: this.pieces,
      capturedPieces: this.capturedPieces,
      selectedSquare: this.selectedSquare,
      selectedPieceId: this.selectedPieceId,
      highlightedSquares: this.highlightedSquares,
      legalTargets: this.legalTargets,
      pendingMoveSelection: this.pendingMoveSelection,
      sideToMove: this.sideToMove,
      fullMoveNumber: this.fullMoveNumber,
      status: this.status,
      lastMove: this.lastMove,
      canUndo: this.history.length > 0,
      canRedo: this.redoStack.length > 0,
      menuOpen: this.menuOpen,
      language: this.language,
      message: this.message,
      busy: this.busy,
      appState: this.appState,
      gameConfig: this.gameConfig,
      historyLength: this.history.length,
    });
  }
}
