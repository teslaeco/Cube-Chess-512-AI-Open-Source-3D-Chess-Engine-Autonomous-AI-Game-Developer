import { AiController } from "../ai/AiController.js";
import { getAiRuntimePlan } from "../ai/difficultyProfiles.js";
import { executeAiRuntimePlan } from "../ai/runtimeExecution.js";
import { AttractModeController } from "../demo/AttractModeController.js";
import { ChessRenderer } from "../renderer/ChessRenderer.js";
import { SaveRepository } from "../storage/SaveRepository.js";
import { GameHud } from "../ui/GameExperienceHud.js";
import { GamePresentation } from "./GamePresentation.js";
import { returnToMenu } from "./returnToMenu.js";
import { confirmLeavingActiveMatch } from "./leaveGuard.js";
import {
  normalizeLabLedColorSettings,
  storeLabLedColorSettings,
} from "../state/labLedColorSettings.js";

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
    this.sessionRevision = 0;
    this.aiRequestPending = false;
    this.lastAutosavedMove = 0;
    this.autosaveTimer = null;
    this.aiWatchdogTimer = null;
    this.applyStoredAccessibility();

    this.hud = new GameHud(root, {
      reset: () => this.renderer.resetCamera(),
      startGame: (config) => this.startGame(config),
      returnToMenu: () => returnToMenu(this),
      previewPieceSet: (preset, settings) => this.previewPieceSet(preset, settings),
      undo: () => this.renderer.undo(),
      redo: () => this.renderer.redo(),
      openMenu: () => this.renderer.openMenu(),
      closeMenu: () => this.renderer.closeMenu(),
      language: (value) => this.renderer.setLanguage(value),
      brightness: (value) => this.renderer.setBrightness(value),
      fog: (enabled) => this.renderer.setFog(enabled),
      toggleCoordinates: (visible) => root.classList.toggle("coordinates-hidden", !visible),
      previous: () => this.renderer.setActiveLevel(Math.max(0, this.presentation.activeLevel - 1)),
      next: () => this.renderer.setActiveLevel(Math.min(7, this.presentation.activeLevel + 1)),
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
    // Preserve the selected collection instead of rebuilding the first 32 pieces twice.
    this.presentation.gameConfig.pieceSet = this.hud.selectedPieceSet;
    this.presentation.gameConfig.labLedColorSettings = this.hud.labLedColorSettings;
    this.renderer = new ChessRenderer(this.stage, this.presentation, (state) => this.handleStateChange(state));
    this.attractMode = new AttractModeController(this.presentation, this.renderer);
    this.renderer.setFog(localStorage.getItem("cubeChessFog") === "1");
    this.previewPieceSet(this.hud.selectedPieceSet, this.hud.labLedColorSettings);
    this.attractMode.start();
    // Register only after the demo has started, so initial page loading never
    // produces a misleading unsaved-match warning.
    this.handleBeforeUnload = (event) => confirmLeavingActiveMatch(event, this.presentation);
    window.addEventListener("beforeunload", this.handleBeforeUnload);
  }

  applyStoredAccessibility() {
    document.documentElement.classList.toggle("reduce-motion", localStorage.getItem("cubeChessReducedMotion") === "1");
    document.documentElement.classList.toggle("high-contrast", localStorage.getItem("cubeChessHighContrast") === "1");
    document.documentElement.classList.toggle("large-text", localStorage.getItem("cubeChessLargeText") === "1");
  }

  clearAiWatchdog() {
    window.clearTimeout(this.aiWatchdogTimer);
    this.aiWatchdogTimer = null;
  }

  cancelSessionWork() {
    this.sessionRevision += 1;
    window.clearTimeout(this.autosaveTimer);
    this.autosaveTimer = null;
    this.clearAiWatchdog();
    this.ai.cancel();
    this.aiRequestPending = false;
    this.lastAutosavedMove = 0;
  }

  startGame(config) {
    this.attractMode.stop();
    this.cancelSessionWork();
    this.renderer.startGame(config);
    this.root.dataset.pieceSet = this.presentation.gameConfig.pieceSet;
    this.root.dataset.visualTheme = this.renderer.boardRenderer.group.userData.visualTheme;
  }

  previewPieceSet(preset, labLedColorSettings = this.hud.labLedColorSettings) {
    const normalizedSettings = normalizeLabLedColorSettings(labLedColorSettings);
    const changed = this.renderer.setPieceVisualPreset(preset, { labLedColorSettings: normalizedSettings });
    this.presentation.gameConfig.pieceSet = this.renderer.pieceRenderer.factory.__forgeVisualMode;
    this.presentation.gameConfig.labLedColorSettings = normalizedSettings;
    this.root.dataset.pieceSet = this.renderer.pieceRenderer.factory.__forgeVisualMode;
    this.root.dataset.visualTheme = this.renderer.boardRenderer.group.userData.visualTheme;
    globalThis.__forgeMcpPublishVisualDiagnostics?.();
    return changed;
  }

  handleStateChange(state) {
    this.hud.update(state);
    if (state.appState === "playing" && state.lastMove?.sequence && state.lastMove.sequence !== this.lastAutosavedMove) {
      this.scheduleAutosave(state.lastMove.sequence);
    }
    if (state.appState === "playing" && !state.menuOpen && !state.busy && state.status.kind === "active" && state.gameConfig.aiSide === state.sideToMove) {
      this.requestAiMove();
    }
  }

  scheduleAutosave(sequence) {
    window.clearTimeout(this.autosaveTimer);
    const revision = this.sessionRevision;
    const gameId = this.presentation.gameId;
    this.autosaveTimer = window.setTimeout(async () => {
      if (revision !== this.sessionRevision || gameId !== this.presentation.gameId || this.presentation.appState !== "playing") return;
      // Capture the actual match before awaiting storage; never save a later demo/new game.
      const payload = this.presentation.serialize();
      await this.saveRepository.put(payload, {
        id: `autosave-${gameId}`,
        name: `Autosave · ${payload.gameConfig.whiteName} vs ${payload.gameConfig.blackName}`,
      });
      if (revision === this.sessionRevision) this.lastAutosavedMove = sequence;
    }, 350);
  }

  legalAiFallback() { return this.presentation.getLegalMovesForSide()[0] ?? null; }

  async requestAiAttempt(snapshot, difficulty, profile, revision = this.sessionRevision) {
    if (revision !== this.sessionRevision) return { move: null, timedOut: false, error: null };
    let timedOut = false;
    let watchdog = null;
    try {
      const move = await Promise.race([
        this.ai.chooseMove(snapshot, { difficulty, searchMilliseconds: profile.searchMilliseconds }),
        new Promise((resolve) => {
          watchdog = window.setTimeout(() => { timedOut = true; resolve(null); }, profile.watchdogMilliseconds);
          this.aiWatchdogTimer = watchdog;
        }),
      ]);
      return { move, timedOut, error: null };
    } catch (error) {
      return { move: null, timedOut: false, error };
    } finally {
      window.clearTimeout(watchdog);
      if (this.aiWatchdogTimer === watchdog) this.aiWatchdogTimer = null;
    }
  }

  async requestAiMove() {
    if (this.aiRequestPending) return;
    const revision = this.sessionRevision;
    this.aiRequestPending = true;
    this.presentation.setBusy(true);
    this.presentation.message = "aiThinking";
    this.renderer.refresh();
    const requestedGameId = this.presentation.gameId;
    const requestedSide = this.presentation.sideToMove;
    const snapshot = this.presentation.snapshot();
    const runtimePlan = getAiRuntimePlan(snapshot.gameConfig.difficulty);
    let move = null;
    try {
      const execution = await executeAiRuntimePlan({
        snapshot,
        runtimePlan,
        runAttempt: (state, difficulty, profile) => this.requestAiAttempt(state, difficulty, profile, revision),
        restartWorker: (options) => { if (revision === this.sessionRevision) this.ai.restartWorker(options); },
      });
      move = execution.move;
      for (const attempt of execution.attempts) {
        if (attempt.error) console.error(`${attempt.difficulty} AI worker attempt failed`, attempt.error);
      }
    } finally {
      // A cancelled match cannot clear the new match's watchdog or busy/request state.
      if (revision === this.sessionRevision) {
        this.clearAiWatchdog();
        this.aiRequestPending = false;
      }
    }
    if (revision !== this.sessionRevision || this.presentation.gameId !== requestedGameId || this.presentation.sideToMove !== requestedSide || this.presentation.appState !== "playing") return;

    // Preserve the reviewed two-worker-failure fallback policy.
    if (!move) move = this.legalAiFallback();
    this.presentation.setBusy(false);
    let executed = move ? this.renderer.executeAutomatedMove(move) : false;
    if (!executed) {
      const fallback = this.legalAiFallback();
      if (fallback && fallback !== move) executed = this.renderer.executeAutomatedMove(fallback);
    }
    if (!executed) { this.presentation.message = null; this.renderer.refresh(); }
  }

  async saveGame() {
    const revision = this.sessionRevision;
    const record = await this.saveRepository.put(this.presentation.serialize());
    if (revision === this.sessionRevision) {
      this.presentation.message = "saved";
      this.renderer.refresh();
    }
    return record;
  }

  async loadSave(id) {
    const revision = this.sessionRevision;
    const record = await this.saveRepository.get(id);
    if (!record || revision !== this.sessionRevision) return false;
    this.attractMode.stop();
    this.cancelSessionWork();
    this.renderer.loadGame(record.payload);
    this.hud.selectedPieceSet = this.presentation.gameConfig.pieceSet;
    this.hud.labLedColorSettings = storeLabLedColorSettings(this.presentation.gameConfig.labLedColorSettings);
    localStorage.setItem("cubeChessPieceSet", this.hud.selectedPieceSet);
    this.root.dataset.pieceSet = this.presentation.gameConfig.pieceSet;
    this.root.dataset.visualTheme = this.renderer.boardRenderer.group.userData.visualTheme;
    this.presentation.message = "saveLoaded";
    this.renderer.refresh();
    return true;
  }

  async deleteSave(id) {
    const deleted = await this.saveRepository.delete(id);
    if (deleted) { this.presentation.message = "saveDeleted"; this.renderer.refresh(); }
    return deleted;
  }

  async exportSave(id) {
    const record = id ? await this.saveRepository.get(id) : null;
    const payload = record?.payload ?? this.presentation.serialize();
    downloadJson(`cube-chess-512-${payload.id}.json`, payload);
  }

  async importSave(file) {
    const revision = this.sessionRevision;
    try {
      const serialized = JSON.parse(await file.text());
      if (revision !== this.sessionRevision) return false;
      const temporary = new GamePresentation();
      temporary.load(serialized);
      await this.saveRepository.put(serialized, { name: `${serialized.gameConfig?.whiteName ?? "White"} vs ${serialized.gameConfig?.blackName ?? "Black"}` });
      if (revision !== this.sessionRevision) return false;
      await this.loadSave(serialized.id);
      return true;
    } catch (error) {
      console.error("Invalid Cube Chess save", error);
      if (revision === this.sessionRevision) { this.presentation.message = "saveError"; this.renderer.refresh(); }
      return false;
    }
  }

  dispose() {
    if (this.handleBeforeUnload) window.removeEventListener("beforeunload", this.handleBeforeUnload);
    this.cancelSessionWork();
    this.attractMode.dispose();
    this.ai.dispose();
    this.renderer.dispose();
    this.hud.dispose();
    this.stage.remove();
  }
}
