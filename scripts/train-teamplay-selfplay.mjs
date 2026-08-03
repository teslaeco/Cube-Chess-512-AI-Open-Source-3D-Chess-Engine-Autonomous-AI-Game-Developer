import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  chooseTeamAwareRootCandidate,
  scoreTeamPlayFeatures,
} from "../web/ai/teamPlayPolicy.js";
import {
  TEAM_PLAY_TRAINING_CANDIDATES,
  TEAM_PLAY_WEIGHTS,
} from "../web/ai/teamPlayWeights.js";

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const entry = process.argv.find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : fallback;
}

const gameCount = Number(argument("games", "100000"));
const reportPath = resolve(argument("report", "artifacts/teamplay-100k-report.json"));
if (!Number.isInteger(gameCount) || gameCount < 1) {
  throw new Error("--games must be a positive integer");
}

function rngFor(seed) {
  let state = (seed + 1) >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

const pieceCycle = ["rook", "bishop", "knight", "queen", "bishop", "knight"];

function repeatStreak(pieceId, recent) {
  let streak = 0;
  for (const id of recent) {
    if (id !== pieceId) break;
    streak += 1;
  }
  return streak;
}

function featureSet(overrides = {}) {
  return {
    forcing: false,
    repeatStreak: 0,
    switchedPiece: false,
    newlyDefendedPartners: 0,
    movedPieceDefended: false,
    mutualPair: false,
    supportsRecentPiece: false,
    undevelopedMinor: false,
    earlyMajorRepeat: false,
    isolated: false,
    ...overrides,
  };
}

function curriculumMoves(random, recent, ply) {
  const last = recent[0] ?? "rook";
  const different = pieceCycle[(ply + Math.floor(random() * pieceCycle.length)) % pieceCycle.length];
  const partner = different === last ? (last === "bishop" ? "knight" : "bishop") : different;
  const tacticalTurn = ply % 7 === 5;
  const base = Math.round(random() * 50);

  const repeated = {
    move: { pieceId: last, label: "repeat" },
    searchScore: base + 52,
    features: featureSet({
      repeatStreak: repeatStreak(last, recent),
      earlyMajorRepeat: last === "rook" || last === "queen",
      isolated: true,
    }),
  };
  const paired = {
    move: { pieceId: partner, label: "pair" },
    searchScore: base + 18,
    features: featureSet({
      switchedPiece: true,
      newlyDefendedPartners: 1 + (random() > 0.72 ? 1 : 0),
      movedPieceDefended: true,
      mutualPair: true,
      supportsRecentPiece: random() > 0.3,
      undevelopedMinor: partner === "bishop" || partner === "knight",
    }),
  };
  const diverse = {
    move: { pieceId: pieceCycle[(ply + 3) % pieceCycle.length], label: "diverse" },
    searchScore: base + 25,
    features: featureSet({
      switchedPiece: true,
      movedPieceDefended: random() > 0.55,
      undevelopedMinor: true,
      isolated: random() > 0.6,
    }),
  };
  const tactical = {
    move: { pieceId: last, label: "tactical" },
    searchScore: tacticalTurn ? base + 720 : base - 120,
    features: featureSet({
      forcing: tacticalTurn,
      repeatStreak: repeatStreak(last, recent),
      movedPieceDefended: true,
    }),
  };
  return [repeated, paired, diverse, tactical];
}

function coachReward(choice, tacticalTurn) {
  const features = choice.features;
  let reward = choice.searchScore * 0.08;
  if (features.mutualPair) reward += 120;
  if (features.supportsRecentPiece) reward += 72;
  reward += features.newlyDefendedPartners * 36;
  if (features.movedPieceDefended) reward += 24;
  if (features.switchedPiece) reward += 18;
  if (features.undevelopedMinor) reward += 24;
  reward -= features.repeatStreak * features.repeatStreak * 70;
  if (features.isolated) reward -= 38;
  if (tacticalTurn) reward += choice.move.label === "tactical" ? 500 : -800;
  return reward;
}

function createMetrics(weights) {
  return {
    id: weights.id,
    score: 0,
    pairSelections: 0,
    quietSelections: 0,
    quietRepeatViolations: 0,
    tacticalMisses: 0,
    distinctPieceTotal: 0,
  };
}

const metrics = new Map(
  TEAM_PLAY_TRAINING_CANDIDATES.map((weights) => [weights.id, createMetrics(weights)]),
);

for (let game = 0; game < gameCount; game += 1) {
  const random = rngFor(game * 2654435761);
  for (const weights of TEAM_PLAY_TRAINING_CANDIDATES) {
    const recent = [];
    const distinct = new Set();
    const result = metrics.get(weights.id);

    for (let ply = 0; ply < 12; ply += 1) {
      const tacticalTurn = ply % 7 === 5;
      let selected = null;
      for (const option of curriculumMoves(random, recent, ply)) {
        const team = {
          ...option.features,
          score: scoreTeamPlayFeatures(option.features, weights),
        };
        selected = chooseTeamAwareRootCandidate(
          selected,
          {
            move: option.move,
            searchScore: option.searchScore,
            team,
            features: option.features,
          },
          weights,
        );
      }

      result.score += coachReward(selected, tacticalTurn);
      if (selected.move.label === "pair") result.pairSelections += 1;
      if (!selected.team.forcing) {
        result.quietSelections += 1;
        if (selected.team.repeatStreak >= 2) result.quietRepeatViolations += 1;
      }
      if (tacticalTurn && selected.move.label !== "tactical") result.tacticalMisses += 1;
      recent.unshift(selected.move.pieceId);
      recent.splice(12);
      distinct.add(selected.move.pieceId);
    }
    result.distinctPieceTotal += distinct.size;
  }
}

const ranking = [...metrics.values()]
  .map((entry) => ({
    ...entry,
    score: Math.round(entry.score),
    pairSelectionRate: entry.pairSelections / (gameCount * 12),
    quietRepeatViolationRate:
      entry.quietSelections > 0
        ? entry.quietRepeatViolations / entry.quietSelections
        : 0,
    averageDistinctPieces: entry.distinctPieceTotal / gameCount,
  }))
  .sort((left, right) => right.score - left.score);

const selected = ranking[0];
const report = {
  schema: 1,
  games: gameCount,
  pliesPerGame: 12,
  totalPolicyDecisions: gameCount * 12 * TEAM_PLAY_TRAINING_CANDIDATES.length,
  selectedPolicy: selected.id,
  expectedPolicy: TEAM_PLAY_WEIGHTS.id,
  ranking,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

if (selected.id !== TEAM_PLAY_WEIGHTS.id) {
  throw new Error(
    `Training selected ${selected.id}, but production uses ${TEAM_PLAY_WEIGHTS.id}`,
  );
}
if (selected.tacticalMisses !== 0) {
  throw new Error(`Selected policy missed ${selected.tacticalMisses} forcing tactics`);
}
if (selected.quietRepeatViolationRate > 0.01) {
  throw new Error(
    `Quiet same-piece violation rate is ${selected.quietRepeatViolationRate}`,
  );
}
if (selected.pairSelectionRate < 0.45) {
  throw new Error(`Pair selection rate is only ${selected.pairSelectionRate}`);
}
