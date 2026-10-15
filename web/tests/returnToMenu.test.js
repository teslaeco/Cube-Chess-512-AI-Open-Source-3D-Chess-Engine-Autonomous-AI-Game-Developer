import { afterEach, describe, expect, it, vi } from "vitest";
import { GamePresentation } from "../app/GamePresentation.js";
import { CubeChessApplication } from "../app/CubeChessApplication.js";
import { returnToMenu } from "../app/returnToMenu.js";
import { gameExperienceText } from "../ui/gameExperienceCopy.js";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function fixture() {
  const presentation = new GamePresentation();
  presentation.startGame({ mode: "local" });
  const saved = new Map([["saved-match", { keep: true }]]);
  const socket = { removeEventListener: vi.fn(), close: vi.fn() };
  const app = {
    presentation, identity: { mode: "account", playerId: "keep-user" },
    root: { dataset: { gameMode: "online", onlineRole: "white", onlineRoom: "room" } },
    saveRepository: { saved },
    onlineGame: { socket }, onlineSocketHandler: () => {},
    cancelSessionWork: vi.fn(),
    renderer: { openMenu: vi.fn(() => presentation.openMenu()), selection: { clearPendingSelection: vi.fn() }, pieceRenderer: { animations: new Map() } },
    hud: { t: key => gameExperienceText("en", key), resetOpenPanels: vi.fn(), element: { querySelector: () => ({ focus: vi.fn() }) } },
    attractMode: { stop: vi.fn(), start: vi.fn(() => presentation.startDemo()) },
  };
  return { app, saved, socket };
}

describe("confirmed in-document return to menu", () => {
  it("cancel preserves the exact match, identity, connection and open panels", () => {
    const { app, socket } = fixture();
    const before = app.presentation.serialize();
    const identity = app.identity;
    const confirm = vi.fn(() => false);
    expect(returnToMenu(app, confirm)).toBe(false);
    expect(confirm.mock.calls[0][0]).toContain("Unsaved progress will be lost");
    expect(app.presentation.gameId).toBe(before.id);
    expect(app.presentation.pieces).toEqual(before.pieces);
    expect(app.identity).toBe(identity);
    expect(app.cancelSessionWork).not.toHaveBeenCalled();
    expect(app.hud.resetOpenPanels).not.toHaveBeenCalled();
    expect(socket.close).not.toHaveBeenCalled();
  });

  it("confirmation ends only the current match, clears queued input and keeps saved games", () => {
    const { app, saved, socket } = fixture();
    const id = app.presentation.gameId;
    const identity = app.identity;
    expect(returnToMenu(app, () => true)).toBe(true);
    expect(app.presentation.appState).toBe("demo");
    expect(app.presentation.menuOpen).toBe(true);
    expect(app.presentation.gameId).not.toBe(id);
    expect(app.presentation.pieces).toHaveLength(32);
    expect(app.presentation.squares).toHaveLength(512);
    expect(app.cancelSessionWork).toHaveBeenCalledOnce();
    expect(app.renderer.selection.clearPendingSelection).toHaveBeenCalledOnce();
    expect(socket.removeEventListener).toHaveBeenCalledOnce();
    expect(socket.close).toHaveBeenCalledWith(1000, "Return to main menu");
    expect(app.onlineGame).toBeNull();
    expect(app.root.dataset.onlineRoom).toBeUndefined();
    expect(app.identity).toBe(identity);
    expect(saved.get("saved-match")).toEqual({ keep: true });
  });

  it("an already open menu does not need destructive confirmation", () => {
    const { app } = fixture();
    app.presentation.startDemo(); app.onlineGame = null;
    const confirm = vi.fn();
    returnToMenu(app, confirm);
    expect(confirm).not.toHaveBeenCalled();
    expect(app.cancelSessionWork).not.toHaveBeenCalled();
  });
});

it("a late AI reply from an exited match cannot move in or clear the new match's request", async () => {
  vi.useFakeTimers(); vi.stubGlobal("window", globalThis);
  const app = Object.create(CubeChessApplication.prototype);
  app.sessionRevision = 0; app.aiRequestPending = false; app.aiWatchdogTimer = null;
  app.presentation = new GamePresentation();
  app.presentation.startGame({ mode: "computer", humanSide: "black", difficulty: "easy" });
  const move = app.presentation.getLegalMovesForSide()[0];
  let resolve;
  app.ai = { chooseMove: vi.fn(() => new Promise(done => { resolve = done; })), cancel: vi.fn(), restartWorker: vi.fn() };
  app.renderer = { refresh: vi.fn(), executeAutomatedMove: vi.fn() };
  const pending = app.requestAiMove();
  app.cancelSessionWork();
  app.presentation.startGame({ mode: "computer", humanSide: "black" });
  app.aiRequestPending = true;
  const newWatchdog = setTimeout(() => {}, 9000);
  app.aiWatchdogTimer = newWatchdog;
  resolve(move);
  await pending;
  expect(app.renderer.executeAutomatedMove).not.toHaveBeenCalled();
  expect(app.aiRequestPending).toBe(true);
  expect(app.aiWatchdogTimer).toBe(newWatchdog);
  expect(app.ai.restartWorker).not.toHaveBeenCalled();
});

it("exit cancels a pending autosave instead of saving the menu demo", async () => {
  vi.useFakeTimers(); vi.stubGlobal("window", globalThis);
  const app = Object.create(CubeChessApplication.prototype);
  app.sessionRevision = 0; app.ai = { cancel: vi.fn() };
  app.presentation = new GamePresentation(); app.presentation.startGame({ mode: "local" });
  app.saveRepository = { put: vi.fn() };
  app.scheduleAutosave(1);
  app.cancelSessionWork(); app.presentation.startDemo();
  await vi.advanceTimersByTimeAsync(1000);
  expect(app.saveRepository.put).not.toHaveBeenCalled();
});

it("the new About copy is chess-first, localized and makes no store-launch claim", () => {
  expect(gameExperienceText("en", "aboutP1")).toContain("512 squares");
  expect(gameExperienceText("pl-PL", "aboutP1")).toContain("512 polami");
  expect(gameExperienceText("en", "aboutP3")).toContain("updates are coming soon");
  expect(gameExperienceText("pl", "aboutP3")).toContain("aktualizacje będą dostępne wkrótce");
  expect(gameExperienceText("de", "aboutP1")).toBe(gameExperienceText("en", "aboutP1"));
  expect(gameExperienceText("en", "unrelated-key")).toBeUndefined();
});
