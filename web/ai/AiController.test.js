import { describe, expect, it, vi } from "vitest";
import { AiController } from "./AiController.js";

function controllerHarness() {
  const controller = Object.create(AiController.prototype);
  controller.requestSequence = 4;
  controller.pending = new Map([
    [1, { resolve: vi.fn(), reject: vi.fn() }],
  ]);
  controller.recentAiPieceIds = ["black-queen", "black-knight"];
  controller.aiUsageCounts = { "black-queen": 5, "black-knight": 1 };
  controller.worker = {
    terminate: vi.fn(),
    postMessage: vi.fn(),
  };
  controller.createWorker = vi.fn(() => {
    controller.worker = {
      terminate: vi.fn(),
      postMessage: vi.fn(),
    };
  });
  return controller;
}

describe("AI controller army memory", () => {
  it("preserves the army ledger across an emergency worker restart", () => {
    const controller = controllerHarness();
    controller.restartWorker({ preserveHistory: true });

    expect(controller.recentAiPieceIds).toEqual([
      "black-queen",
      "black-knight",
    ]);
    expect(controller.aiUsageCounts).toEqual({
      "black-queen": 5,
      "black-knight": 1,
    });
    expect(controller.pending.size).toBe(0);
    expect(controller.createWorker).toHaveBeenCalledTimes(1);
  });

  it("clears the army ledger when the game is cancelled or restarted", () => {
    const controller = controllerHarness();
    controller.cancel();

    expect(controller.recentAiPieceIds).toEqual([]);
    expect(controller.aiUsageCounts).toEqual({});
    expect(controller.pending.size).toBe(0);
    expect(controller.worker.postMessage).toHaveBeenCalledWith({
      type: "cancel",
    });
  });
});
