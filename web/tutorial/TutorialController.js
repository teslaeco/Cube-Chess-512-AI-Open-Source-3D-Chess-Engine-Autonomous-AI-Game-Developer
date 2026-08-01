const STORAGE_KEY = "cubeChessTutorial";
const STORAGE_VERSION = 1;

const COPY = {
  en: {
    title: "3D Rules Tutorial",
    open: "Tutorial",
    close: "Close tutorial",
    start: "Start tutorial",
    skip: "Skip",
    reset: "Reset",
    previous: "Back",
    next: "Next",
    why: "Why?",
    moves: "Show legal moves",
    repeat: "Repeat",
    auto: "Explain every move automatically",
    progress: "Step {current} of {total}",
    boardTitle: "A board with 512 squares",
    board: "Cube Chess 512 contains eight 8 × 8 boards stacked from level A to H. Length, width and height are equal movement axes.",
    selectTitle: "Choose a white piece",
    select: "Choose a white piece. The engine will highlight every legal destination.",
    selectedTitle: "Piece selected",
    selected: "The highlighted squares come directly from the game engine. Targets on another level are spatial moves.",
    dimensionTitle: "The third dimension",
    dimension: "Classical chess rules are extended into a third dimension. A piece keeps its movement geometry and may use height as another axis.",
    completeTitle: "First spatial lesson complete",
    complete: "You have learned the core rule: movement is not replaced; classical geometry is extended across eight levels.",
    legalSame: "This is a legal move on the same level.",
    legalSpatial: "This is a legal spatial move from level {from} to level {to}.",
    capture: "This move captures an opposing piece on level {to}.",
    whiteOnly: "Choose a white piece to continue this lesson.",
    noMoves: "Select a piece first. Legal moves will be highlighted by the engine.",
    rook: "The rook moves along one straight axis, including vertically between levels, and cannot jump over pieces.",
    bishop: "The bishop follows diagonal geometry. In 3D, a diagonal may change horizontal position and level together.",
    queen: "The queen combines rook and bishop geometry across all three axes.",
    king: "The king moves one legal step in any direction allowed by the engine.",
    knight: "The knight changes two squares on one axis and one on another. Height may be one of those axes, and the knight can jump.",
    pawn: "Pawn movement, captures, first move and promotion are always explained from the engine's current legal targets.",
    generic: "This piece keeps its classical movement geometry and extends it into the height axis.",
  },
  pl: {
    title: "Samouczek zasad 3D",
    open: "Samouczek",
    close: "Zamknij samouczek",
    start: "Rozpocznij samouczek",
    skip: "Pomiń",
    reset: "Resetuj",
    previous: "Wstecz",
    next: "Dalej",
    why: "Dlaczego?",
    moves: "Pokaż legalne ruchy",
    repeat: "Powtórz",
    auto: "Automatycznie wyjaśniaj każdy ruch",
    progress: "Krok {current} z {total}",
    boardTitle: "Plansza z 512 polami",
    board: "Cube Chess 512 składa się z ośmiu plansz 8 × 8 ułożonych od poziomu A do H. Długość, szerokość i wysokość są równorzędnymi osiami ruchu.",
    selectTitle: "Wybierz białą figurę",
    select: "Wybierz białą figurę. Silnik gry podświetli wszystkie legalne pola docelowe.",
    selectedTitle: "Figura wybrana",
    selected: "Podświetlone pola pochodzą bezpośrednio z silnika gry. Cele na innym poziomie są ruchami przestrzennymi.",
    dimensionTitle: "Trzeci wymiar",
    dimension: "Klasyczne reguły szachów zostały rozszerzone na trzeci wymiar. Figura zachowuje geometrię ruchu i może użyć wysokości jako kolejnej osi.",
    completeTitle: "Pierwsza lekcja przestrzenna ukończona",
    complete: "Poznałeś główną zasadę: ruch nie zostaje zastąpiony, lecz klasyczna geometria zostaje rozszerzona na osiem poziomów.",
    legalSame: "To legalny ruch na tym samym poziomie.",
    legalSpatial: "To legalny ruch przestrzenny z poziomu {from} na poziom {to}.",
    capture: "Ten ruch zbija figurę przeciwnika na poziomie {to}.",
    whiteOnly: "Wybierz białą figurę, aby kontynuować tę lekcję.",
    noMoves: "Najpierw wybierz figurę. Silnik gry podświetli legalne ruchy.",
    rook: "Wieża porusza się wzdłuż jednej prostej osi, także pionowo między poziomami, i nie może przeskakiwać figur.",
    bishop: "Goniec zachowuje ruch po przekątnej. W 3D przekątna może jednocześnie zmieniać pozycję poziomą i poziom planszy.",
    queen: "Królowa łączy geometrię wieży i gońca we wszystkich trzech osiach.",
    king: "Król wykonuje jeden legalny krok w dowolnym kierunku dopuszczonym przez silnik.",
    knight: "Skoczek zmienia pozycję o dwa pola w jednej osi i jedno w drugiej. Jedną z osi może być wysokość, a skoczek może przeskakiwać.",
    pawn: "Ruch pionka, bicie, pierwszy ruch i promocja są zawsze objaśniane na podstawie aktualnych legalnych celów silnika.",
    generic: "Figura zachowuje klasyczną geometrię ruchu i rozszerza ją na oś wysokości.",
  },
};

const STEPS = [
  ["boardTitle", "board"],
  ["selectTitle", "select"],
  ["selectedTitle", "selected"],
  ["dimensionTitle", "dimension"],
  ["completeTitle", "complete"],
];

function interpolate(text, values = {}) {
  return text.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

export function loadTutorialProgress(storage = globalThis.localStorage) {
  const fallback = { version: STORAGE_VERSION, step: 0, skipped: false, complete: false, autoExplain: true };
  try {
    const value = JSON.parse(storage?.getItem(STORAGE_KEY) || "null");
    if (!value || value.version !== STORAGE_VERSION) return fallback;
    return { ...fallback, ...value, step: Math.max(0, Math.min(STEPS.length - 1, Number(value.step) || 0)) };
  } catch {
    return fallback;
  }
}

export function classifyMove(move) {
  if (!move?.from || !move?.to) return "unknown";
  if (move.capturedPieceId || move.kind === "capture") return "capture";
  return move.from.z === move.to.z ? "same-level" : "spatial";
}

export function pieceExplanationKey(piece) {
  const type = String(piece?.type || piece?.kind || "").toLowerCase();
  return ["rook", "bishop", "queen", "king", "knight", "pawn"].includes(type) ? type : "generic";
}

export class TutorialController {
  constructor(root, application) {
    this.root = root;
    this.application = application;
    this.progress = loadTutorialProgress();
    this.lastSequence = 0;
    this.lastSelectedPieceId = null;
    this.isOpen = !this.progress.skipped && !this.progress.complete;
    this.createUi();
    this.render(application.presentation.snapshot());
  }

  t(key, values) {
    const language = this.application.presentation.language === "pl" ? "pl" : "en";
    return interpolate(COPY[language][key] || COPY.en[key] || key, values);
  }

  createUi() {
    this.launcher = document.createElement("button");
    this.launcher.type = "button";
    this.launcher.className = "tutorial-launcher";
    this.launcher.addEventListener("click", () => { this.isOpen = true; this.render(); });

    this.panel = document.createElement("aside");
    this.panel.className = "tutorial-panel";
    this.panel.setAttribute("aria-live", "polite");
    this.panel.innerHTML = `
      <div class="tutorial-header"><strong data-role="title"></strong><button type="button" data-action="close" aria-label="Close">×</button></div>
      <div class="tutorial-progress" data-role="progress"></div>
      <h2 data-role="step-title"></h2>
      <p data-role="message"></p>
      <p class="tutorial-explanation" data-role="explanation"></p>
      <label class="tutorial-toggle"><input type="checkbox" data-action="auto"> <span data-role="auto-label"></span></label>
      <div class="tutorial-actions">
        <button type="button" data-action="previous"></button><button type="button" data-action="next"></button>
        <button type="button" data-action="why"></button><button type="button" data-action="moves"></button>
        <button type="button" data-action="repeat"></button><button type="button" data-action="skip"></button>
        <button type="button" data-action="reset"></button>
      </div>`;
    this.panel.addEventListener("click", (event) => this.handleAction(event));
    this.panel.querySelector('[data-action="auto"]').addEventListener("change", (event) => {
      this.progress.autoExplain = event.target.checked;
      this.save();
    });
    this.root.append(this.launcher, this.panel);
  }

  handleAction(event) {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    if (action === "close") this.isOpen = false;
    if (action === "previous") this.progress.step = Math.max(0, this.progress.step - 1);
    if (action === "next") this.progress.step = Math.min(STEPS.length - 1, this.progress.step + 1);
    if (action === "skip") { this.progress.skipped = true; this.isOpen = false; }
    if (action === "reset") this.progress = { version: STORAGE_VERSION, step: 0, skipped: false, complete: false, autoExplain: true };
    if (action === "why") this.showPieceExplanation();
    if (action === "moves") this.showLegalMoves();
    if (action === "repeat") this.panel.classList.remove("tutorial-pulse"); requestAnimationFrame(() => this.panel.classList.add("tutorial-pulse"));
    this.save();
    this.render();
  }

  save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress)); } catch { /* storage is optional */ }
  }

  showPieceExplanation() {
    const state = this.application.presentation.snapshot();
    const piece = state.pieces.find((candidate) => candidate.id === state.selectedPieceId);
    this.dynamicMessage = this.t(pieceExplanationKey(piece));
  }

  showLegalMoves() {
    const state = this.application.presentation.snapshot();
    this.dynamicMessage = state.legalTargets.length
      ? this.t("selected")
      : this.t("noMoves");
  }

  onStateChange(state) {
    if (state.selectedPieceId && state.selectedPieceId !== this.lastSelectedPieceId) {
      const piece = state.pieces.find((candidate) => candidate.id === state.selectedPieceId);
      if (this.progress.step === 1 && piece?.color !== "white") this.dynamicMessage = this.t("whiteOnly");
      else if (piece?.color === "white") this.progress.step = Math.max(this.progress.step, 2);
      this.lastSelectedPieceId = state.selectedPieceId;
    }
    if (state.lastMove?.sequence && state.lastMove.sequence !== this.lastSequence) {
      this.lastSequence = state.lastMove.sequence;
      const kind = classifyMove(state.lastMove);
      const from = "ABCDEFGH"[state.lastMove.from?.z ?? 0];
      const to = "ABCDEFGH"[state.lastMove.to?.z ?? 0];
      this.dynamicMessage = kind === "capture" ? this.t("capture", { to }) : kind === "spatial" ? this.t("legalSpatial", { from, to }) : this.t("legalSame");
      if (kind === "spatial") this.progress.step = Math.max(this.progress.step, 4);
      if (this.progress.autoExplain) this.isOpen = true;
    }
    this.save();
    this.render(state);
  }

  render(state = this.application.presentation.snapshot()) {
    const [titleKey, messageKey] = STEPS[this.progress.step];
    this.launcher.textContent = this.t("open");
    this.panel.hidden = !this.isOpen;
    this.launcher.hidden = this.isOpen;
    this.panel.querySelector('[data-role="title"]').textContent = this.t("title");
    this.panel.querySelector('[data-role="progress"]').textContent = this.t("progress", { current: this.progress.step + 1, total: STEPS.length });
    this.panel.querySelector('[data-role="step-title"]').textContent = this.t(titleKey);
    this.panel.querySelector('[data-role="message"]').textContent = this.t(messageKey);
    this.panel.querySelector('[data-role="explanation"]').textContent = this.dynamicMessage || "";
    this.panel.querySelector('[data-role="auto-label"]').textContent = this.t("auto");
    this.panel.querySelector('[data-action="auto"]').checked = this.progress.autoExplain;
    for (const action of ["previous", "next", "why", "moves", "repeat", "skip", "reset"]) {
      this.panel.querySelector(`[data-action="${action}"]`).textContent = this.t(action);
    }
    this.panel.querySelector('[data-action="previous"]').disabled = this.progress.step === 0;
    this.panel.querySelector('[data-action="next"]').disabled = this.progress.step === STEPS.length - 1;
    this.panel.dataset.step = String(this.progress.step);
    this.panel.dataset.selected = state.selectedPieceId || "";
  }

  dispose() {
    this.launcher.remove();
    this.panel.remove();
  }
}
