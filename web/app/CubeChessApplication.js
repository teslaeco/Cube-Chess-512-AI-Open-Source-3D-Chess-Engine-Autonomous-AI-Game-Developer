import { GamePresentation } from "./GamePresentation.js";
import { ChessRenderer } from "../renderer/ChessRenderer.js";
import { GameHud } from "../ui/GameHud.js";

export class CubeChessApplication {
  constructor(root) {
    this.root = root; root.className = "cube-chess-app"; this.stage = document.createElement("section"); this.stage.className = "game-stage"; root.append(this.stage);
    this.presentation = new GamePresentation(); this.renderer = new ChessRenderer(this.stage, this.presentation, (state) => this.hud.update(state));
    this.hud = new GameHud(root, () => this.renderer.resetCamera(), (visible) => root.classList.toggle("coordinates-hidden", !visible)); this.hud.update(this.presentation.snapshot());
  }
  dispose() { this.renderer.dispose(); this.hud.dispose(); this.stage.remove(); }
}
