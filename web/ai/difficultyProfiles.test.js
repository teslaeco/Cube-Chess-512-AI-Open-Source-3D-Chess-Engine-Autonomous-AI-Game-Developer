import { describe, expect, it } from "vitest";
import {
  AI_DIFFICULTY_PROFILES,
  emergencyDifficultyFor,
  getAiRuntimePlan,
  normalizeDifficulty,
} from "./difficultyProfiles.js";

describe("AI difficulty routing", () => {
  it("keeps search and watchdog budgets monotonic", () => {
    const { easy, medium, hard } = AI_DIFFICULTY_PROFILES;
    expect(easy.maxDepth).toBeLessThan(medium.maxDepth);
    expect(medium.maxDepth).toBeLessThan(hard.maxDepth);
    expect(easy.searchMilliseconds).toBeLessThan(medium.searchMilliseconds);
    expect(medium.searchMilliseconds).toBeLessThan(hard.searchMilliseconds);
    expect(easy.watchdogMilliseconds).toBeLessThan(medium.watchdogMilliseconds);
    expect(medium.watchdogMilliseconds).toBeLessThan(hard.watchdogMilliseconds);
  });

  it("routes hard to the advanced engine and never aliases it to easy", () => {
    const plan = getAiRuntimePlan("hard");
    expect(plan.difficulty).toBe("hard");
    expect(plan.primary.engine).toBe("classical-3d-advanced");
    expect(plan.emergencyDifficulty).toBe("medium");
    expect(plan.emergency.engine).toBe("classical-basic");
  });

  it("normalizes invalid values safely without reversing valid labels", () => {
    expect(normalizeDifficulty("easy")).toBe("easy");
    expect(normalizeDifficulty("medium")).toBe("medium");
    expect(normalizeDifficulty("hard")).toBe("hard");
    expect(normalizeDifficulty("unknown")).toBe("easy");
    expect(emergencyDifficultyFor("medium")).toBe("easy");
  });
});
