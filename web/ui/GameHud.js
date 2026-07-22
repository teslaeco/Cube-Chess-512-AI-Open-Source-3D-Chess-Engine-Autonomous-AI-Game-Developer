const TEXT = {
  pl: {
    activeLevel: "Aktywny poziom",
    visibleLevels: "Widoczne poziomy",
    visibleSquares: "Widoczne pola",
    totalSquares: "Wszystkie pola",
    selectedSquare: "Wybrane pole",
    selectedPiece: "Wybrana figura",
    legalMoves: "Legalne ruchy",
    turn: "Ruch",
    move: "Numer ruchu",
    status: "Status",
    none: "Brak",
    white: "Białe",
    black: "Czarne",
    active: "Gra trwa",
    checkmate: "Mat",
    stalemate: "Pat",
    newGame: "Nowa gra",
    undo: "Cofnij",
    redo: "Ponów",
    menu: "Menu",
    start: "Rozpocznij grę lokalną",
    language: "Język",
    online: "Online — opcja w budowie",
    settings: "Ustawienia",
    save: "Zapisz — opcja w budowie",
    subscribe: "Subskrybuj — opcja w budowie",
    license: "Licencja",
    help: "Pomoc: xodobrox@gmail.com",
    about: "O nas",
    whiteToMove: "Teraz ruch białych",
    blackToMove: "Teraz ruch czarnych",
    illegalMove: "To pole nie jest legalnym celem",
  },
  en: {
    activeLevel: "Active level",
    visibleLevels: "Visible levels",
    visibleSquares: "Visible squares",
    totalSquares: "Total cube squares",
    selectedSquare: "Selected square",
    selectedPiece: "Selected piece",
    legalMoves: "Legal moves",
    turn: "Turn",
    move: "Move number",
    status: "Status",
    none: "None",
    white: "White",
    black: "Black",
    active: "Active",
    checkmate: "Checkmate",
    stalemate: "Stalemate",
    newGame: "New Game",
    undo: "Undo",
    redo: "Redo",
    menu: "Menu",
    start: "Start local game",
    language: "Language",
    online: "Online — option under construction",
    settings: "Settings",
    save: "Save — option under construction",
    subscribe: "Subscribe — option under construction",
    license: "License",
    help: "Help: xodobrox@gmail.com",
    about: "About",
    whiteToMove: "White to move",
    blackToMove: "Black to move",
    illegalMove: "That square is not a legal target",
  },
};

export class GameHud {
  constructor(container, actions) {
    this.actions = actions;
    this.coordinatesVisible = true;
    this.element = document.createElement("aside");
    this.element.className = "hud";
    const labels = "ABCDEFGH".split("").map(
      (name, index) => `${index + 1}${name}`,
    );
    this.element.innerHTML = `
      <div class="hud-top"><h1>Cube Chess 512 <span>AI</span></h1><button data-menu>☰</button></div>
      <dl>
        <dt data-i="activeLevel"></dt><dd data-active-level>1A</dd>
        <dt data-i="turn"></dt><dd data-turn></dd>
        <dt data-i="move"></dt><dd data-move>1</dd>
        <dt data-i="status"></dt><dd data-status></dd>
        <dt data-i="visibleLevels"></dt><dd data-visible-levels>8</dd>
        <dt data-i="visibleSquares"></dt><dd data-visible-squares>512</dd>
        <dt data-i="totalSquares"></dt><dd>512</dd>
        <dt data-i="selectedSquare"></dt><dd data-square></dd>
        <dt data-i="selectedPiece"></dt><dd data-piece></dd>
        <dt data-i="legalMoves"></dt><dd data-legal>0</dd>
      </dl>
      <div class="level-buttons">${labels.map((label, index) => `<button data-level="${index}">${label}</button>`).join("")}</div>
      <p data-message></p>
      <div class="hud-actions">
        <button data-new-game></button><button data-undo></button><button data-redo></button>
        <button data-previous>◀</button><button data-next>▶</button>
        <button data-all>Show All</button><button data-isolate>Isolate</button>
        <button data-cube>Cube View</button><button data-active>Layer View</button>
        <button data-reset>Reset Camera</button><button data-coordinates>Hide Coordinates</button>
        <label>Brightness <input data-brightness type="range" min="0.5" max="1.5" step="0.05" value="1"></label>
      </div>
      <div class="start-menu" data-start-menu>
        <div class="start-menu-card">
          <h2>Cube Chess 512 AI</h2>
          <div class="menu-grid">
            <button data-start></button><button data-save></button><button data-online></button><button data-settings></button>
            <button data-subscribe></button><button data-license></button><a href="mailto:xodobrox@gmail.com" data-help></a><button data-about></button>
          </div>
          <label><span data-i="language"></span>
            <select data-language><option value="pl">Polski</option><option value="en">English</option></select>
          </label>
          <section class="regions"><strong>Serwery / Regions</strong><ol>
            <li>Arctic — option under construction</li><li>Europe — option under construction</li><li>Asia — option under construction</li><li>Africa — option under construction</li><li>North America — option under construction</li><li>South America — option under construction</li><li>Australia — option under construction</li><li>Antarctica — option under construction</li>
          </ol></section>
        </div>
      </div>`;
    container.append(this.element);

    const on = (selector, handler) => this.element.querySelector(selector).addEventListener("click", handler);
    on("[data-reset]", actions.reset); on("[data-new-game]", actions.newGame);
    on("[data-undo]", actions.undo); on("[data-redo]", actions.redo);
    on("[data-menu]", actions.openMenu); on("[data-start]", actions.startLocalGame);
    ["previous", "next", "all", "isolate", "cube", "active"].forEach((name) => on(`[data-${name}]`, actions[name]));
    this.element.querySelectorAll("[data-level]").forEach((button) => button.addEventListener("click", () => actions.level(Number(button.dataset.level))));
    const language = this.element.querySelector("[data-language]");
    language.addEventListener("change", () => actions.language(language.value));
    this.coordinateButton = this.element.querySelector("[data-coordinates]");
    this.coordinateButton.addEventListener("click", () => {
      this.coordinatesVisible = !this.coordinatesVisible;
      actions.toggleCoordinates(this.coordinatesVisible);
    });
    const brightness = this.element.querySelector("[data-brightness]");
    brightness.value = localStorage.getItem("cubeChessBrightness") ?? "1";
    brightness.addEventListener("input", () => actions.brightness(brightness.value));
  }

  update(state) {
    const t = TEXT[state.language] ?? TEXT.en;
    this.element.querySelectorAll("[data-i]").forEach((node) => { node.textContent = t[node.dataset.i] ?? node.dataset.i; });
    this.element.querySelector("[data-new-game]").textContent = t.newGame;
    this.element.querySelector("[data-undo]").textContent = t.undo;
    this.element.querySelector("[data-redo]").textContent = t.redo;
    this.element.querySelector("[data-start]").textContent = t.start;
    this.element.querySelector("[data-save]").textContent = t.save;
    this.element.querySelector("[data-online]").textContent = t.online;
    this.element.querySelector("[data-settings]").textContent = t.settings;
    this.element.querySelector("[data-subscribe]").textContent = t.subscribe;
    this.element.querySelector("[data-license]").textContent = t.license;
    this.element.querySelector("[data-help]").textContent = t.help;
    this.element.querySelector("[data-about]").textContent = t.about;
    this.element.querySelector("[data-square]").textContent = state.selectedSquare?.square3D ?? t.none;
    const selected = state.pieces.find((piece) => piece.id === state.selectedPieceId);
    this.element.querySelector("[data-piece]").textContent = selected ? `${selected.color} ${selected.type} — ${selected.position.square3D}` : t.none;
    this.element.querySelector("[data-legal]").textContent = state.legalTargets.length;
    this.element.querySelector("[data-active-level]").textContent = state.levels[state.activeLevel].label;
    this.element.querySelector("[data-turn]").textContent = t[state.sideToMove];
    this.element.querySelector("[data-move]").textContent = state.fullMoveNumber;
    this.element.querySelector("[data-status]").textContent = t[state.status.kind] ?? state.status.kind;
    this.element.querySelector("[data-message]").textContent = state.message ? (t[state.message] ?? state.message) : "";
    const count = state.levels.filter((level) => level.visible).length;
    this.element.querySelector("[data-visible-levels]").textContent = count;
    this.element.querySelector("[data-visible-squares]").textContent = count * 64;
    this.element.querySelector("[data-undo]").disabled = !state.canUndo;
    this.element.querySelector("[data-redo]").disabled = !state.canRedo;
    this.element.querySelector("[data-start-menu]").classList.toggle("open", state.menuOpen);
    this.element.querySelector("[data-language]").value = state.language;
    this.element.querySelectorAll(".level-buttons button").forEach((button) => button.classList.toggle("active", Number(button.dataset.level) === state.activeLevel));
  }

  dispose() { this.element.remove(); }
}
