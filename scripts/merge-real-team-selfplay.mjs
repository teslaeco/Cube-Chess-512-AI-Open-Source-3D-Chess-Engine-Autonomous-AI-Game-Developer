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

const shardReports = files.map((name) =>
  JSON.parse(readFileSync(resolve(inputDirectory, name), "utf8")),
);
const entries = shardReports.flatMap((report) => report.ranking ?? []);
const byId = new Map();
for (const entry of entries) {
  if (byId.has(entry.id)) {
    throw new Error(`Duplicate real self-play report for ${entry.id}`);
  }
  byId.set(entry.id, entry);
}

const expectedIds = TEAM_PLAY_TRAINING_CANDIDATES.map((candidate) => candidate.id);
for (const id of expectedIds) {
  if (!byId.has(id)) throw new Error(`Missing real self-play report for ${id}`);
}
if (byId.size !== expectedIds.length) {
  throw new Error(
    `Expected ${expectedIds.length} policies, received ${byId.size}`,
  );
}

const gamesPerPolicy = shardReports[0].gamesPerPolicy;
const trainingPlies = shardReports[0].trainingPlies;
for (const report of shardReports) {
  if (report.syntheticCurriculum !== false || report.partial !== true) {
    throw new Error("Aggregator received a non-real or non-sharded report");
  }
  if (
    report.gamesPerPolicy !== gamesPerPolicy ||
    report.trainingPlies !== trainingPlies
  ) {
    throw new Error("Real self-play shards used different game settings");
  }
}

const ranking = [...byId.values()].sort(
  (left, right) => right.score - left.score || left.id.localeCompare(right.id),
);
const selected = ranking[0];
const production = byId.get(TEAM_PLAY_WEIGHTS.id);
const baseline = byId.get("balanced-v6");
if (!production || !baseline) {
  throw new Error("Missing production or legacy baseline policy");
}

const report = {
  schema: 4,
  mode: "parallel-real-legal-8x8x8-hard-self-play",
  syntheticCurriculum: false,
  parallelPolicyJobs: expectedIds.length,
  gamesPerPolicy,
  policies: expectedIds.length,
  totalRealGames: gamesPerPolicy * expectedIds.length,
  trainingPlies,
  selectedPolicy: selected.id,
  productionPolicy: TEAM_PLAY_WEIGHTS.id,
  ranking,
  sourceReports: files,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

for (const entry of ranking) {
  if (entry.games !== gamesPerPolicy) {
    throw new Error(`${entry.id} completed ${entry.games}/${gamesPerPolicy} games`);
  }
  if (entry.completedPlies < gamesPerPolicy * 6) {
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
    `Real self-play selected ${selected.id}, but production uses ${TEAM_PLAY_WEIGHTS.id}`,
  );
}
if (production.samePieceRunViolationRate > 0.01) {
  throw new Error(
    `Production same-piece run rate is ${production.samePieceRunViolationRate}`,
  );
}
if (production.quietQueenMoveRate > 0.35) {
  throw new Error(
    `Production quiet queen move rate is ${production.quietQueenMoveRate}`,
  );
}
if (production.averageDistinctPieces < 2.75) {
  throw new Error(
    `Production average distinct pieces is ${production.averageDistinctPieces}`,
  );
}
if (production.teamMoveRate <= baseline.teamMoveRate) {
  throw new Error(
    `Production team move rate ${production.teamMoveRate} did not beat baseline ${baseline.teamMoveRate}`,
  );
}
