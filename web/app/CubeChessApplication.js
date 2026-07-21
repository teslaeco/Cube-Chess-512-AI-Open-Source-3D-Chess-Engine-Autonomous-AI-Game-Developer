import { GamePresentation } from "./GamePresentation.js";
import { ChessRenderer } from "../renderer/ChessRenderer.js";
import { GameHud } from "../ui/GameHud.js";

export class CubeChessApplication {
  constructor(root) {
    this.root = root; root.className = "cube-chess-app"; this.stage = document.createElement("section"); this.stage.className = "game-stage"; root.append(this.stage);
    this.presentation = new GamePresentation(); this.hud = new GameHud(root, { reset: () => this.renderer.resetCamera(), toggleCoordinates: (visible) => root.classList.toggle("coordinates-hidden", !visible), previous: () => this.renderer.setActiveLevel(Math.max(0, this.presentation.activeLevel - 1)), next: () => this.renderer.setActiveLevel(Math.min(7, this.presentation.activeLevel + 1)), all: () => this.renderer.showAllLevels(), isolate: () => this.renderer.isolateActiveLevel(), level: (index) => this.renderer.setActiveLevel(index), cube: () => this.renderer.cubeView(), active: () => this.renderer.activeLayerView() });
    this.renderer = new ChessRenderer(this.stage, this.presentation, (state) => this.hud.update(state)); this.hud.update(this.presentation.snapshot());
  }
  dispose() { this.renderer.dispose(); this.hud.dispose(); this.stage.remove(); }
}
