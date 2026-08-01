import { BoardRenderer } from "./BoardRenderer.js";
import { CameraController } from "./CameraController.js";
import { PieceGeometryFactory } from "./PieceGeometryFactory.js";
import { PieceRenderer } from "./PieceRenderer.js";
import { SceneController } from "./SceneController.js";
import { SelectionController } from "./SelectionController.js";
import { executeAutomatedMovePreservingLevel } from "./automatedMove.js";

export class ChessRenderer {
  constructor(container, presentation, onStateChange) {
    this.presentation = presentation;
    this.onStateChange = onStateChange;
    this.sceneController = new SceneController(container);
    this.cameraController = new CameraController(this.sceneController.renderer.domElement);
    const state = presentation.snapshot();
    this.boardRenderer = new BoardRenderer(state.squares);
    this.pieceRenderer = new PieceRenderer(
      state.pieces,
      new PieceGeometryFactory(),
      (active) => this.handleAnimationState(active),
    );
    this.sceneController.scene.add(this.boardRenderer.group, this.pieceRenderer.group);
    this.cameraController.setBoardObject(this.boardRenderer.group);
    this.selection = new SelectionController(
      this.sceneController.renderer.domElement,
      this.cameraController.camera,
      [this.pieceRenderer.group, this.boardRenderer.group],
      () => this.presentation.activeLevel,
      (metadata) => this.select(metadata),
      () => this.presentation.canHumanInteract(),
    );
    this.lastFollowedMove = null;
    this.applyPresentation(state);
    this.resize = this.resize.bind(this);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(container);
    this.resize();
    this.running = true;
    this.lastFrameTime = performance.now();
    this.frame = requestAnimationFrame((time) => this.animate(time));
  }

  select(metadata) {
    if (!this.presentation.canHumanInteract()) return;
    if (!metadata) this.presentation.clearSelection();
    else if (metadata.kind === "piece") this.presentation.selectPiece(metadata.piece);
    else if (metadata.kind === "square") this.presentation.selectSquare(metadata.square);
    this.applyPresentation(this.presentation.snapshot());
  }

  handleAnimationState(active) {
    this.presentation.setBusy(active);
    this.onStateChange(this.presentation.snapshot());
    if (!active) queueMicrotask(() => this.selection.flushPendingSelection());
  }

  applyPresentation(state) {
    this.boardRenderer.setLevels(state.levels, state.activeLevel);
    this.boardRenderer.setHighlights(state.selectedSquare, state.legalTargets);
    this.pieceRenderer.sync(state.pieces, state.capturedPieces, state.lastMove);
    this.pieceRenderer.setSelected(state.selectedPieceId);
    this.pieceRenderer.setLevelVisibility(state.levels);
    if (state.lastMove?.sequence != null && state.lastMove.sequence !== this.lastFollowedMove) {
      this.lastFollowedMove = state.lastMove.sequence;
      this.cameraController.followSquare(state.lastMove.to);
    }
    this.onStateChange(this.presentation.snapshot());
  }

  refresh() { this.applyPresentation(this.presentation.snapshot()); }

  setActiveLevel(level) {
    this.presentation.setActiveLevel(level);
    this.refresh();
    this.cameraController.followLevel(level);
  }

  startGame(config) {
    this.selection.clearPendingSelection();
    this.presentation.startGame(config);
    this.lastFollowedMove = null;
    this.refresh();
    this.cameraController.fitBoard(false);
  }

  startLocalGame() { this.startGame({ mode: "local" }); }

  startDemo() {
    this.selection.clearPendingSelection();
    this.presentation.startDemo();
    this.lastFollowedMove = null;
    this.refresh();
    this.cameraController.fitBoard(false);
  }

  executeAutomatedMove(move) {
    const executed = executeAutomatedMovePreservingLevel(this.presentation, move);
    if (executed) this.refresh();
    return executed;
  }

  newGame() {
    this.selection.clearPendingSelection();
    this.presentation.resetGame({ appState: "playing", preserveMenu: true });
    this.refresh();
    this.cameraController.fitBoard(false);
  }

  loadGame(serialized) {
    this.selection.clearPendingSelection();
    this.presentation.load(serialized);
    this.lastFollowedMove = null;
    this.refresh();
    this.cameraController.fitBoard(false);
  }

  undo() { if (this.presentation.undo()) this.refresh(); }
  redo() { if (this.presentation.redo()) this.refresh(); }
  openMenu() { this.presentation.openMenu(); this.refresh(); }
  closeMenu() { this.presentation.closeMenu(); this.refresh(); }
  setLanguage(language) { this.presentation.setLanguage(language); this.refresh(); }
  setBrightness(value) { this.sceneController.setBrightness(value); }
  setFog(enabled) { this.sceneController.setFog(enabled); }
  showAllLevels() { this.presentation.showAllLevels(); this.refresh(); }
  isolateActiveLevel() { this.presentation.isolateActiveLevel(); this.refresh(); }
  cubeView() { this.cameraController.fitBoard(false); }
  activeLayerView() { this.cameraController.activeLayerView(this.presentation.activeLevel); }

  resize() {
    const parent = this.sceneController.renderer.domElement.parentElement;
    const width = Math.max(1, parent.clientWidth);
    const height = Math.max(1, parent.clientHeight);
    this.sceneController.resize(width, height);
    this.cameraController.resize(width, height);
  }

  resetCamera() { this.cameraController.reset(); }

  animate(time) {
    if (!this.running) return;
    const delta = Math.min(0.05, Math.max(0, (time - this.lastFrameTime) / 1000));
    this.lastFrameTime = time;
    this.pieceRenderer.update(delta);
    this.cameraController.update();
    this.sceneController.render(this.cameraController.camera);
    this.frame = requestAnimationFrame((nextTime) => this.animate(nextTime));
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.selection.dispose();
    this.cameraController.dispose();
    this.boardRenderer.dispose();
    this.pieceRenderer.dispose();
    this.sceneController.dispose();
  }
}
