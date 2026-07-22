import { BoardRenderer } from "./BoardRenderer.js";
import { CameraController } from "./CameraController.js";
import { PieceGeometryFactory } from "./PieceGeometryFactory.js";
import { PieceRenderer } from "./PieceRenderer.js";
import { SceneController } from "./SceneController.js";
import { SelectionController } from "./SelectionController.js";

export class ChessRenderer {
  constructor(container, presentation, onStateChange) {
    this.presentation = presentation;
    this.onStateChange = onStateChange;
    this.sceneController = new SceneController(container);
    this.cameraController = new CameraController(
      this.sceneController.renderer.domElement,
    );
    const state = presentation.snapshot();
    this.boardRenderer = new BoardRenderer(state.squares);
    this.pieceRenderer = new PieceRenderer(
      state.pieces,
      new PieceGeometryFactory(),
    );
    this.sceneController.scene.add(
      this.boardRenderer.group,
      this.pieceRenderer.group,
    );
    this.selection = new SelectionController(
      this.sceneController.renderer.domElement,
      this.cameraController.camera,
      [this.pieceRenderer.group, this.boardRenderer.group],
      () => this.presentation.activeLevel,
      (metadata) => this.select(metadata),
    );
    this.applyPresentation(state);
    this.resize = this.resize.bind(this);
    window.addEventListener("resize", this.resize);
    this.resize();
    this.running = true;
    this.frame = requestAnimationFrame(() => this.animate());
  }

  select(metadata) {
    if (!metadata) {
      this.presentation.clearSelection();
    } else if (metadata.kind === "piece") {
      this.presentation.selectPiece(metadata.piece);
    } else if (metadata.kind === "square") {
      this.presentation.selectSquare(metadata.square);
    }
    this.applyPresentation(this.presentation.snapshot());
  }

  applyPresentation(state) {
    this.boardRenderer.setLevels(state.levels, state.activeLevel);
    this.boardRenderer.setHighlights(
      state.selectedSquare?.square3D ?? null,
      state.legalTargets,
    );
    this.pieceRenderer.sync(state.pieces);
    this.pieceRenderer.setSelected(state.selectedPieceId);
    this.pieceRenderer.setLevelVisibility(state.levels);
    this.onStateChange(state);
  }

  refresh() {
    this.applyPresentation(this.presentation.snapshot());
  }

  setActiveLevel(level) {
    this.presentation.setActiveLevel(level);
    this.refresh();
  }

  startLocalGame() {
    this.presentation.startLocalGame();
    this.refresh();
    this.resetCamera();
  }

  newGame() {
    this.presentation.resetGame();
    this.refresh();
    this.resetCamera();
  }

  undo() {
    this.presentation.undo();
    this.refresh();
  }

  redo() {
    this.presentation.redo();
    this.refresh();
  }

  openMenu() {
    this.presentation.openMenu();
    this.refresh();
  }

  closeMenu() {
    this.presentation.closeMenu();
    this.refresh();
  }

  setLanguage(language) {
    this.presentation.setLanguage(language);
    this.refresh();
  }

  setBrightness(value) {
    this.sceneController.setBrightness(value);
  }

  showAllLevels() {
    this.presentation.showAllLevels();
    this.refresh();
  }

  isolateActiveLevel() {
    this.presentation.isolateActiveLevel();
    this.refresh();
  }

  cubeView() { this.cameraController.cubeView(); }
  activeLayerView() {
    this.cameraController.activeLayerView(this.presentation.activeLevel);
  }

  resize() {
    const parent = this.sceneController.renderer.domElement.parentElement;
    const width = Math.max(1, parent.clientWidth);
    const height = Math.max(1, parent.clientHeight);
    this.sceneController.resize(width, height);
    this.cameraController.resize(width, height);
  }

  resetCamera() { this.cameraController.reset(); }

  animate() {
    if (!this.running) return;
    this.cameraController.update();
    this.sceneController.render(this.cameraController.camera);
    this.frame = requestAnimationFrame(() => this.animate());
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.frame);
    window.removeEventListener("resize", this.resize);
    this.selection.dispose();
    this.cameraController.dispose();
    this.boardRenderer.dispose();
    this.pieceRenderer.dispose();
    this.sceneController.dispose();
  }
}
