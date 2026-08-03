import { describe, expect, it, vi } from "vitest";
import { getAiRuntimePlan } from "./difficultyProfiles.js";
import { executeAiRuntimePlan } from "./runtimeExecution.js";

describe("AI runtime execution", () => {
  it("runs a searched medium attempt after a hard timeout", async () => {
    const snapshot = { gameConfig: { difficulty: "hard" } };
    const runAttempt = vi
      .fn()
      .mockResolvedValueOnce({ move: null, timedOut: true, error: null })
      .mockResolvedValueOnce({
        move: { pieceId: "black-knight", square3D: "C3A" },
        timedOut: false,
        error: null,
      });
    const restartWorker = vi.fn();

    const result = await executeAiRuntimePlan({
      snapshot,
      runtimePlan: getAiRuntimePlan("hard"),
      runAttempt,
      restartWorker,
    });

    expect(runAttempt).toHaveBeenNthCalledWith(
      1,
      snapshot,
      "hard",
      expect.objectContaining({ engine: "classical-3d-advanced" }),
    );
    expect(restartWorker).toHaveBeenCalledWith({ preserveHistory: true });
    expect(runAttempt).toHaveBeenNthCalledWith(
      2,
      snapshot,
      "medium",
      expect.objectContaining({ engine: "classical-basic" }),
    );
    expect(result).toMatchObject({
      usedEmergency: true,
      move: { pieceId: "black-knight" },
    });
  });

  it("does not restart the worker when hard returns a move", async () => {
    const runAttempt = vi.fn().mockResolvedValue({
      move: { pieceId: "black-bishop", square3D: "D4B" },
      timedOut: false,
      error: null,
    });
    const restartWorker = vi.fn();

    const result = await executeAiRuntimePlan({
      snapshot: {},
      runtimePlan: getAiRuntimePlan("hard"),
      runAttempt,
      restartWorker,
    });

    expect(runAttempt).toHaveBeenCalledTimes(1);
    expect(restartWorker).not.toHaveBeenCalled();
    expect(result.usedEmergency).toBe(false);
  });
});
