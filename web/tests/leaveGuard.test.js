import { describe, expect, it, vi } from "vitest";
import { GamePresentation } from "../app/GamePresentation.js";
import { hasActiveChessMatch, confirmLeavingActiveMatch } from "../app/leaveGuard.js";
import { CubeChessApplication } from "../app/CubeChessApplication.js";

function leaveEvent() {
  return {
    defaultPrevented: false,
    returnValue: undefined,
    preventDefault: vi.fn(function () { this.defaultPrevented = true; }),
  };
}

describe("native browser unsaved match protection", () => {
  it("does not block demo, initial menu or absent game", () => {
    const game = new GamePresentation();
    game.startDemo();
    const event = leaveEvent();
    expect(hasActiveChessMatch(null)).toBe(false);
    expect(hasActiveChessMatch(game)).toBe(false);
    expect(confirmLeavingActiveMatch(event, game)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.returnValue).toBeUndefined();
  });

  it("requests the native prompt for active local, computer and online matches", () => {
    for (const mode of ["local", "computer", "online"]) {
      const game = new GamePresentation();
      game.startGame({ mode: mode === "online" ? "local" : mode });
      if (mode === "online") game.gameConfig.mode = "online";
      const event = leaveEvent();
      expect(confirmLeavingActiveMatch(event, game)).toBe(true);
      expect(event.defaultPrevented).toBe(true);
      expect(event.returnValue).toBe("");
    }
  });

  it("keeps the warning active even in a paused or finished match", () => {
    const game = new GamePresentation();
    game.startGame({ mode: "local" });
    game.openMenu();
    expect(hasActiveChessMatch(game)).toBe(true);
    game.appState = "gameOver";
    expect(hasActiveChessMatch(game)).toBe(true);
  });

  it("stops warning only after an explicit in-document exit to demo", () => {
    const game = new GamePresentation();
    game.startGame({ mode: "local" });
    expect(hasActiveChessMatch(game)).toBe(true);
    game.startDemo();
    const event = leaveEvent();
    expect(confirmLeavingActiveMatch(event, game)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("registers and removes exactly one beforeunload listener for an app lifecycle", () => {
    const add = vi.fn(), remove = vi.fn();
    vi.stubGlobal("window", { addEventListener: add, removeEventListener: remove });
    const app = Object.create(CubeChessApplication.prototype);
    app.presentation = new GamePresentation();
    app.presentation.startGame({ mode: "local" });
    // The constructor installs the same event adapter after starting demo;
    // exercise the installed handler without constructing a WebGL renderer.
    app.handleBeforeUnload = (event) => confirmLeavingActiveMatch(event, app.presentation);
    window.addEventListener("beforeunload", app.handleBeforeUnload);
    const event = leaveEvent();
    app.handleBeforeUnload(event);
    expect(event.defaultPrevented).toBe(true);
    window.removeEventListener("beforeunload", app.handleBeforeUnload);
    expect(add).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith("beforeunload", app.handleBeforeUnload);
    vi.unstubAllGlobals();
  });
});
