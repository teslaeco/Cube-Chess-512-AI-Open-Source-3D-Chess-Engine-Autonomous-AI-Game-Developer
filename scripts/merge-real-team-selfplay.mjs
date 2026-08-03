import {
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import {
  TEAM_PLAY_TRAINING_CANDIDATES,
  TEAM_PLAY_WEIGHTS,
} from "../web/ai/teamPlayWeights.js";

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const entry = process.argv.find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : fallback;
}

const inputDirectory = resolve(
  argument("input", "artifacts/real-teamplay-shards"),
);
const reportPath = resolve(
  argument("report", "artifacts/real-team-selfplay-3000-report.json"),
);

const files = readdirSync(inputDirectory)
  .filter((name) => name.endsWith(".json"))
  .sort();
if (!files.length) {
  throw new Error(`No real self-play shard reports in ${inputDirectory}`);
}

const shardReports = files.map((name) => ({
  name,
  report: JSON.parse(readFileSync(resolve(inputDirectory, name), "utf8")),
}));
const expectedIds = TEAM_PLAY_TRAINING_CANDIDATES.map((candidate) => candidate.id);
const totalGamesPerPolicy = shardReports[0].report.totalGamesPerPolicy;
const gamesInShard = shardReports[0].report.gamesInShard;
const trainingPlies = shardReports[0].report.trainingPlies;
const expectedShardsPerPolicy = totalGamesPerPolicy / gamesInShard;

if (!Number.isInteger(expectedShardsPerPolicy)) {
  throw new Error("Shard size does not divide total games per policy");
}

const numericFields = [
  "games",
  "completedPlies",
  "distinctPieceTotal",
  "queenMoves",
  "quietQueenMoves",
  "teamMoves",
  "freshPieceMoves",
  "samePieceRunViolations",
  "quietMoves",
  "materialSafetyViolations",
  "criticalQueenTradeViolations",
  "forcedUnsafeFallbacks",
  "checkmates",
  "draws",
];

function emptyMetrics(id) {
  return {
    id,
    games: 0,
    completedPlies: 0,
    movesBySide: { white: 0, black: 0 },
    distinctPieceTotal: 0,
    queenMoves: 0,
    quietQueenMoves: 0,
    teamMoves: 0,
    freshPieceMoves: 0,
    samePieceRunViolations: 0,
    quietMoves: 0,
    materialSafetyViolations: 0,
    criticalQueenTradeViolations: 0,
    forcedUnsafeFallbacks: 0,
    checkmates: 0,
    draws: 0,
  };
}

const aggregateById = new Map(
  expectedIds.map((id) => [id, emptyMetrics(id)]),
);
const offsetsById = new Map(expectedIds.map((id) => [id, new Set()]));

for (const { report, name } of shardReports) {
  if (
    report.syntheticCurriculum !== false ||
    report.fullAlphaBetaGames !== false ||
    report.partial !== true ||
    report.mode !== "real-legal-8x8x8-team-policy-rollout-shard"
  ) {
    throw new Error(`${name} is not a valid real-board policy rollout shard`);
  }
  if (
    report.totalGamesPerPolicy !== totalGamesPerPolicy ||
    report.gamesInShard !== gamesInShard ||
    report.trainingPlies !== trainingPlies
  ) {
    throw new Error(`${name} used different training settings`);
  }
  if (!Number.isInteger(report.seedOffset) || report.seedOffset < 0) {
    throw new Error(`${name} has an invalid seed offset`);
  }
  if (!Array.isArray(report.ranking) || report.ranking.length !== 1) {
    throw new Error(`${name} must contain exactly one policy result`);
  }

  const entry = report.ranking[0];
  const aggregate = aggregateById.get(entry.id);
  const offsets = offsetsById.get(entry.id);
  if (!aggregate || !offsets) {
    throw new Error(`${name} contains unknown policy ${entry.id}`);
  }
  if (offsets.has(report.seedOffset)) {
    throw new Error(`Duplicate ${entry.id} shard at seed ${report.seedOffset}`);
  }
  offsets.add(report.seedOffset);

  for (const field of numericFields) {
    aggregate[field] += Number(entry[field] ?? 0);
  }
  aggregate.movesBySide.white += Number(entry.movesBySide?.white ?? 0);
  aggregate.movesBySide.black += Number(entry.movesBySide?.black ?? 0);
}

for (const id of expectedIds) {
  const offsets = offsetsById.get(id);
  if (offsets.size !== expectedShardsPerPolicy) {
    throw new Error(
      `${id} has ${offsets.size}/${expectedShardsPerPolicy} shard reports`,
    );
  }
  for (let offset = 0; offset < totalGamesPerPolicy; offset += gamesInShard) {
    if (!offsets.has(offset)) {
      throw new Error(`${id} is missing seed range starting at ${offset}`);
    }
  }
}

function qualityScore(entry) {
  const moves = Math.max(1, entry.completedPlies);
  const quietMoves = Math.max(1, entry.quietMoves);
  const games = Math.max(1, entry.games);
  const averageDistinctPieces = entry.distinctPieceTotal / (games * 2);
  const teamMoveRate = entry.teamMoves / moves;
  const freshPieceRate = entry.freshPieceMoves / moves;
  const queenMoveRate = entry.queenMoves / moves;
  const quietQueenMoveRate = entry.quietQueenMoves / quietMoves;
  const samePieceRunViolationRate = entry.samePieceRunViolations / quietMoves;

  return Math.round(
    averageDistinctPieces * 18_000 +
      teamMoveRate * 120_000 +
      freshPieceRate * 90_000 -
      queenMoveRate * 45_000 -
      quietQueenMoveRate * 80_000 -
      samePieceRunViolationRate * 500_000 -
      entry.materialSafetyViolations * 5_000_000 -
      entry.criticalQueenTradeViolations * 20_000_000 -
      entry.forcedUnsafeFallbacks * 2_000_000,
  );
}

function completeMetrics(entry) {
  const moves = Math.max(1, entry.completedPlies);
  const quietMoves = Math.max(1, entry.quietMoves);
  const games = Math.max(1, entry.games);
  return {
    ...entry,
    score: qualityScore(entry),
    averageDistinctPieces: entry.distinctPieceTotal / (games * 2),
    queenMoveRate: entry.queenMoves / moves,
    quietQueenMoveRate: entry.quietQueenMoves / quietMoves,
    teamMoveRate: entry.teamMoves / moves,
    freshPieceRate: entry.freshPieceMoves / moves,
    samePieceRunViolationRate: entry.samePieceRunViolations / quietMoves,
  };
}

const ranking = [...aggregateById.values()]
  .map(completeMetrics)
  .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
const selected = ranking[0];
const production = ranking.find((entry) => entry.id === TEAM_PLAY_WEIGHTS.id);
const baseline = ranking.find((entry) => entry.id === "balanced-v6");
if (!production || !baseline) {
  throw new Error("Missing production or legacy baseline policy");
}

const report = {
  schema: 6,
  mode: "150-shard-real-legal-8x8x8-team-policy-rollout",
  syntheticCurriculum: false,
  fullAlphaBetaGames: false,
  shardReports: shardReports.length,
  shardsPerPolicy: expectedShardsPerPolicy,
  gamesInShard,
  gamesPerPolicy: totalGamesPerPolicy,
  policies: expectedIds.length,
  totalRealGames: totalGamesPerPolicy * expectedIds.length,
  trainingPlies,
  totalPlies: ranking.reduce((sum, entry) => sum + entry.completedPlies, 0),
  selectedPolicy: selected.id,
  productionPolicy: TEAM_PLAY_WEIGHTS.id,
  ranking,
  sourceReports: files,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

for (const entry of ranking) {
  if (entry.games !== totalGamesPerPolicy) {
    throw new Error(
      `${entry.id} completed ${entry.games}/${totalGamesPerPolicy} games`,
    );
  }
  if (entry.completedPlies < totalGamesPerPolicy * 12) {
    throw new Error(`${entry.id} produced only ${entry.completedPlies} plies`);
  }
  if (entry.materialSafetyViolations !== 0) {
    throw new Error(`${entry.id} made unsafe material decisions`);
  }
  if (entry.criticalQueenTradeViolations !== 0) {
    throw new Error(`${entry.id} traded a queen for a lower-value piece`);
  }
  if (entry.forcedUnsafeFallbacks !== 0) {
    throw new Error(`${entry.id} used a forced unsafe fallback`);
  }
}

if (selected.id !== TEAM_PLAY_WEIGHTS.id) {
  throw new Error(
    `Real-board rollouts selected ${selected.id}, but production uses ${TEAM_PLAY_WEIGHTS.id}`,
  );
}
if (production.samePieceRunViolationRate > 0.01) {
  throw new Error(
    `Production same-piece run rate is ${production.samePieceRunViolationRate}`,
  );
}
if (production.quietQueenMoveRate > 0.3) {
  throw new Error(
    `Production quiet queen move rate is ${production.quietQueenMoveRate}`,
  );
}
if (production.averageDistinctPieces < 3.25) {
  throw new Error(
    `Production average distinct pieces is ${production.averageDistinctPieces}`,
  );
}
if (production.teamMoveRate <= baseline.teamMoveRate) {
  throw new Error(
    `Production team move rate ${production.teamMoveRate} did not beat baseline ${baseline.teamMoveRate}`,
  );
}
