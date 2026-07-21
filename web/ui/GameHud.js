export class GameHud {
  constructor(container, onReset, onToggleCoordinates) {
    this.coordinatesVisible = true; this.element = document.createElement("aside"); this.element.className = "hud";
    this.element.innerHTML = `<h1>Cube Chess 512 <span>AI</span></h1><dl><dt>Current level</dt><dd>Layer A</dd><dt>Visible squares</dt><dd>64</dd><dt>Total cube squares</dt><dd>512</dd><dt>Selected square</dt><dd data-square>None</dd><dt>Selected piece</dt><dd data-piece>None</dd></dl><div class="coordinate-guide" data-coordinate-guide aria-label="Board coordinate legend">Layer A · Files a–h · Ranks 1–8</div><p>Rendering stage — movement disabled</p><div class="hud-actions"><button type="button" data-reset>Reset Camera</button><button type="button" data-coordinates>Hide Coordinates</button></div>`;
    container.append(this.element); this.element.querySelector("[data-reset]").addEventListener("click", onReset); this.coordinateButton = this.element.querySelector("[data-coordinates]"); this.coordinateButton.addEventListener("click", () => { this.coordinatesVisible = !this.coordinatesVisible; onToggleCoordinates(this.coordinatesVisible); this.coordinateButton.textContent = this.coordinatesVisible ? "Hide Coordinates" : "Show Coordinates"; });
  }
  update(state) { this.element.querySelector("[data-square]").textContent = state.selectedSquare?.square3D ?? "None"; this.element.querySelector("[data-piece]").textContent = state.selectedPieceId ?? "None"; }
  dispose() { this.element.remove(); }
}
