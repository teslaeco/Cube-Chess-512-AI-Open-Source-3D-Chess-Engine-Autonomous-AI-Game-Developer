function number(value, fallback = 0) {
  const resolved = Number(value);
  return Number.isFinite(resolved) ? resolved : fallback;
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

export function queenArmyImbalanceRate(entry) {
  return number(entry?.queenArmyImbalanceSelections) /
    Math.max(1, number(entry?.quietMoves));
}

export function validateUniversalRolloutEntry(
  entry,
  { expectedGames = null, minimumPlies = null } = {},
) {
  requireCondition(entry && typeof entry === "object", "Missing rollout metrics");
  requireCondition(Boolean(entry.id), "Rollout metrics do not identify a policy");

  if (expectedGames !== null) {
    requireCondition(
      number(entry.games, -1) === expectedGames,
      `${entry.id} completed ${number(entry.games)}/${expectedGames} games`,
    );
  }
  if (minimumPlies !== null) {
    requireCondition(
      number(entry.completedPlies) >= minimumPlies,
      `${entry.id} produced only ${number(entry.completedPlies)} real plies`,
    );
  }

  requireCondition(
    number(entry.materialSafetyViolations) === 0,
    `${entry.id} made unsafe material decisions`,
  );
  requireCondition(
    number(entry.criticalQueenTradeViolations) === 0,
    `${entry.id} traded a queen for a lower-value piece`,
  );
  requireCondition(
    number(entry.forcedUnsafeFallbacks) === 0,
    `${entry.id} used an unsafe forced fallback`,
  );

  return entry;
}

export function validateShardReport(report) {
  requireCondition(
    report?.mode === "real-legal-8x8x8-whole-army-rollout-shard",
    "The shard is not a real legal 8x8x8 whole-army rollout",
  );
  requireCondition(report.syntheticCurriculum === false, "Shard is synthetic");
  requireCondition(report.fullAlphaBetaGames === false, "Shard mislabels bounded rollouts as full Alpha-Beta games");
  requireCondition(report.partial === true, "Shard must be marked as partial");
  requireCondition(
    Array.isArray(report.ranking) && report.ranking.length === 1,
    "A shard must contain exactly one policy result",
  );

  const entry = report.ranking[0];
  requireCondition(
    entry.id === report.requestedPolicy,
    `Shard requested ${report.requestedPolicy} but reported ${entry.id}`,
  );
  validateUniversalRolloutEntry(entry, {
    expectedGames: number(report.gamesInShard),
    minimumPlies: number(report.gamesInShard) * 4,
  });
  return entry;
}

export function validateProductionStrategy(production, baseline) {
  requireCondition(production, "Missing production policy metrics");
  requireCondition(baseline, "Missing balanced-v6 baseline metrics");

  const productionImbalanceRate = queenArmyImbalanceRate(production);
  const baselineImbalanceRate = queenArmyImbalanceRate(baseline);

  requireCondition(
    productionImbalanceRate <= 0.09,
    `Production queen-army imbalance rate is ${productionImbalanceRate}`,
  );
  requireCondition(
    productionImbalanceRate < baselineImbalanceRate,
    `Production queen-army imbalance rate ${productionImbalanceRate} did not beat baseline ${baselineImbalanceRate}`,
  );
  requireCondition(
    number(production.samePieceRunViolationRate) <= 0.01,
    `Production same-piece run rate is ${number(production.samePieceRunViolationRate)}`,
  );
  requireCondition(
    number(production.quietQueenMoveRate) <= 0.3,
    `Production quiet queen move rate is ${number(production.quietQueenMoveRate)}`,
  );
  requireCondition(
    number(production.averageDistinctPieces) >= 4.5,
    `Production average distinct pieces is ${number(production.averageDistinctPieces)}`,
  );
  requireCondition(
    number(production.averageRoleCoverage) >= number(baseline.averageRoleCoverage),
    `Production role coverage ${number(production.averageRoleCoverage)} did not match baseline ${number(baseline.averageRoleCoverage)}`,
  );
  requireCondition(
    number(production.teamMoveRate) > number(baseline.teamMoveRate),
    `Production team move rate ${number(production.teamMoveRate)} did not beat baseline ${number(baseline.teamMoveRate)}`,
  );
  requireCondition(
    number(production.armyBroadeningRate) > number(baseline.armyBroadeningRate),
    `Production army broadening rate ${number(production.armyBroadeningRate)} did not beat baseline ${number(baseline.armyBroadeningRate)}`,
  );
  requireCondition(
    number(production.queenMoveRate) < number(baseline.queenMoveRate),
    `Production queen move rate ${number(production.queenMoveRate)} did not beat baseline ${number(baseline.queenMoveRate)}`,
  );

  return {
    productionImbalanceRate,
    baselineImbalanceRate,
  };
}

export function validateAggregateReport(report) {
  requireCondition(
    report?.mode === "150-shard-real-legal-8x8x8-whole-army-rollout",
    "The aggregate is not the expected 150-shard real-board rollout",
  );
  requireCondition(report.syntheticCurriculum === false, "Aggregate is synthetic");
  requireCondition(report.fullAlphaBetaGames === false, "Aggregate mislabels bounded rollouts as full games");
  requireCondition(Array.isArray(report.ranking), "Aggregate ranking is missing");
  requireCondition(report.ranking.length >= 2, "Aggregate needs production and baseline policies");

  const expectedGames = number(report.gamesPerPolicy);
  for (const entry of report.ranking) {
    validateUniversalRolloutEntry(entry, {
      expectedGames,
      minimumPlies: expectedGames * 12,
    });
  }

  requireCondition(
    report.selectedPolicy === report.productionPolicy,
    `Rollouts selected ${report.selectedPolicy}, but production uses ${report.productionPolicy}`,
  );

  const production = report.ranking.find(
    (entry) => entry.id === report.productionPolicy,
  );
  const baseline = report.ranking.find((entry) => entry.id === "balanced-v6");
  const strategy = validateProductionStrategy(production, baseline);
  return { production, baseline, ...strategy };
}
