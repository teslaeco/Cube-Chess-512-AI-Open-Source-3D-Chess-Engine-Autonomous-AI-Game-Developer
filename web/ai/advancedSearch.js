import {
  evaluatePosition,
  generateLegalMovesForColor,
} from "../../src/engine3d/index.ts";
import {
  PIECE_VALUES,
  createBoard,
  opposite,
  orderMoves,
  serializeMove,
} from "./searchEngine.js";

const MATE_SCORE = 10_000_000;
const DEFAULT_LIMITS = Object.freeze({
  maxDepth: 6,
  quiescenceDepth: 5,
  milliseconds: 6_000,
  transpositionEntries: 120_000,
});

function centerBonus(position) {
  const distance =
    Math.abs(position.x - 3.5) +
    Math.abs(position.y - 3.5) +
    Math.abs(position.z - 3.5);
  return Math.max(0, Math.round(30 - distance * 3));
}

function developmentBonus(piece) {
  if (!piece.hasMoved) return 0;
  if (piece.type === "knight" || piece.type === "bishop") return 14;
  if (piece.type === "rook" || piece.type === "queen") return 5;
  return 0;
}

export function positionKey(board, side) {
  const pieces = board
    .getAllPieces()
    .map((piece) =>
      `${piece.color[0]}:${piece.type}:${piece.position.x},${piece.position.y},${piece.position.z}:${piece.hasMoved ? 1 : 0}`,
    )
    .sort()
    .join("|");
  return `${side}|${pieces}`;
}

export function evaluateAdvanced(board, perspective) {
  let score = 0;
  for (const piece of board.getAllPieces()) {
    const sign = piece.color === perspective ? 1 : -1;
    const value =
      PIECE_VALUES[piece.type] +
      centerBonus(piece.position) +
      developmentBonus(piece);
    score += sign * value;
  }

  const ownMobility = generateLegalMovesForColor(board, perspective).length;
  const enemyMobility = generateLegalMovesForColor(board, opposite(perspective)).length;
  score += (ownMobility - enemyMobility) * 2;

  const enemyStatus = evaluatePosition(board, opposite(perspective));
  const ownStatus = evaluatePosition(board, perspective);
  if (enemyStatus.inCheck) score += 45;
  if (ownStatus.inCheck) score -= 55;
  return score;
}

function terminalScore(status, perspective, ply) {
  if (status.kind === "checkmate") {
    return status.winner === perspective ? MATE_SCORE - ply : -MATE_SCORE + ply;
  }
  if (status.kind === "stalemate") return 0;
  return null;
}

function capTable(table, maximum) {
  if (table.size < maximum) return;
  const removeCount = Math.max(1, Math.floor(maximum / 8));
  let removed = 0;
  for (const key of table.keys()) {
    table.delete(key);
    removed += 1;
    if (removed >= removeCount) break;
  }
}

function quiescence(
  board,
  side,
  perspective,
  alpha,
  beta,
  depth,
  ply,
  context,
) {
  if (context.shouldStop()) {
    return { score: evaluateAdvanced(board, perspective), aborted: true };
  }

  context.nodes += 1;
  const status = evaluatePosition(board, side);
  const terminal = terminalScore(status, perspective, ply);
  if (terminal !== null) return { score: terminal, aborted: false };

  const maximizing = side === perspective;
  const standPat = evaluateAdvanced(board, perspective);
  if (depth <= 0) return { score: standPat, aborted: false };

  if (maximizing) {
    if (standPat >= beta) return { score: standPat, aborted: false };
    alpha = Math.max(alpha, standPat);
  } else {
    if (standPat <= alpha) return { score: standPat, aborted: false };
    beta = Math.min(beta, standPat);
  }

  const tacticalMoves = generateLegalMovesForColor(board, side).filter(
    (move) => move.capturedPieceId || move.kind === "promotion",
  );
  const moves = orderMoves(board, tacticalMoves);
  if (!moves.length) return { score: standPat, aborted: false };

  let best = standPat;
  for (const move of moves) {
    const next = board.clone();
    next.applyMove(move);
    const child = quiescence(
      next,
      opposite(side),
      perspective,
      alpha,
      beta,
      depth - 1,
      ply + 1,
      context,
    );
    if (child.aborted) return { score: best, aborted: true };

    if (maximizing) {
      best = Math.max(best, child.score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, child.score);
      beta = Math.min(beta, best);
    }
    if (beta <= alpha) break;
  }
  return { score: best, aborted: false };
}

function alphaBeta(
  board,
  side,
  perspective,
  depth,
  alpha,
  beta,
  quiescenceDepth,
  ply,
  context,
) {
  if (context.shouldStop()) {
    return { score: evaluateAdvanced(board, perspective), aborted: true };
  }

  context.nodes += 1;
  const originalAlpha = alpha;
  const key = positionKey(board, side);
  const cached = context.table.get(key);
  if (cached && cached.depth >= depth) {
    if (cached.flag === "exact") return { score: cached.score, aborted: false };
    if (cached.flag === "lower") alpha = Math.max(alpha, cached.score);
    if (cached.flag === "upper") beta = Math.min(beta, cached.score);
    if (alpha >= beta) return { score: cached.score, aborted: false };
  }

  const status = evaluatePosition(board, side);
  const terminal = terminalScore(status, perspective, ply);
  if (terminal !== null) return { score: terminal, aborted: false };

  if (depth <= 0) {
    return quiescence(
      board,
      side,
      perspective,
      alpha,
      beta,
      quiescenceDepth,
      ply,
      context,
    );
  }

  const moves = orderMoves(
    board,
    generateLegalMovesForColor(board, side),
    cached?.bestMove,
  );
  const maximizing = side === perspective;
  let bestScore = maximizing ? -Infinity : Infinity;
  let bestMove = null;

  for (const move of moves) {
    const next = board.clone();
    next.applyMove(move);
    const child = alphaBeta(
      next,
      opposite(side),
      perspective,
      depth - 1,
      alpha,
      beta,
      quiescenceDepth,
      ply + 1,
      context,
    );
    if (child.aborted) return { score: bestScore, aborted: true };

    if (maximizing ? child.score > bestScore : child.score < bestScore) {
      bestScore = child.score;
      bestMove = move;
    }
    if (maximizing) alpha = Math.max(alpha, bestScore);
    else beta = Math.min(beta, bestScore);
    if (beta <= alpha) break;
  }

  if (!Number.isFinite(bestScore)) bestScore = evaluateAdvanced(board, perspective);
  const flag =
    bestScore <= originalAlpha ? "upper" : bestScore >= beta ? "lower" : "exact";
  capTable(context.table, context.transpositionEntries);
  context.table.set(key, { depth, score: bestScore, flag, bestMove });
  return { score: bestScore, aborted: false };
}

export function chooseAdvancedMove(pieces, sideToMove, options = {}) {
  const board = createBoard(pieces);
  const legalMoves = orderMoves(board, generateLegalMovesForColor(board, sideToMove));
  if (!legalMoves.length) return null;

  const now = options.now ?? (() => performance.now());
  const deadline = now() + (options.milliseconds ?? DEFAULT_LIMITS.milliseconds);
  const isCancelled = options.isCancelled ?? (() => false);
  const context = {
    nodes: 0,
    table: new Map(),
    transpositionEntries:
      options.transpositionEntries ?? DEFAULT_LIMITS.transpositionEntries,
    shouldStop: () => isCancelled() || now() >= deadline,
  };
  const maxDepth = options.maxDepth ?? DEFAULT_LIMITS.maxDepth;
  const quiescenceDepth =
    options.quiescenceDepth ?? DEFAULT_LIMITS.quiescenceDepth;

  let bestMove = legalMoves[0];
  let principalVariation = bestMove;
  let completedDepth = 0;

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    let iterationBest = null;
    let iterationScore = -Infinity;
    let aborted = false;
    const ordered = orderMoves(board, legalMoves, principalVariation);

    for (const move of ordered) {
      if (context.shouldStop()) {
        aborted = true;
        break;
      }
      const next = board.clone();
      next.applyMove(move);
      const result = alphaBeta(
        next,
        opposite(sideToMove),
        sideToMove,
        depth - 1,
        -Infinity,
        Infinity,
        quiescenceDepth,
        1,
        context,
      );
      if (result.aborted) {
        aborted = true;
        break;
      }
      if (result.score > iterationScore) {
        iterationScore = result.score;
        iterationBest = move;
      }
    }

    if (aborted || !iterationBest) break;
    bestMove = iterationBest;
    principalVariation = iterationBest;
    completedDepth = depth;
  }

  const serialized = serializeMove(bestMove);
  serialized.search = {
    engine: "advanced-alpha-beta-tt",
    completedDepth,
    nodes: context.nodes,
  };
  return serialized;
}
