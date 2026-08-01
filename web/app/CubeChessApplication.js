import { AiController } from "../ai/AiController.js";
import { AttractModeController } from "../demo/AttractModeController.js";
import { ChessRenderer } from "../renderer/ChessRenderer.js";
import { SaveRepository } from "../storage/SaveRepository.js";
import { GameHud } from "../ui/GameHud.js";
import { GamePresentation } from "./GamePresentation.js";

const AI_WATCHDOG_MS = 8_000;

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export class CubeChessApplication {
  constructor(root) {
    this.root = root;
    root.className = "cube-chess-app";
    this.stage = document.createElement("section");
    this.stage.className = "game-stage";
    root.append(this.stage);

    this.presentation = new GamePresentation();
    this.saveRepository = new SaveRepository();
    this.ai = new AiController();
    this.aiRequestPending = false;
    this.lastAutosavedMove = 0;
    this.autosaveTimer = null;
    this.aiWatchdogTimer = null;
    this.applyStoredAccessibility();

    this.hud = new GameHud(root, {
      reset: () => this.renderer.resetCamera(),
      startGame: (config) => this.startGame(config),
      undo: () => this.renderer.undo(),
      redo: () => this.renderer.redo(),
      openMenu: () => this.renderer.openMenu(),
      closeMenu: () => this.renderer.closeMenu(),
      language: (value) => this.renderer.setLanguage(value),
      brightness: (value) => this.renderer.setBrightness(value),
      fog: (enabled) => this.renderer.setFog(enabled),
      toggleCoordinates: (visible) =>
        root.classList.toggle("coordinates-hidden", !visible),
      previous: () =>
        this.renderer.setActiveLevel(
          Math.max(0, this.presentation.activeLevel - 1),
        ),
      next: () =>
        this.renderer.setActiveLevel(
          Math.min(7, this.presentation.activeLevel + 1),
        ),
      all: () => this.renderer.showAllLevels(),
      isolate: () => this.renderer.isolateActiveLevel(),
      level: (index) => this.renderer.setActiveLevel(index),
      fit: () => this.renderer.cubeView(),
      active: () => this.renderer.activeLayerView(),
      saveGame: () => this.saveGame(),
      listSaves: () => this.saveRepository.list(),
      loadSave: (id) => this.loadSave(id),
      deleteSave: (id) => this.deleteSave(id),
      renameSave: (id, name) => this.saveRepository.rename(id, name),
      exportSave: (id) => this.exportSave(id),
      importSave: (file) => this.importSave(file),
    });
    this.renderer = new ChessRenderer(
      this.stage,
      this.presentation,
      (state) => this.handleStateChange(state),
    );
    this.attractMode = new AttractModeController(
      this.presentation,
      this.renderer,
    );
    this.renderer.setFog(localStorage.getItem("cubeChessFog") === "1");
    this.attractMode.start();
  }

  applyStoredAccessibility() {
    document.documentElement.classList.toggle(
      "reduce-motion",
      localStorage.getItem("cubeChessReducedMotion") === "1",
    );
    document.documentElement.classList.toggle(
      "high-contrast",
      localStorage.getItem("cubeChessHighContrast") === "1",
    );
    document.documentElement.classList.toggle(
      "large-text",
      localStorage.getItem("cubeChessLargeText") === "1",
    );
  }

  clearAiWatchdog() {
    window.clearTimeout(this.aiWatchdogTimer);
    this.aiWatchdogTimer = null;
  }

  startGame(config) {
    this.attractMode.stop();
    this.clearAiWatchdog();
    this.ai.cancel();
    this.aiRequestPending = false;
    this.renderer.startGame(config);
  }

  handleStateChange(state) {
    this.hud.update(state);
    if (
      state.appState === "playing" &&
      state.lastMove?.sequence &&
      state.lastMove.sequence !== this.lastAutosavedMove
    ) {
      this.scheduleAutosave(state.lastMove.sequence);
    }
    if (
      state.appState === "playing" &&
      !state.menuOpen &&
      !state.busy &&
      state.status.kind === "active" &&
      state.gameConfig.aiSide === state.sideToMove
    ) {
      this.requestAiMove();
    }
  }

  scheduleAutosave(sequence) {
    window.clearTimeout(this.autosaveTimer);
    this.autosaveTimer = window.setTimeout(async () => {
      await this.saveRepository.put(this.presentation.serialize(), {
        id: `autosave-${this.presentation.gameId}`,
        name: `Autosave · ${this.presentation.gameConfig.whiteName} vs ${this.presentation.gameConfig.blackName}`,
      });
      this.lastAutosavedMove = sequence;
    }, 350);
  }

  legalAiFallback() {
    return this.presentation.getLegalMovesForSide()[0] ?? null;
  }

  async requestAiMove() {
    if (this.aiRequestPending) return;
    this.aiRequestPending = true;
    this.presentation.setBusy(true);
    this.presentation.message = "aiThinking";
    this.renderer.refresh();
    const requestedGameId = this.presentation.gameId;
    const requestedSide = this.presentation.sideToMove;
    let move = null;
    let timedOut = false;

    try {
      move = await Promise.race([
        this.ai.chooseMove(this.presentation.snapshot()),
        new Promise((resolve) => {
          this.aiWatchdogTimer = window.setTimeout(() => {
            timedOut = true;
            resolve(null);
          }, AI_WATCHDOG_MS);
        }),
      ]);
    } catch (error) {
      console.error("AI worker failed; using the first legal fallback move", error);
    } finally {
      this.clearAiWatchdog();
      this.aiRequestPending = false;
    }

    if (
      this.presentation.gameId !== requestedGameId ||
      this.presentation.sideToMove !== requestedSide ||
      this.presentation.appState !== "playing"
    ) {
      return;
    }

    if (timedOut || !move) {
      this.ai.cancel();
      move = this.legalAiFallback();
    }

    this.presentation.setBusy(false);
    let executed = move ? this.renderer.executeAutomatedMove(move) : false;
    if (!executed) {
      const fallback = this.legalAiFallback();
      if (fallback && fallback !== move) {
        executed = this.renderer.executeAutomatedMove(fallback);
      }
    }

    if (!executed) {
      this.presentation.message = null;
      this.renderer.refresh();
    }
  }

  async saveGame() {
    const record = await this.saveRepository.put(this.presentation.serialize());
    this.presentation.message = "saved";
    this.renderer.refresh();
    return record;
  }

  async loadSave(id) {
    const record = await this.saveRepository.get(id);
    if (!record) return false;
    this.attractMode.stop();
    this.clearAiWatchdog();
    this.ai.cancel();
    this.aiRequestPending = false;
    this.renderer.loadGame(record.payload);
    this.presentation.message = "saveLoaded";
    this.renderer.refresh();
    return true;
  }

  async deleteSave(id) {
    const deleted = await this.saveRepository.delete(id);
    if (deleted) {
      this.presentation.message = "saveDeleted";
      this.renderer.refresh();
    }
    return deleted;
  }

  async exportSave(id) {
    const record = id ? await this.saveRepository.get(id) : null;
    const payload = record?.payload ?? this.presentation.serialize();
    downloadJson(`cube-chess-512-${payload.id}.json`, payload);
  }

  async importSave(file) {
    try {
      const serialized = JSON.parse(await file.text());
      const temporary = new GamePresentation();
      temporary.load(serialized);
      await this.saveRepository.put(serialized, {
        name: `${serialized.gameConfig?.whiteName ?? "White"} vs ${serialized.gameConfig?.blackName ?? "Black"}`,
      });
      await this.loadSave(serialized.id);
      return true;
    } catch (error) {
      console.error("Invalid Cube Chess save", error);
      this.presentation.message = "saveError";
      this.renderer.refresh();
      return false;
    }
  }

  dispose() {
    window.clearTimeout(this.autosaveTimer);
    this.clearAiWatchdog();
    this.attractMode.dispose();
    this.ai.dispose();
    this.renderer.dispose();
    this.hud.dispose();
    this.stage.remove();
  }
}
