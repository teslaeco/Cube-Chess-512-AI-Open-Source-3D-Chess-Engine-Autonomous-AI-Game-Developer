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
    activePieceDelta: 0,
    levelCoverageDelta: 0,
    ...overrides,
  };
}

function curriculumMoves(random, recent, ply) {
  const last = recent[0] ?? "rook";
  const cycleIndex =
    (ply + Math.floor(random() * pieceCycle.length)) % pieceCycle.length;
  const different = pieceCycle[cycleIndex];
  const partner =
    different === last ? (last === "bishop" ? "knight" : "bishop") : different;
  const mobilePiece =
    pieceCycle[(cycleIndex + 2 + Math.floor(random() * 2)) % pieceCycle.length];
  const tacticalTurn = ply % 7 === 5;
  const base = Math.round(random() * 36);

  const repeated = {
    move: { pieceId: last, label: "repeat" },
    searchScore: base + 56 + Math.round(random() * 35),
    features: featureSet({
      repeatStreak: repeatStreak(last, recent),
      earlyMajorRepeat: last === "rook" || last === "queen",
      isolated: true,
      activePieceDelta: random() > 0.82 ? -1 : 0,
      levelCoverageDelta: random() > 0.9 ? -1 : 0,
    }),
  };

  const paired = {
    move: { pieceId: partner, label: "pair" },
    searchScore: base + 18 + Math.round(random() * 48),
    features: featureSet({
      switchedPiece: true,
      newlyDefendedPartners: random() > 0.48 ? 1 : 0,
      movedPieceDefended: true,
      mutualPair: true,
      supportsRecentPiece: random() > 0.3,
      undevelopedMinor: partner === "bishop" || partner === "knight",
      activePieceDelta: random() > 0.68 ? 1 : 0,
      levelCoverageDelta: random() > 0.78 ? 1 : 0,
    }),
  };

  const mobile = {
    move: { pieceId: mobilePiece, label: "mobile" },
    searchScore: base + 22 + Math.round(random() * 52),
    features: featureSet({
      switchedPiece: mobilePiece !== last,
      newlyDefendedPartners: random() > 0.78 ? 1 : 0,
      movedPieceDefended: random() > 0.52,
      undevelopedMinor: mobilePiece === "bishop" || mobilePiece === "knight",
      activePieceDelta: random() > 0.45 ? 2 : 1,
      levelCoverageDelta: random() > 0.56 ? 2 : 1,
      isolated: random() > 0.84,
    }),
  };

  const tactical = {
    move: { pieceId: last, label: "tactical" },
    searchScore: tacticalTurn ? base + 720 : base - 140,
    features: featureSet({
      forcing: tacticalTurn,
      repeatStreak: repeatStreak(last, recent),
      movedPieceDefended: true,
    }),
  };
  return [repeated, paired, mobile, tactical];
}

function coachReward(choice, tacticalTurn) {
  const features = choice.features;
  let reward = choice.searchScore * 0.06;
  if (features.mutualPair) reward += 104;
  if (features.supportsRecentPiece) reward += 68;
  reward += features.newlyDefendedPartners * 34;
  if (features.movedPieceDefended) reward += 24;
  if (features.switchedPiece) reward += 16;
  if (features.undevelopedMinor) reward += 24;
  reward += features.activePieceDelta * 46;
  reward += features.levelCoverageDelta * 34;
  reward -= features.repeatStreak * features.repeatStreak * 72;
  if (features.isolated) reward -= 40;
  if (tacticalTurn) reward += choice.move.label === "tactical" ? 520 : -900;
  return reward;
}

function createMetrics(weights) {
  return {
    id: weights.id,
    score: 0,
    pairSelections: 0,
    mobileSelections: 0,
    quietSelections: 0,
    quietRepeatViolations: 0,
    tacticalMisses: 0,
    distinctPieceTotal: 0,
    activePieceDeltaTotal: 0,
    levelCoverageDeltaTotal: 0,
  };
}

const metrics = new Map(
  TEAM_PLAY_TRAINING_CANDIDATES.map((weights) => [weights.id, createMetrics(weights)]),
);

for (let game = 0; game < gameCount; game += 1) {
  const gameSeed = game * 2654435761;
  for (const weights of TEAM_PLAY_TRAINING_CANDIDATES) {
    // Every candidate receives the exact same deterministic game. Recreating
    // the PRNG here prevents candidate ordering from influencing the ranking.
    const random = rngFor(gameSeed);
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
      if (selected.move.label === "mobile") result.mobileSelections += 1;
      if (!selected.team.forcing) {
        result.quietSelections += 1;
        if (selected.team.repeatStreak >= 2) result.quietRepeatViolations += 1;
      }
      if (tacticalTurn && selected.move.label !== "tactical") result.tacticalMisses += 1;
      result.activePieceDeltaTotal += selected.features.activePieceDelta;
      result.levelCoverageDeltaTotal += selected.features.levelCoverageDelta;
      recent.unshift(selected.move.pieceId);
      recent.splice(12);
      distinct.add(selected.move.pieceId);
    }
    result.distinctPieceTotal += distinct.size;
  }
}

const totalMovesPerCandidate = gameCount * 12;
const ranking = [...metrics.values()]
  .map((entry) => ({
    ...entry,
    score: Math.round(entry.score),
    pairSelectionRate: entry.pairSelections / totalMovesPerCandidate,
    mobileSelectionRate: entry.mobileSelections / totalMovesPerCandidate,
    quietRepeatViolationRate:
      entry.quietSelections > 0
        ? entry.quietRepeatViolations / entry.quietSelections
        : 0,
    averageDistinctPieces: entry.distinctPieceTotal / gameCount,
    averageActivePieceDelta: entry.activePieceDeltaTotal / totalMovesPerCandidate,
    averageLevelCoverageDelta: entry.levelCoverageDeltaTotal / totalMovesPerCandidate,
  }))
  .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));

const selected = ranking[0];
const runnerUp = ranking[1];
const scoreGap = selected.score - runnerUp.score;
const uniqueScores = new Set(ranking.map((entry) => entry.score)).size;
const report = {
  schema: 3,
  fairness: "identical-seeded-curriculum-per-candidate",
  games: gameCount,
  pliesPerGame: 12,
  totalPolicyDecisions:
    gameCount * 12 * TEAM_PLAY_TRAINING_CANDIDATES.length,
  selectedPolicy: selected.id,
  expectedPolicy: TEAM_PLAY_WEIGHTS.id,
  scoreGap,
  uniqueScores,
  ranking,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

if (uniqueScores < 2 || scoreGap <= 0) {
  throw new Error("Training curriculum did not discriminate candidate policies");
}
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
if (selected.pairSelectionRate < 0.3) {
  throw new Error(`Pair selection rate is only ${selected.pairSelectionRate}`);
}
if (selected.averageDistinctPieces < 2.5) {
  throw new Error(
    `Average distinct-piece count is only ${selected.averageDistinctPieces}`,
  );
}
