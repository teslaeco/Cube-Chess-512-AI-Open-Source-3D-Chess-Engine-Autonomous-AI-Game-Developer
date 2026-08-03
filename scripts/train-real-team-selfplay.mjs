import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  evaluatePosition,
  generateLegalMovesForColor,
} from "../src/engine3d/index.ts";
import { chooseMoveWithVariantRules } from "../web/ai/ai.worker.js";
import { materialValue } from "../web/ai/cubePieceValues.js";
import {
  assessImmediateMaterialSafety,
  filterMovesByFinalSafety,
  findMatchingLegalMove,
} from "../web/ai/finalMoveSafety.js";
import {
  applyMoveForSearch,
  createBoard,
  isSearchPromotionMove,
  opposite,
  orderMoves,
} from "../web/ai/searchEngine.js";
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

const gamesPerPolicy = Number(argument("games-per-policy", "1000"));
const trainingPlies = Number(argument("plies", "18"));
const reportPath = resolve(
  argument("report", "artifacts/real-team-selfplay-3000-report.json"),
);
if (!Number.isInteger(gamesPerPolicy) || gamesPerPolicy < 1) {
  throw new Error("--games-per-policy must be a positive integer");
}
if (!Number.isInteger(trainingPlies) || trainingPlies < 6) {
  throw new Error("--plies must be an integer of at least 6");
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

function terminalKind(kind) {
  return kind === "checkmate" || kind === "stalemate";
}

function createMetrics(weights) {
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

function safeSeededOpening(pieces, side, seed) {
  const random = rngFor(seed ^ 0x9e3779b9);
  const openingPlies = 2 + (seed % 4);
  let currentPieces = pieces;
  let currentSide = side;

  for (let ply = 0; ply < openingPlies; ply += 1) {
    const board = createBoard(currentPieces);
    const status = evaluatePosition(board, currentSide);
    if (terminalKind(status.kind)) break;

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

const metrics = new Map(
  TEAM_PLAY_TRAINING_CANDIDATES.map((weights) => [weights.id, createMetrics(weights)]),
);

for (const weights of TEAM_PLAY_TRAINING_CANDIDATES) {
  const result = metrics.get(weights.id);

  for (let game = 0; game < gamesPerPolicy; game += 1) {
    const seed = Math.imul(game + 1, 2654435761) >>> 0;
    const opening = safeSeededOpening(createInitialPieces(), "white", seed);
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

      const legal = generateLegalMovesForColor(board, side);
      if (!legal.length) break;
      const selected = chooseMoveWithVariantRules(
        pieces,
        side,
        "hard",
        {
          maxDepth: 1,
          quiescenceDepth: 0,
          milliseconds: 60_000,
          now: () => 0,
          transpositionEntries: 4_000,
          recentAiPieceIds: recentBySide[side],
          teamPlayWeights: weights,
        },
      );
      if (!selected) {
        throw new Error(`${weights.id} returned no move in game ${game}`);
      }

      const move = findMatchingLegalMove(legal, selected);
      if (!move) {
        throw new Error(`${weights.id} returned a non-legal move in game ${game}`);
      }

      const moving = board.getPieceAt(move.from);
      const captured = pieceById(board, move.capturedPieceId);
      const assessment = assessImmediateMaterialSafety(board, move, side);
      const next = applyMoveForSearch(board, move);
      const afterStatus = evaluatePosition(next, opposite(side));
      const quiet = Boolean(
        !move.capturedPieceId &&
          !isSearchPromotionMove(board, move) &&
          afterStatus.kind !== "check" &&
          afterStatus.kind !== "checkmate",
      );
      if (!assessment.safe) result.materialSafetyViolations += 1;
      if (selected.search?.forcedUnsafeFallback) result.forcedUnsafeFallbacks += 1;

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
        selected.search?.teamPlayMutualPair ||
        selected.search?.teamPlaySupportsRecentPiece ||
        selected.search?.teamPlayMovedPieceJointAttack ||
        (selected.search?.teamPlayCoordinatedTargetDelta ?? 0) > 0
      ) {
        result.teamMoves += 1;
      }
      if (selected.search?.teamPlayFreshPiece) result.freshPieceMoves += 1;

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
  }
}

const ranking = [...metrics.values()]
  .map((entry) => {
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
  })
  .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));

const selected = ranking[0];
const production = ranking.find((entry) => entry.id === TEAM_PLAY_WEIGHTS.id);
const baseline = ranking.find((entry) => entry.id === "balanced-v6");
const report = {
  schema: 2,
  mode: "real-legal-8x8x8-hard-self-play",
  syntheticCurriculum: false,
  gamesPerPolicy,
  policies: TEAM_PLAY_TRAINING_CANDIDATES.length,
  totalRealGames: gamesPerPolicy * TEAM_PLAY_TRAINING_CANDIDATES.length,
  trainingPlies,
  selectedPolicy: selected.id,
  productionPolicy: TEAM_PLAY_WEIGHTS.id,
  ranking,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

if (!production || !baseline) {
  throw new Error("Training report is missing production or baseline policy");
}
if (production.completedPlies < gamesPerPolicy * 6) {
  throw new Error(
    `Real self-play produced only ${production.completedPlies} production plies`,
  );
}
if (selected.id !== TEAM_PLAY_WEIGHTS.id) {
  throw new Error(
    `Real self-play selected ${selected.id}, but production uses ${TEAM_PLAY_WEIGHTS.id}`,
  );
}
if (production.materialSafetyViolations !== 0) {
  throw new Error(
    `Production policy made ${production.materialSafetyViolations} unsafe moves`,
  );
}
if (production.criticalQueenTradeViolations !== 0) {
  throw new Error(
    `Production policy made ${production.criticalQueenTradeViolations} queen-for-lower-piece trades`,
  );
}
if (production.forcedUnsafeFallbacks !== 0) {
  throw new Error(
    `Production policy used ${production.forcedUnsafeFallbacks} unsafe fallbacks`,
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
