import { SceneController } from "./SceneController.js";
import { CameraController } from "./CameraController.js";
import { BoardRenderer } from "./BoardRenderer.js";
import { PieceGeometryFactory } from "./PieceGeometryFactory.js";
import { PieceRenderer } from "./PieceRenderer.js";
import { SelectionController } from "./SelectionController.js";

export class ChessRenderer {
  constructor(container, presentation, onStateChange) {
    this.presentation = presentation; this.onStateChange = onStateChange; this.sceneController = new SceneController(container);
    this.cameraController = new CameraController(this.sceneController.renderer.domElement); const state = presentation.snapshot();
    this.boardRenderer = new BoardRenderer(state.squares); this.pieceRenderer = new PieceRenderer(state.pieces, new PieceGeometryFactory());
    this.sceneController.scene.add(this.boardRenderer.group, this.pieceRenderer.group);
    this.selection = new SelectionController(this.sceneController.renderer.domElement, this.cameraController.camera, [this.boardRenderer.group, this.pieceRenderer.group], (metadata) => this.select(metadata));
    this.resize = this.resize.bind(this); window.addEventListener("resize", this.resize); this.resize(); this.running = true; this.frame = requestAnimationFrame(() => this.animate());
  }
  select(metadata) {
    if (!metadata) this.presentation.clearSelection(); else if (metadata.kind === "piece") this.presentation.selectPiece(metadata.piece); else this.presentation.selectSquare(metadata.square);
    const state = this.presentation.snapshot(); this.boardRenderer.setHighlighted(state.selectedSquare?.square3D); this.pieceRenderer.setSelected(state.selectedPieceId); this.onStateChange(state);
  }
  resize() { const { clientWidth: width, clientHeight: height } = this.sceneController.renderer.domElement.parentElement; this.sceneController.resize(width, height); this.cameraController.resize(width, height); }
  resetCamera() { this.cameraController.reset(); }
  animate() { if (!this.running) return; this.cameraController.update(); this.sceneController.render(this.cameraController.camera); this.frame = requestAnimationFrame(() => this.animate()); }
  dispose() { this.running = false; cancelAnimationFrame(this.frame); window.removeEventListener("resize", this.resize); this.selection.dispose(); this.cameraController.dispose(); this.boardRenderer.dispose(); this.pieceRenderer.dispose(); this.sceneController.dispose(); }
}
