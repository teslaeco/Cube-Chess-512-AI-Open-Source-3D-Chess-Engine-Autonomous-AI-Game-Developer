import {
  LOCALE_META,
  applyDocumentLocale,
  getLocaleMeta,
  translate,
} from "../i18n/locales.js";
import {
  CRAYON_CATHEDRAL_PRESET,
  FORGEMCP_PREMIUM_PRESET,
  normalizePlayerVisualPreset,
} from "../state/pieceVisualPresets.js";

const MENU_ITEMS = [
  ["newGame", "newGame"],
  ["save", "save"],
  ["online", "online"],
  ["settings", "settings"],
  ["subscribe", "subscribe"],
  ["license", "license"],
  ["help", "help"],
  ["about", "about"],
  ["forgemcp", "forgemcp"],
];

const REGION_KEYS = [
  "arctic",
  "europe",
  "asia",
  "africa",
  "northAmerica",
  "southAmerica",
  "australia",
  "antarctica",
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function option(value, label, selected = false) {
  return `<option value="${escapeHtml(value)}"${selected ? " selected" : ""}>${escapeHtml(label)}</option>`;
}

export class GameHud {
  constructor(container, actions) {
    this.actions = actions;
    this.activePanel = "newGame";
    this.activeComputerTab = "myComputer";
    this.coordinatesVisible = true;
    this.saves = [];
    this.state = null;
    this.renderedLanguage = null;
    this.lastMenuOpen = null;
    this.audioUrl = null;
    this.selectedPieceSet = normalizePlayerVisualPreset(
      typeof localStorage === "undefined"
        ? undefined
        : localStorage.getItem("cubeChessPieceSet"),
    );
    this.element = document.createElement("aside");
    this.element.className = "hud";
    this.element.innerHTML = `
      <header class="game-header">
        <div class="brand-lockup">
          <span class="brand-cube" aria-hidden="true">512</span>
          <div><strong>Cube Chess 512</strong><small>AI · 8×8×8</small></div>
        </div>
        <div class="turn-indicator" role="status" aria-live="polite">
          <span data-i="turn"></span>: <strong data-turn></strong>
          <span class="header-divider">·</span>
          <span data-i="activeLevel"></span>: <strong data-active-level>1A</strong>
        </div>
        <div class="header-actions">
          <button class="icon-button" data-action="toggle-computer" aria-label="Mini Computer 1/8">1/8</button>
          <button class="menu-button" data-action="open-menu"><span aria-hidden="true">☰</span> <span data-i="menu"></span></button>
        </div>
      </header>

      <section class="game-status-card" aria-label="Game status">
        <div><span data-i="move"></span><strong data-move>1</strong></div>
        <div><span data-i="status"></span><strong data-status></strong></div>
        <div><span data-i="selectedPiece"></span><strong data-piece></strong></div>
        <div><span data-i="legalMoves"></span><strong data-legal>0</strong></div>
        <p data-message aria-live="polite"></p>
      </section>

      <nav class="level-dock" aria-label="Board levels">
        ${"ABCDEFGH".split("").map((name, index) => `<button data-level="${index}" aria-label="Level ${name}"><span>${index + 1}</span>${name}</button>`).join("")}
      </nav>

      <nav class="control-dock" aria-label="Game and camera controls">
        <button data-action="undo"><span aria-hidden="true">↶</span><span data-i="undo"></span></button>
        <button data-action="redo"><span aria-hidden="true">↷</span><span data-i="redo"></span></button>
        <button data-action="previous"><span aria-hidden="true">↓</span><span data-i="previousLevel"></span></button>
        <button data-action="next"><span aria-hidden="true">↑</span><span data-i="nextLevel"></span></button>
        <button data-action="fit"><span aria-hidden="true">◇</span><span data-i="fitBoard"></span></button>
        <button data-action="active"><span aria-hidden="true">▱</span><span data-i="activeLayerView"></span></button>
        <button data-action="all"><span aria-hidden="true">▦</span><span data-i="showAll"></span></button>
        <button data-action="isolate"><span aria-hidden="true">▣</span><span data-i="isolate"></span></button>
      </nav>

      <div class="start-menu" data-start-menu aria-hidden="false">
        <div class="start-menu-card" role="dialog" aria-modal="true" aria-labelledby="main-menu-title">
          <header class="menu-titlebar">
            <div>
              <p class="eyebrow">Terraforming Planet · Open Source</p>
              <h1 id="main-menu-title">Cube Chess <span>512 AI</span></h1>
              <p data-i="demoHint"></p>
            </div>
            <button class="close-button" data-action="close-menu" data-testid="close-menu" aria-label="Close">×</button>
          </header>
          <div class="menu-shell">
            <nav class="menu-list" aria-label="Main menu">
              ${MENU_ITEMS.map(([panel, key], index) => `<button data-panel="${panel}" data-testid="menu-${panel}"><span class="menu-number">${index + 1}</span><span data-i="${key}"></span><span class="menu-arrow" aria-hidden="true">›</span></button>`).join("")}
            </nav>
            <section class="menu-panel" data-menu-panel aria-live="polite"></section>
          </div>
          <footer class="menu-footer">
            <label><span data-i="language"></span><select data-language aria-label="Language"></select></label>
            <span class="translation-status" data-translation-status></span>
            <a href="https://github.com/teslaeco/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer" target="_blank" rel="noreferrer">GitHub ↗</a>
          </footer>
        </div>
      </div>

      <aside class="mini-computer" data-mini-computer aria-hidden="true">
        <header>
          <div><span class="computer-led"></span><strong data-i="miniComputer"></strong></div>
          <button data-action="toggle-computer" aria-label="Close Mini Computer">×</button>
        </header>
        <nav class="computer-tabs">
          ${["myComputer", "gameFiles", "browser", "media", "otherFolders", "settings"].map((key) => `<button data-computer-tab="${key}" data-i="${key}"></button>`).join("")}
        </nav>
        <section class="computer-screen" data-computer-screen></section>
      </aside>
    `;
    container.append(this.element);
    this.bindEvents();
    this.populateLanguages();
  }

  t(key, values) {
    return translate(this.state?.language ?? "en", key, values);
  }

  populateLanguages() {
    this.element.querySelectorAll("[data-language]").forEach((select) => {
      select.innerHTML = LOCALE_META.map((locale) =>
        option(locale.tag, locale.nativeName),
      ).join("");
      if (this.state?.language) select.value = getLocaleMeta(this.state.language).tag;
    });
  }

  bindEvents() {
    this.handleClick = (event) => {
      const button = event.target.closest("button");
      if (!button || !this.element.contains(button)) return;
      if (button.dataset.level != null) {
        this.actions.level(Number(button.dataset.level));
        return;
      }
      if (button.dataset.panel) {
        this.activePanel = button.dataset.panel;
        if (this.activePanel === "save") void this.refreshSaves();
        else this.renderPanel();
        return;
      }
      if (button.dataset.computerTab) {
        this.activeComputerTab = button.dataset.computerTab;
        this.renderComputer();
        return;
      }
      const action = button.dataset.action;
      if (!action) return;
      this.runAction(action, button);
    };
    this.element.addEventListener("click", this.handleClick);

    this.handleChange = (event) => {
      const target = event.target;
      if (target.matches("[data-language]")) {
        this.actions.language(target.value);
      } else if (target.matches("[data-brightness]")) {
        this.actions.brightness(target.value);
      } else if (target.matches("[data-fog]")) {
        this.actions.fog(target.checked);
      } else if (target.matches("[data-coordinates]")) {
        this.coordinatesVisible = target.checked;
        this.actions.toggleCoordinates(target.checked);
      } else if (target.matches("[data-reduced-motion]")) {
        document.documentElement.classList.toggle("reduce-motion", target.checked);
        localStorage.setItem("cubeChessReducedMotion", target.checked ? "1" : "0");
      } else if (target.matches("[data-high-contrast]")) {
        document.documentElement.classList.toggle("high-contrast", target.checked);
        localStorage.setItem("cubeChessHighContrast", target.checked ? "1" : "0");
      } else if (target.matches("[data-large-text]")) {
        document.documentElement.classList.toggle("large-text", target.checked);
        localStorage.setItem("cubeChessLargeText", target.checked ? "1" : "0");
      } else if (target.matches("[data-piece-set]")) {
        this.selectedPieceSet = normalizePlayerVisualPreset(target.value);
        localStorage.setItem("cubeChessPieceSet", this.selectedPieceSet);
        this.actions.previewPieceSet(this.selectedPieceSet);
      } else if (target.matches("[data-audio-file]")) {
        this.loadLocalAudio(target.files?.[0]);
      }
    };
    this.element.addEventListener("change", this.handleChange);

    this.handleSubmit = (event) => {
      if (event.target.matches("[data-new-game-form]")) {
        event.preventDefault();
        const data = new FormData(event.target);
        this.actions.startGame({
          mode: data.get("mode"),
          whiteName: data.get("whiteName"),
          blackName: data.get("blackName"),
          humanSide: data.get("humanSide"),
          difficulty: data.get("difficulty"),
          clockMinutes: data.get("clockMinutes"),
          pieceSet: data.get("pieceSet"),
        });
      } else if (event.target.matches("[data-browser-form]")) {
        event.preventDefault();
        const query = new FormData(event.target).get("query")?.toString().trim();
        if (query) {
          const url = /^https?:\/\//i.test(query)
            ? query
            : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
          window.open(url, "_blank", "noopener,noreferrer");
        }
      }
    };
    this.element.addEventListener("submit", this.handleSubmit);

    this.handleKeyDown = (event) => {
      if (event.key === "Escape" && this.state?.menuOpen) {
        event.preventDefault();
        this.actions.closeMenu();
        return;
      }
      if (event.key === "Tab" && this.state?.menuOpen) {
        this.trapMenuFocus(event);
      }
    };
    window.addEventListener("keydown", this.handleKeyDown);
  }

  async runAction(action, button) {
    switch (action) {
      case "open-menu":
        this.actions.openMenu();
        break;
      case "close-menu":
        this.actions.closeMenu();
        break;
      case "undo":
      case "redo":
      case "all":
      case "isolate":
      case "active":
        this.actions[action]();
        break;
      case "previous":
        this.actions.previous();
        break;
      case "next":
        this.actions.next();
        break;
      case "fit":
        this.actions.fit();
        break;
      case "toggle-computer":
        this.toggleComputer();
        break;
      case "save-current":
        await this.actions.saveGame();
        await this.refreshSaves();
        break;
      case "load-save":
        await this.actions.loadSave(button.dataset.id);
        break;
      case "delete-save":
        if (window.confirm(this.t("confirmDelete"))) {
          await this.actions.deleteSave(button.dataset.id);
          await this.refreshSaves();
        }
        break;
      case "rename-save": {
        const current = this.saves.find((save) => save.id === button.dataset.id);
        const name = window.prompt(this.t("rename"), current?.name ?? "");
        if (name) {
          await this.actions.renameSave(button.dataset.id, name);
          await this.refreshSaves();
        }
        break;
      }
      case "export-save":
        await this.actions.exportSave(button.dataset.id);
        break;
      case "import-save":
        this.element.querySelector("[data-import-file]")?.click();
        break;
      case "diagnostic":
        await this.copyDiagnostic();
        break;
      case "reset-settings":
        this.resetAccessibilitySettings();
        this.renderPanel();
        break;
      case "virtual-key": {
        const input = this.element.querySelector("[data-browser-query]");
        if (input) {
          input.value += button.dataset.key;
          input.focus();
        }
        break;
      }
      case "virtual-backspace": {
        const input = this.element.querySelector("[data-browser-query]");
        if (input) input.value = input.value.slice(0, -1);
        break;
      }
    }
  }

  trapMenuFocus(event) {
    const dialog = this.element.querySelector(".start-menu-card");
    const focusable = [...dialog.querySelectorAll("button, a, input, select")].filter(
      (node) => !node.disabled && node.offsetParent !== null,
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async refreshSaves() {
    this.saves = await this.actions.listSaves();
    if (this.activePanel === "save") this.renderPanel();
    if (this.activeComputerTab === "gameFiles") this.renderComputer();
  }

  renderPanel() {
    const panel = this.element.querySelector("[data-menu-panel]");
    this.element.querySelectorAll("[data-panel]").forEach((button) => {
      const active = button.dataset.panel === this.activePanel;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
    panel.innerHTML = this.panelMarkup(this.activePanel);
    this.populateLanguages();
    const importInput = panel.querySelector("[data-import-file]");
    importInput?.addEventListener("change", async () => {
      const file = importInput.files?.[0];
      if (!file) return;
      await this.actions.importSave(file);
      await this.refreshSaves();
    });
  }

  panelMarkup(panel) {
    switch (panel) {
      case "newGame": {
        const selectedPieceSet = normalizePlayerVisualPreset(this.selectedPieceSet);
        return `
          <div class="panel-heading"><span>01</span><div><h2>${this.t("newGame")}</h2><p>${this.t("newGameIntro")}</p></div></div>
          <form class="new-game-form" data-new-game-form data-testid="new-game-form">
            <fieldset class="piece-set-picker"><legend>${this.t("choosePieceSet")}</legend>
              <label class="piece-set-card" data-testid="piece-set-premium">
                <input data-piece-set type="radio" name="pieceSet" value="${FORGEMCP_PREMIUM_PRESET}" ${selectedPieceSet === FORGEMCP_PREMIUM_PRESET ? "checked" : ""}>
                <span class="piece-set-preview premium-preview" aria-hidden="true"><span>♛</span><i></i></span>
                <span class="piece-set-copy"><strong>${this.t("premiumPieceSet")}</strong><small>${this.t("premiumPieceSetDescription")}</small></span>
              </label>
              <label class="piece-set-card" data-testid="piece-set-crayon">
                <input data-piece-set type="radio" name="pieceSet" value="${CRAYON_CATHEDRAL_PRESET}" ${selectedPieceSet === CRAYON_CATHEDRAL_PRESET ? "checked" : ""}>
                <span class="piece-set-preview cathedral-preview" aria-hidden="true"><span class="mini-window"></span><i></i><i></i><i></i><b></b></span>
                <span class="piece-set-copy"><strong>${this.t("crayonCathedralPieceSet")}</strong><small>${this.t("crayonCathedralPieceSetDescription")}</small></span>
              </label>
            </fieldset>
            <fieldset class="game-mode-picker"><legend>${this.t("chooseMode")}</legend>
              <label><input type="radio" name="mode" value="local" checked> ${this.t("localTwoPlayers")}</label>
              <label><input type="radio" name="mode" value="computer"> ${this.t("versusComputer")}</label>
              <label><input type="radio" name="mode" value="tutorial"> ${this.t("tutorialAi")}</label>
            </fieldset>
            <div class="form-grid">
              <label>${this.t("whitePlayerName")}<input name="whiteName" value="Gracz 1" maxlength="40"></label>
              <label>${this.t("blackPlayerName")}<input name="blackName" value="Gracz 2" maxlength="40"></label>
              <label>${this.t("yourSide")}<select name="humanSide">${option("white", this.t("white"), true)}${option("black", this.t("black"))}${option("random", this.t("randomSide"))}</select></label>
              <label>${this.t("difficulty")}<select name="difficulty">${option("easy", this.t("easy"), true)}${option("medium", this.t("medium"))}${option("hard", this.t("hard"))}</select></label>
              <label>${this.t("clock")}<select name="clockMinutes">${option("0", this.t("noClock"), true)}${option("10", this.t("minutes", { count: 10 }))}${option("30", this.t("minutes", { count: 30 }))}${option("60", this.t("minutes", { count: 60 }))}</select></label>
            </div>
            <button class="primary-action" type="submit" data-testid="start-game">${this.t("startGame")} <span aria-hidden="true">→</span></button>
          </form>`;
      }
      case "save":
        return `
          <div class="panel-heading"><span>02</span><div><h2>${this.t("save")}</h2><p>${this.t("localPrivacy")}</p></div></div>
          <div class="save-actions"><button class="primary-action" data-action="save-current">${this.t("saveCurrent")}</button><button data-action="import-save">${this.t("importJson")}</button><input hidden type="file" accept="application/json,.json" data-import-file></div>
          <h3>${this.t("savedGames")}</h3>${this.savesMarkup()}`;
      case "online":
        return `
          <div class="panel-heading"><span>03</span><div><h2>${this.t("online")}</h2><p>${this.t("regionsIntro")}</p></div></div>
          <div class="region-grid">${REGION_KEYS.map((key, index) => `<article><span>${index + 1}</span><div><strong>${this.t(key)}</strong><small><i></i>${this.t("offline")}</small></div></article>`).join("")}</div>`;
      case "settings": {
        const meta = getLocaleMeta(this.state?.language);
        return `
          <div class="panel-heading"><span>04</span><div><h2>${this.t("settings")}</h2><p>${this.t("languageQuality")}: ${this.t(meta.status === "verified" ? "verified" : "machineDraft")}</p></div></div>
          <div class="settings-grid">
            <section><h3>${this.t("language")}</h3>
              <label>${this.t("language")}<select data-language aria-label="${this.t("language")}"></select></label>
            </section>
            <section><h3>${this.t("graphics")}</h3>
              <label>${this.t("brightness")}<input data-brightness type="range" min="0.5" max="1.5" step="0.05" value="${escapeHtml(localStorage.getItem("cubeChessBrightness") ?? "1")}"></label>
              <label class="check-row"><input data-fog type="checkbox" ${localStorage.getItem("cubeChessFog") === "1" ? "checked" : ""}> ${this.t("fog")}</label>
              <label class="check-row"><input data-coordinates type="checkbox" ${this.coordinatesVisible ? "checked" : ""}> ${this.t("coordinates")}</label>
            </section>
            <section><h3>${this.t("accessibility")}</h3>
              <label class="check-row"><input data-reduced-motion type="checkbox" ${localStorage.getItem("cubeChessReducedMotion") === "1" ? "checked" : ""}> ${this.t("reducedMotion")}</label>
              <label class="check-row"><input data-high-contrast type="checkbox" ${localStorage.getItem("cubeChessHighContrast") === "1" ? "checked" : ""}> ${this.t("highContrast")}</label>
              <label class="check-row"><input data-large-text type="checkbox" ${localStorage.getItem("cubeChessLargeText") === "1" ? "checked" : ""}> ${this.t("largeText")}</label>
            </section>
            <section><h3>${this.t("sound")}</h3><p>${this.t("mediaNotice")}</p></section>
            <section><h3>${this.t("server")}</h3><p>${this.t("offline")}</p></section>
          </div><button data-action="reset-settings">${this.t("resetSettings")}</button>`;
      }
      case "subscribe":
        return `<div class="panel-heading"><span>05</span><div><h2>${this.t("proTitle")}</h2><p>${this.t("comingSoon")}</p></div></div><div class="notice-card"><strong>${this.t("comingSoon")}</strong><p>${this.t("proBody")}</p></div>`;
      case "license":
        return `<div class="panel-heading"><span>06</span><div><h2>${this.t("licenseTitle")}</h2><p>MIT</p></div></div><div class="prose"><p>${this.t("licenseBody")}</p><p>${this.t("openAiNotice")}</p><a class="primary-action" href="https://github.com/teslaeco/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/blob/main/LICENSE" target="_blank" rel="noreferrer">${this.t("sourceCode")} ↗</a></div>`;
      case "help":
        return `<div class="panel-heading"><span>07</span><div><h2>${this.t("helpTitle")}</h2><p>${this.t("contact")}: <a href="mailto:xodobrox@gmail.com">xodobrox@gmail.com</a></p></div></div><div class="help-steps"><article><span>1</span><p>${this.t("helpSteps")}</p></article><article><span>2</span><p>${this.t("cameraHelp")}</p></article></div><button data-action="diagnostic">${this.t("diagnostic")}</button>`;
      case "about":
        return `<div class="panel-heading"><span>08</span><div><h2>${this.t("aboutTitle")}</h2><p>Cube Chess 512 AI · Terraforming Planet</p></div></div><div class="prose about-copy"><p>${this.t("aboutP1")}</p><p>${this.t("aboutP2")}</p><p>${this.t("aboutP3")}</p><p class="responsibility-note">${this.t("aboutP4")}</p></div>`;
      case "forgemcp":
        return `
          <div class="panel-heading"><span>09</span><div><h2>${this.t("forgemcpTitle")}</h2><p>${this.t("forgemcpIntro")}</p></div></div>
          <div class="forgemcp-panel">
            <section class="forgemcp-flow" aria-label="ForgeMCP architecture"><strong>${this.t("forgemcpArchitecture")}</strong><p>HUMAN → GAME COORDINATOR → AI TRAINER / RULES ENGINEER / VISUAL AGENT / QA → WEBMCP TOOLS → CUBE RULE ENGINE → EXECUTED EXPERIMENT → VERIFICATION → HUMAN DECISION</p></section>
            <section><h3>${this.t("forgemcpSelfPlayTitle")}</h3><p class="forgemcp-pipeline">BASELINE AI vs CANDIDATE AI → legal games → stored moves/results → analyze errors → compare policies → retest → benchmark → legality/regression checks → human review → <strong>PROMOTE or REJECT</strong></p></section>
            <div class="forgemcp-grid">
              <article><h3>${this.t("forgemcpTruthTitle")}</h3><p>${this.t("forgemcpTruthBody")}</p></article>
              <article><h3>${this.t("forgemcpStateTitle")}</h3><p>${this.t("forgemcpStateBody")}</p></article>
            </div>
            <nav class="forgemcp-links" aria-label="ForgeMCP project links">
              <a class="primary-action" href="https://github.com/Terraforming-Planet/ForgeMCP-Multi-Agent-Research---Game-Studio" target="_blank" rel="noreferrer">${this.t("forgemcpRepository")} ↗</a>
              <a href="./forgemcp/">${this.t("forgemcpPublicPage")}</a>
              <a href="https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/" target="_blank" rel="noreferrer">${this.t("terraObservationSystem")} ↗</a>
            </nav>
          </div>`;
      default:
        return "";
    }
  }

  savesMarkup() {
    if (!this.saves.length) return `<p class="empty-state">${this.t("noSaves")}</p>`;
    return `<div class="save-list">${this.saves.map((save) => `
      <article><div><strong>${escapeHtml(save.name)}</strong><small>${new Intl.DateTimeFormat(this.state?.language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(save.savedAt))} · ${escapeHtml(save.whiteName)} vs ${escapeHtml(save.blackName)} · ${save.moveCount}</small></div>
      <div><button data-action="load-save" data-id="${escapeHtml(save.id)}">${this.t("load")}</button><button data-action="rename-save" data-id="${escapeHtml(save.id)}">${this.t("rename")}</button><button data-action="export-save" data-id="${escapeHtml(save.id)}">${this.t("exportJson")}</button><button class="danger" data-action="delete-save" data-id="${escapeHtml(save.id)}">${this.t("delete")}</button></div></article>`).join("")}</div>`;
  }

  toggleComputer() {
    const computer = this.element.querySelector("[data-mini-computer]");
    const open = !computer.classList.contains("open");
    computer.classList.toggle("open", open);
    computer.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) {
      this.refreshSaves();
      this.renderComputer();
    }
  }

  renderComputer() {
    this.element.querySelectorAll("[data-computer-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.computerTab === this.activeComputerTab);
    });
    const screen = this.element.querySelector("[data-computer-screen]");
    if (this.activeComputerTab === "myComputer") {
      screen.innerHTML = `<div class="desktop-icon">♟<span>${this.t("gameFiles")}</span></div><div class="desktop-icon">⌕<span>${this.t("browser")}</span></div><p>${this.t("virtualDesktopNotice")}</p>`;
    } else if (this.activeComputerTab === "gameFiles") {
      screen.innerHTML = `<h3>${this.t("gameFiles")}</h3>${this.savesMarkup()}`;
    } else if (this.activeComputerTab === "browser") {
      screen.innerHTML = `<form data-browser-form class="browser-bar"><input name="query" data-browser-query inputmode="url" placeholder="${escapeHtml(this.t("searchWeb"))}"><button>${this.t("openNewTab")}</button></form><details class="virtual-keyboard"><summary>⌨</summary><div>${"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-/".split("").map((key) => `<button type="button" data-action="virtual-key" data-key="${key}">${key}</button>`).join("")}<button type="button" data-action="virtual-backspace">⌫</button></div></details><p>${this.t("virtualDesktopNotice")}</p>`;
    } else if (this.activeComputerTab === "media") {
      screen.innerHTML = `<h3>${this.t("media")}</h3><p>${this.t("mediaNotice")}</p><label class="file-picker">${this.t("chooseAudio")}<input data-audio-file type="file" accept="audio/*"></label><audio data-audio controls></audio><label class="check-row"><input type="checkbox"> ${this.t("sharedListening")}</label><small>${this.t("onlineSyncUnavailable")}</small>`;
    } else {
      screen.innerHTML = `<h3>${this.t(this.activeComputerTab)}</h3><p>${this.t("virtualDesktopNotice")}</p>`;
    }
    this.applyTranslations();
  }

  loadLocalAudio(file) {
    if (!file) return;
    if (this.audioUrl) URL.revokeObjectURL(this.audioUrl);
    this.audioUrl = URL.createObjectURL(file);
    const audio = this.element.querySelector("[data-audio]");
    if (audio) {
      audio.src = this.audioUrl;
      audio.play().catch(() => {});
    }
  }

  async copyDiagnostic() {
    const canvas = this.element.parentElement.querySelector("canvas");
    const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
    const report = [
      `Cube Chess 512 AI`,
      `URL: ${location.href}`,
      `User agent: ${navigator.userAgent}`,
      `Viewport: ${innerWidth}x${innerHeight} @${devicePixelRatio}`,
      `Language: ${this.state?.language}`,
      `WebGL: ${gl ? gl.getParameter(gl.VERSION) : "unavailable"}`,
      `State: ${this.state?.appState}`,
      `Level: ${this.state?.activeLevel}`,
      `Move: ${this.state?.fullMoveNumber}`,
    ].join("\n");
    await navigator.clipboard.writeText(report);
    this.element.querySelector("[data-message]").textContent = this.t("diagnosticCopied");
  }

  resetAccessibilitySettings() {
    for (const key of ["cubeChessReducedMotion", "cubeChessHighContrast", "cubeChessLargeText", "cubeChessFog"]) {
      localStorage.removeItem(key);
    }
    document.documentElement.classList.remove("reduce-motion", "high-contrast", "large-text");
    this.actions.fog(false);
  }

  applyTranslations() {
    this.element.querySelectorAll("[data-i]").forEach((node) => {
      node.textContent = this.t(node.dataset.i);
    });
  }

  update(state) {
    const languageChanged = this.renderedLanguage !== state.language;
    const menuOpened = state.menuOpen && this.lastMenuOpen !== true;
    this.state = state;
    const meta = applyDocumentLocale(state.language);
    this.element.dir = meta.direction;
    this.element.querySelectorAll("[data-language]").forEach((select) => {
      select.value = meta.tag;
    });
    this.element.querySelector("[data-translation-status]").textContent = `${this.t("languageQuality")}: ${this.t(meta.status === "verified" ? "verified" : meta.status === "incomplete" ? "incomplete" : "machineDraft")}`;
    this.applyTranslations();

    this.element.querySelector("[data-active-level]").textContent = state.levels[state.activeLevel].label;
    this.element.querySelector("[data-turn]").textContent = this.t(state.sideToMove);
    this.element.querySelector("[data-move]").textContent = state.fullMoveNumber;
    this.element.querySelector("[data-status]").textContent = this.t(state.status.kind);
    const selected = state.pieces.find((piece) => piece.id === state.selectedPieceId);
    this.element.querySelector("[data-piece]").textContent = selected
      ? `${selected.type} · ${selected.position.square3D}`
      : this.t("none");
    this.element.querySelector("[data-legal]").textContent = state.legalTargets.length;
    this.element.querySelector("[data-message]").textContent = state.message
      ? this.t(state.message)
      : "";
    this.element.querySelectorAll("[data-level]").forEach((button) => {
      const active = Number(button.dataset.level) === state.activeLevel;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    this.element.querySelector('[data-action="undo"]').disabled = !state.canUndo || state.busy;
    this.element.querySelector('[data-action="redo"]').disabled = !state.canRedo || state.busy;
    const menu = this.element.querySelector("[data-start-menu]");
    menu.classList.toggle("open", state.menuOpen);
    menu.setAttribute("aria-hidden", state.menuOpen ? "false" : "true");
    this.element.parentElement.classList.toggle("menu-open", state.menuOpen);
    this.element.parentElement.classList.toggle("game-running", !state.menuOpen && state.appState !== "demo");
    if (languageChanged || menuOpened) this.renderPanel();
    if (languageChanged) this.renderComputer();
    if (menuOpened) {
      queueMicrotask(() => this.element.querySelector(`[data-panel="${this.activePanel}"]`)?.focus());
      this.refreshSaves();
    }
    this.renderedLanguage = state.language;
    this.lastMenuOpen = state.menuOpen;
  }

  dispose() {
    if (this.audioUrl) URL.revokeObjectURL(this.audioUrl);
    this.element.removeEventListener("click", this.handleClick);
    this.element.removeEventListener("change", this.handleChange);
    this.element.removeEventListener("submit", this.handleSubmit);
    window.removeEventListener("keydown", this.handleKeyDown);
    this.element.remove();
  }
}
