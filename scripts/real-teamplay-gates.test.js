import { describe, expect, it } from "vitest";
import {
  queenArmyImbalanceRate,
  validateAggregateReport,
  validateShardReport,
  validateUniversalRolloutEntry,
} from "./real-teamplay-gates.mjs";

function metrics(id, overrides = {}) {
  return {
    id,
    games: 1000,
    completedPlies: 18_000,
    quietMoves: 15_000,
    queenArmyImbalanceSelections: 900,
    materialSafetyViolations: 0,
    criticalQueenTradeViolations: 0,
    forcedUnsafeFallbacks: 0,
    samePieceRunViolationRate: 0,
    quietQueenMoveRate: 0.2,
    averageDistinctPieces: 5,
    averageRoleCoverage: 3.2,
    teamMoveRate: 0.24,
    armyBroadeningRate: 0.54,
    queenMoveRate: 0.28,
    ...overrides,
  };
}

function aggregate(overrides = {}) {
  const baseline = metrics("balanced-v6", {
    queenArmyImbalanceSelections: 1_650,
    averageRoleCoverage: 3.1,
    teamMoveRate: 0.22,
    armyBroadeningRate: 0.51,
    queenMoveRate: 0.31,
  });
  const production = metrics("queen-discipline-v7", {
    queenArmyImbalanceSelections: 900,
    averageRoleCoverage: 3.25,
    teamMoveRate: 0.27,
    armyBroadeningRate: 0.59,
    queenMoveRate: 0.25,
  });
  return {
    mode: "150-shard-real-legal-8x8x8-whole-army-rollout",
    syntheticCurriculum: false,
    fullAlphaBetaGames: false,
    gamesPerPolicy: 1000,
    selectedPolicy: "queen-discipline-v7",
    productionPolicy: "queen-discipline-v7",
    ranking: [production, baseline],
    ...overrides,
  };
}

describe("real team-play gates", () => {
  it("allows a deliberately weaker comparison policy to expose strategic defects", () => {
    const baseline = metrics("balanced-v6", {
      games: 20,
      completedPlies: 360,
      quietMoves: 300,
      queenArmyImbalanceSelections: 30,
    });
    expect(() =>
      validateUniversalRolloutEntry(baseline, {
        expectedGames: 20,
        minimumPlies: 80,
      }),
    ).not.toThrow();
    expect(queenArmyImbalanceRate(baseline)).toBe(0.1);
  });

  it("still rejects material or queen-trade safety failures for every policy", () => {
    expect(() =>
      validateUniversalRolloutEntry(
        metrics("balanced-v6", { materialSafetyViolations: 1 }),
      ),
    ).toThrow(/unsafe material/i);
    expect(() =>
      validateUniversalRolloutEntry(
        metrics("queen-discipline-v7", {
          criticalQueenTradeViolations: 1,
        }),
      ),
    ).toThrow(/queen/i);
  });

  it("accepts a complete safe shard even when the old policy moves its queen too often", () => {
    const report = {
      mode: "real-legal-8x8x8-whole-army-rollout-shard",
      syntheticCurriculum: false,
      fullAlphaBetaGames: false,
      partial: true,
      requestedPolicy: "balanced-v6",
      gamesInShard: 20,
      ranking: [
        metrics("balanced-v6", {
          games: 20,
          completedPlies: 360,
          quietMoves: 297,
          queenArmyImbalanceSelections: 30,
        }),
      ],
    };
    expect(validateShardReport(report).id).toBe("balanced-v6");
  });

  it("requires production to beat the legacy policy at whole-army play", () => {
    const result = validateAggregateReport(aggregate());
    expect(result.production.id).toBe("queen-discipline-v7");
    expect(result.productionImbalanceRate).toBeLessThan(
      result.baselineImbalanceRate,
    );
  });

  it("rejects production when quiet queen monopoly remains too frequent", () => {
    const report = aggregate();
    report.ranking[0].queenArmyImbalanceSelections = 1_500;
    expect(() => validateAggregateReport(report)).toThrow(
      /queen-army imbalance rate/i,
    );
  });

  it("rejects a production policy that wins by score but uses fewer roles", () => {
    const report = aggregate();
    report.ranking[0].averageRoleCoverage = 2.9;
    expect(() => validateAggregateReport(report)).toThrow(/role coverage/i);
  });
});
