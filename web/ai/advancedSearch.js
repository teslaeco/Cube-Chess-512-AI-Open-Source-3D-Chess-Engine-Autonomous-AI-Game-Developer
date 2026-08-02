import {
  evaluatePosition,
  generateLegalMovesForColor,
} from "../../src/engine3d/index.ts";
import {
  applyMoveForSearch,
  createBoard,
  isSearchPromotionMove,
  opposite,
  orderMoves,
  serializeMove,
} from "./searchEngine.js";
import {
  evaluateStrategicPosition,
  strategicMoveBias,
} from "./strategicEvaluation.js";

const MATE_SCORE = 10_000_000;
const DEFAULT_LIMITS = Object.freeze({
  maxDepth: 8,
  quiescenceDepth: 7,
  milliseconds: 12_000,
  transpositionEntries: 240_000,
});

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
  return evaluateStrategicPosition(board, perspective);
}

function terminalScore(status, perspective, ply) {
  if (status.kind === "checkmate") {
    return status.winner === perspective ? MATE_SCORE - ply : -MATE_SCORE + ply;
  }
  if (status.kind === "stalemate") return 0;
  return null;
}

function sameMove(left, right) {
  return (
    left?.pieceId === right?.pieceId &&
    left?.from?.x === right?.from?.x &&
    left?.from?.y === right?.from?.y &&
    left?.from?.z === right?.from?.z &&
    left?.to?.x === right?.to?.x &&
    left?.to?.y === right?.to?.y &&
    left?.to?.z === right?.to?.z
  );
}

function orderedMoves(board, moves, preferred = null, history = null, ply = 0) {
  return orderMoves(board, moves, preferred).sort((a, b) => {
    const preferredA = preferred && sameMove(a, preferred) ? 1 : 0;
    const preferredB = preferred && sameMove(b, preferred) ? 1 : 0;
    if (preferredA !== preferredB) return preferredB - preferredA;
    const historyA = history?.get(`${a.pieceId}:${a.to.x},${a.to.y},${a.to.z}`) ?? 0;
    const historyB = history?.get(`${b.pieceId}:${b.to.x},${b.to.y},${b.to.z}`) ?? 0;
    if (historyA !== historyB) return historyB - historyA;
    const killerA = history?.get(`killer:${ply}:${a.pieceId}:${a.to.x},${a.to.y},${a.to.z}`) ?? 0;
    const killerB = history?.get(`killer:${ply}:${b.pieceId}:${b.to.x},${b.to.y},${b.to.z}`) ?? 0;
    return killerB - killerA;
  });
}

function rememberCutoff(context, move, depth, ply) {
  if (move.capturedPieceId) return;
  const key = `${move.pieceId}:${move.to.x},${move.to.y},${move.to.z}`;
  context.history.set(key, (context.history.get(key) ?? 0) + depth * depth);
  context.history.set(`killer:${ply}:${key}`, depth);
}

function capTable(table, maximum) {
  if (table.size < maximum) return;
  const remove = Math.max(1, Math.floor(maximum / 10));
  let count = 0;
  for (const key of table.keys()) {
    table.delete(key);
    count += 1;
    if (count >= remove) break;
  }
}

function quiescence(board, side, perspective, alpha, beta, depth, ply, context) {
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

  const tactical = generateLegalMovesForColor(board, side).filter(
    (move) => move.capturedPieceId || isSearchPromotionMove(board, move),
  );
  const moves = orderedMoves(board, tactical, null, context.history, ply);
  let best = standPat;

  for (const move of moves) {
    const next = applyMoveForSearch(board, move);
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

function alphaBeta(board, side, perspective, depth, alpha, beta, qDepth, ply, context) {
  if (context.shouldStop()) {
    return { score: evaluateAdvanced(board, perspective), aborted: true };
  }
  context.nodes += 1;

  const originalAlpha = alpha;
  const originalBeta = beta;
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
    return quiescence(board, side, perspective, alpha, beta, qDepth, ply, context);
  }

  const moves = orderedMoves(
    board,
    generateLegalMovesForColor(board, side),
    cached?.bestMove,
    context.history,
    ply,
  );
  const maximizing = side === perspective;
  let bestScore = maximizing ? -Infinity : Infinity;
  let bestMove = null;

  for (const move of moves) {
    const next = applyMoveForSearch(board, move);
    const child = alphaBeta(
      next,
      opposite(side),
      perspective,
      depth - 1,
      alpha,
      beta,
      qDepth,
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
    if (beta <= alpha) {
      if (!isSearchPromotionMove(board, move)) rememberCutoff(context, move, depth, ply);
      break;
    }
  }

  if (!Number.isFinite(bestScore)) bestScore = evaluateAdvanced(board, perspective);
  const flag =
    bestScore <= originalAlpha ? "upper" : bestScore >= originalBeta ? "lower" : "exact";
  capTable(context.table, context.transpositionEntries);
  context.table.set(key, { depth, score: bestScore, flag, bestMove });
  return { score: bestScore, aborted: false };
}

export function chooseAdvancedMove(pieces, sideToMove, options = {}) {
  const board = createBoard(pieces);
  const recent = options.recentAiPieceIds ?? [];
  const legal = generateLegalMovesForColor(board, sideToMove);
  if (!legal.length) return null;

  const now = options.now ?? (() => performance.now());
  const deadline = now() + (options.milliseconds ?? DEFAULT_LIMITS.milliseconds);
  const context = {
    nodes: 0,
    table: new Map(),
    history: new Map(),
    transpositionEntries: options.transpositionEntries ?? DEFAULT_LIMITS.transpositionEntries,
    shouldStop: () => (options.isCancelled?.() ?? false) || now() >= deadline,
  };
  const maxDepth = options.maxDepth ?? DEFAULT_LIMITS.maxDepth;
  const qDepth = options.quiescenceDepth ?? DEFAULT_LIMITS.quiescenceDepth;

  let bestMove = orderMoves(board, legal)[0];
  let bestScore = -Infinity;
  let completedDepth = 0;
  let principalVariation = bestMove;

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    let iterationBest = null;
    let iterationScore = -Infinity;
    let aborted = false;
    const rootMoves = orderedMoves(board, legal, principalVariation, context.history, 0)
      .sort((a, b) => strategicMoveBias(board, b, recent) - strategicMoveBias(board, a, recent));

    for (const move of rootMoves) {
      if (context.shouldStop()) {
        aborted = true;
        break;
      }
      const next = applyMoveForSearch(board, move);
      const result = alphaBeta(
        next,
        opposite(sideToMove),
        sideToMove,
        depth - 1,
        -Infinity,
        Infinity,
        qDepth,
        1,
        context,
      );
      if (result.aborted) {
        aborted = true;
        break;
      }
      // Root heuristics improve ordering only. They must never override the
      // authoritative minimax result returned by the completed search.
      const score = result.score;
      if (score > iterationScore) {
        iterationScore = score;
        iterationBest = move;
      }
    }

    if (aborted || !iterationBest) break;
    bestMove = iterationBest;
    bestScore = iterationScore;
    principalVariation = iterationBest;
    completedDepth = depth;
  }

  const serialized = serializeMove(bestMove);
  serialized.search = {
    engine: "strategic-3d-alpha-beta-v2",
    policy: "promotion-aware-exchange-safe-v3",
    completedDepth,
    nodes: context.nodes,
    score: Number.isFinite(bestScore) ? bestScore : null,
  };
  return serialized;
}
