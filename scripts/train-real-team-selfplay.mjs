import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  evaluatePosition,
  generateLegalMovesForColor,
} from "../src/engine3d/index.ts";
import { materialValue } from "../web/ai/cubePieceValues.js";
import {
  assessImmediateMaterialSafety,
  filterMovesByFinalSafety,
} from "../web/ai/finalMoveSafety.js";
import {
  applyMoveForSearch,
  createBoard,
  isSearchPromotionMove,
  opposite,
  orderMoves,
} from "../web/ai/searchEngine.js";
import {
  evaluateStrategicPosition,
  strategicMoveBias,
} from "../web/ai/strategicEvaluation.js";
import {
  analyzeTeamPlayMove,
  chooseTeamAwareRootCandidate,
  createTeamPlayBaseline,
} from "../web/ai/teamPlayPolicy.js";
import {
  TEAM_PLAY_TRAINING_CANDIDATES,
  TEAM_PLAY_WEIGHTS,
} from "../web/ai/teamPlayWeights.js";
import { createInitialPieces } from "../web/state/initialPosition.js";

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const entry = process.argv.find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : fallback;
}

const gamesInShard = Number(argument("games", "50"));
const seedOffset = Number(argument("seed-offset", "0"));
const totalGamesPerPolicy = Number(argument("total-games-per-policy", "1000"));
const trainingPlies = Number(argument("plies", "10"));
const rootCandidateLimit = Number(argument("root-candidates", "16"));
const requestedPolicy = argument("policy", "");
const reportPath = resolve(
  argument("report", "artifacts/real-team-selfplay-shard.json"),
);

if (!Number.isInteger(gamesInShard) || gamesInShard < 1) {
  throw new Error("--games must be a positive integer");
}
if (!Number.isInteger(seedOffset) || seedOffset < 0) {
  throw new Error("--seed-offset must be a non-negative integer");
}
if (!Number.isInteger(totalGamesPerPolicy) || totalGamesPerPolicy < gamesInShard) {
  throw new Error("--total-games-per-policy must cover the shard");
}
if (seedOffset + gamesInShard > totalGamesPerPolicy) {
  throw new Error("Shard exceeds --total-games-per-policy");
}
if (!Number.isInteger(trainingPlies) || trainingPlies < 6) {
  throw new Error("--plies must be an integer of at least 6");
}
if (!Number.isInteger(rootCandidateLimit) || rootCandidateLimit < 8) {
  throw new Error("--root-candidates must be an integer of at least 8");
}

const weights = TEAM_PLAY_TRAINING_CANDIDATES.find(
  (candidate) => candidate.id === requestedPolicy,
);
if (!weights) {
  throw new Error(`Unknown or missing team-play policy: ${requestedPolicy}`);
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

function plainPieces(board) {
  return board.getAllPieces().map((piece) => ({
    id: piece.id,
    type: piece.type,
    color: piece.color,
    hasMoved: Boolean(piece.hasMoved),
    position: {
      x: piece.position.x,
      y: piece.position.y,
      z: piece.position.z,
    },
  }));
}

function pieceById(board, id) {
  if (!id) return null;
  return board.getAllPieces().find((piece) => piece.id === id) ?? null;
}

function createMetrics() {
  return {
    id: weights.id,
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

function safeSeededOpening(pieces, side, globalGameIndex) {
  const seed = Math.imul(globalGameIndex + 1, 2654435761) >>> 0;
  const random = rngFor(seed ^ 0x9e3779b9);
  const openingPlies = 2 + (globalGameIndex % 4);
  let currentPieces = pieces;
  let currentSide = side;

  for (let ply = 0; ply < openingPlies; ply += 1) {
    const board = createBoard(currentPieces);
    const status = evaluatePosition(board, currentSide);
    if (status.kind === "checkmate" || status.kind === "stalemate") break;

    const legal = generateLegalMovesForColor(board, currentSide);
    if (!legal.length) break;
    const safe = filterMovesByFinalSafety(board, legal, currentSide);
    const source = safe.length ? safe : legal;
    const nonQueen = source.filter(
      (move) => board.getPieceAt(move.from)?.type !== "queen",
    );
    const candidates = orderMoves(board, nonQueen.length ? nonQueen : source);
    if (!candidates.length) break;

    const index = Math.floor(random() * candidates.length) % candidates.length;
    currentPieces = plainPieces(applyMoveForSearch(board, candidates[index]));
    currentSide = opposite(currentSide);
  }

  return { pieces: currentPieces, side: currentSide };
}

/**
 * Build a bounded but diverse root set from real legal moves. The first half
 * preserves the engine's tactical ordering; the second half guarantees that
 * alternative pieces can compete with the queen. Every selected move remains
 * legal and passes the production material-safety gate.
 */
function selectDiverseSafeCandidates(board, legal, sideToMove, limit) {
  const safe = filterMovesByFinalSafety(board, legal, sideToMove);
  if (!safe.length) return [];

  const ordered = orderMoves(board, safe);
  const selected = [];
  const selectedKeys = new Set();
  const representedPieces = new Set();
  const tacticalSlots = Math.max(4, Math.floor(limit / 2));

  function add(move) {
    const key = `${move.pieceId}:${move.from.x},${move.from.y},${move.from.z}:${move.to.x},${move.to.y},${move.to.z}`;
    if (selectedKeys.has(key) || selected.length >= limit) return;
    selected.push(move);
    selectedKeys.add(key);
    representedPieces.add(move.pieceId);
  }

  for (const move of ordered.slice(0, tacticalSlots)) add(move);
  for (const move of ordered) {
    if (!representedPieces.has(move.pieceId)) add(move);
    if (selected.length >= limit) break;
  }
  for (const move of ordered) {
    add(move);
    if (selected.length >= limit) break;
  }
  return selected;
}

/**
 * Fast training selector for real-board policy rollouts.
 *
 * This is intentionally not presented as a full-depth Alpha-Beta game. It uses
 * real Board3D states, real legal moves, production exchange safety, production
 * strategic evaluation and the exact production team-play feature scorer. The
 * bounded root set makes thousands of reproducible rollouts practical in CI.
 */
function choosePolicyRolloutMove(board, sideToMove, recentPieceIds) {
  const legal = generateLegalMovesForColor(board, sideToMove);
  const candidates = selectDiverseSafeCandidates(
    board,
    legal,
    sideToMove,
    rootCandidateLimit,
  );
  if (!candidates.length) return null;

  const baseline = createTeamPlayBaseline(
    board,
    sideToMove,
    recentPieceIds,
  );
  let choice = null;

  for (const move of candidates) {
    const team = analyzeTeamPlayMove(
      board,
      move,
      recentPieceIds,
      weights,
      baseline,
    );
    const next = applyMoveForSearch(board, move);
    const searchScore =
      evaluateStrategicPosition(next, sideToMove) +
      strategicMoveBias(board, move, recentPieceIds);
    choice = chooseTeamAwareRootCandidate(
      choice,
      { move, searchScore, team },
      weights,
    );
  }

  if (!choice) return null;
  const assessment = assessImmediateMaterialSafety(
    board,
    choice.move,
    sideToMove,
  );
  if (!assessment.safe) {
    throw new Error(
      `${weights.id} selected an unsafe rollout move: ${assessment.reason}`,
    );
  }
  return { ...choice, assessment };
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

const result = createMetrics();

for (let game = 0; game < gamesInShard; game += 1) {
  const globalGameIndex = seedOffset + game;
  const opening = safeSeededOpening(
    createInitialPieces(),
    "white",
    globalGameIndex,
  );
  let pieces = opening.pieces;
  let side = opening.side;
  const recentBySide = { white: [], black: [] };
  const distinctBySide = { white: new Set(), black: new Set() };
  const pendingQueenBySide = { white: null, black: null };
  result.games += 1;

  for (let ply = 0; ply < trainingPlies; ply += 1) {
    const board = createBoard(pieces);
    const status = evaluatePosition(board, side);
    if (status.kind === "checkmate") {
      result.checkmates += 1;
      break;
    }
    if (status.kind === "stalemate") {
      result.draws += 1;
      break;
    }

    const selected = choosePolicyRolloutMove(
      board,
      side,
      recentBySide[side],
    );
    if (!selected) break;

    const move = selected.move;
    const moving = board.getPieceAt(move.from);
    const captured = pieceById(board, move.capturedPieceId);
    const next = applyMoveForSearch(board, move);
    const afterStatus = evaluatePosition(next, opposite(side));
    const quiet = Boolean(
      !move.capturedPieceId &&
        !isSearchPromotionMove(board, move) &&
        afterStatus.kind !== "check" &&
        afterStatus.kind !== "checkmate",
    );

    if (!selected.assessment.safe) result.materialSafetyViolations += 1;

    result.completedPlies += 1;
    result.movesBySide[side] += 1;
    distinctBySide[side].add(move.pieceId);
    if (quiet) {
      result.quietMoves += 1;
      if (
        recentBySide[side][0] === move.pieceId &&
        recentBySide[side][1] === move.pieceId
      ) {
        result.samePieceRunViolations += 1;
      }
    }
    if (moving?.type === "queen") {
      result.queenMoves += 1;
      if (quiet) result.quietQueenMoves += 1;
    }
    if (
      selected.team.mutualPair ||
      selected.team.supportsRecentPiece ||
      selected.team.movedPieceJointAttack ||
      selected.team.coordinatedTargetDelta > 0
    ) {
      result.teamMoves += 1;
    }
    if (selected.team.freshPiece) result.freshPieceMoves += 1;

    const previousMover = opposite(side);
    const pending = pendingQueenBySide[previousMover];
    if (pending) {
      const queenSurvives = next
        .getAllPieces()
        .some((piece) => piece.id === pending.queenId && piece.type === "queen");
      if (!queenSurvives && pending.capturedValue < pending.queenValue) {
        result.criticalQueenTradeViolations += 1;
      }
      pendingQueenBySide[previousMover] = null;
    }

    if (moving?.type === "queen" && captured) {
      pendingQueenBySide[side] = {
        queenId: moving.id,
        queenValue: materialValue(moving),
        capturedValue: materialValue(captured),
        capturedType: captured.type,
      };
    } else {
      pendingQueenBySide[side] = null;
    }

    recentBySide[side].unshift(move.pieceId);
    recentBySide[side] = recentBySide[side].slice(0, 12);
    pieces = plainPieces(next);
    side = opposite(side);
  }

  result.distinctPieceTotal +=
    distinctBySide.white.size + distinctBySide.black.size;

  if ((game + 1) % 10 === 0) {
    console.log(
      `${weights.id} seed ${seedOffset}: ${game + 1}/${gamesInShard} rollouts`,
    );
  }
}

const completed = completeMetrics(result);
const report = {
  schema: 5,
  mode: "real-legal-8x8x8-team-policy-rollout-shard",
  syntheticCurriculum: false,
  fullAlphaBetaGames: false,
  partial: true,
  requestedPolicy,
  seedOffset,
  gamesInShard,
  totalGamesPerPolicy,
  trainingPlies,
  rootCandidateLimit,
  productionPolicy: TEAM_PLAY_WEIGHTS.id,
  ranking: [completed],
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

if (completed.games !== gamesInShard) {
  throw new Error(`${weights.id} completed ${completed.games}/${gamesInShard} games`);
}
if (completed.completedPlies < gamesInShard * 4) {
  throw new Error(
    `${weights.id} produced only ${completed.completedPlies} real plies`,
  );
}
if (completed.materialSafetyViolations !== 0) {
  throw new Error(
    `${weights.id} made ${completed.materialSafetyViolations} unsafe moves`,
  );
}
if (completed.criticalQueenTradeViolations !== 0) {
  throw new Error(
    `${weights.id} made ${completed.criticalQueenTradeViolations} queen-for-lower-piece trades`,
  );
}
if (completed.forcedUnsafeFallbacks !== 0) {
  throw new Error(
    `${weights.id} used ${completed.forcedUnsafeFallbacks} unsafe fallbacks`,
  );
}
