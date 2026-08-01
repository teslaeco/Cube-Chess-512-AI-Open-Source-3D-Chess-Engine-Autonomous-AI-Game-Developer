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
  maxDepth: 7,
  quiescenceDepth: 6,
  milliseconds: 9_000,
  transpositionEntries: 180_000,
});

function centerBonus(position) {
  const distance =
    Math.abs(position.x - 3.5) +
    Math.abs(position.y - 3.5) +
    Math.abs(position.z - 3.5);
  return Math.max(0, Math.round(42 - distance * 4));
}

function developmentBonus(piece) {
  if (!piece.hasMoved) return 0;
  if (piece.type === "knight" || piece.type === "bishop") return 34;
  if (piece.type === "pawn") return 12;
  if (piece.type === "rook") return 8;
  if (piece.type === "queen") return 3;
  return 0;
}

function undevelopedMinorCount(pieces, color) {
  return pieces.filter(
    (piece) =>
      piece.color === color &&
      (piece.type === "bishop" || piece.type === "knight") &&
      !piece.hasMoved,
  ).length;
}

function adjacentFriendlyScore(pieces, color) {
  const king = pieces.find(
    (piece) => piece.color === color && piece.type === "king",
  );
  if (!king) return 0;

  let score = 0;
  for (const piece of pieces) {
    if (piece.color !== color || piece.id === king.id) continue;
    const dx = Math.abs(piece.position.x - king.position.x);
    const dy = Math.abs(piece.position.y - king.position.y);
    const dz = Math.abs(piece.position.z - king.position.z);
    if (Math.max(dx, dy, dz) > 1) continue;
    score += piece.type === "pawn" ? 15 : 7;
  }
  return score;
}

function activityScore(board, color) {
  const moves = generateLegalMovesForColor(board, color);
  const activePieces = new Set(moves.map((move) => move.pieceId)).size;
  return moves.length + activePieces * 12;
}

function capturePressure(board, color) {
  const piecesById = new Map(
    board.getAllPieces().map((piece) => [piece.id, piece]),
  );
  const threatened = new Map();
  for (const move of generateLegalMovesForColor(board, color)) {
    if (!move.capturedPieceId) continue;
    const target = piecesById.get(move.capturedPieceId);
    if (!target) continue;
    threatened.set(
      target.id,
      Math.max(threatened.get(target.id) ?? 0, PIECE_VALUES[target.type] ?? 0),
    );
  }
  return [...threatened.values()].reduce(
    (sum, value) => sum + Math.round(value * 0.13),
    0,
  );
}

function armyScore(board, color) {
  const pieces = board.getAllPieces();
  let score = 0;
  let movedUnits = 0;
  let movedMinors = 0;
  let movedPawns = 0;

  for (const piece of pieces) {
    if (piece.color !== color) continue;
    score += centerBonus(piece.position) + developmentBonus(piece);
    if (piece.hasMoved && piece.type !== "king") movedUnits += 1;
    if (
      piece.hasMoved &&
      (piece.type === "bishop" || piece.type === "knight")
    ) {
      movedMinors += 1;
    }
    if (piece.hasMoved && piece.type === "pawn") movedPawns += 1;
  }

  score += movedUnits * 7;
  score += movedMinors * 18;
  score += Math.min(6, movedPawns) * 8;
  score += adjacentFriendlyScore(pieces, color);
  score += activityScore(board, color);
  score += capturePressure(board, color);

  const undeveloped = undevelopedMinorCount(pieces, color);
  const queen = pieces.find(
    (piece) => piece.color === color && piece.type === "queen",
  );
  if (queen?.hasMoved && undeveloped >= 3) score -= 110;

  const movedPieceTypes = new Set(
    pieces
      .filter(
        (piece) => piece.color === color && piece.hasMoved && piece.type !== "king",
      )
      .map((piece) => piece.type),
  );
  score += movedPieceTypes.size * 15;
  return score;
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
  let material = 0;
  for (const piece of board.getAllPieces()) {
    const sign = piece.color === perspective ? 1 : -1;
    material += sign * PIECE_VALUES[piece.type];
  }

  const enemy = opposite(perspective);
  let score = material;
  score += armyScore(board, perspective) - armyScore(board, enemy);

  const enemyStatus = evaluatePosition(board, enemy);
  const ownStatus = evaluatePosition(board, perspective);
  if (enemyStatus.inCheck) score += 22;
  if (ownStatus.inCheck) score -= 85;
  return score;
}

function rootMoveBias(board, move, recentAiPieceIds = []) {
  const movingPiece = board
    .getAllPieces()
    .find((piece) => piece.id === move.pieceId);
  if (!movingPiece) return 0;

  let bias = centerBonus(move.to ?? movingPiece.position);
  const isTactical = Boolean(move.capturedPieceId || move.kind === "promotion");
  const repeatCount = recentAiPieceIds.filter(
    (pieceId) => pieceId === move.pieceId,
  ).length;

  if (!isTactical) bias -= repeatCount * 95;
  if (!movingPiece.hasMoved) {
    if (movingPiece.type === "bishop" || movingPiece.type === "knight") bias += 95;
    else if (movingPiece.type === "pawn") bias += 42;
    else if (movingPiece.type === "rook") bias += 12;
  }

  const pieces = board.getAllPieces();
  if (
    movingPiece.type === "queen" &&
    undevelopedMinorCount(pieces, movingPiece.color) >= 3 &&
    !isTactical
  ) {
    bias -= 135;
  }
  if (movingPiece.type === "king" && !isTactical) bias -= 45;

  const next = board.clone();
  next.applyMove(move);
  bias += Math.round((armyScore(next, movingPiece.color) - armyScore(board, movingPiece.color)) * 0.7);
  return bias;
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
  const recentAiPieceIds = options.recentAiPieceIds ?? [];
  const legalMoves = orderMoves(
    board,
    generateLegalMovesForColor(board, sideToMove),
  ).sort(
    (a, b) =>
      rootMoveBias(board, b, recentAiPieceIds) -
      rootMoveBias(board, a, recentAiPieceIds),
  );
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
  let bestScore = -Infinity;

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    let iterationBest = null;
    let iterationScore = -Infinity;
    let aborted = false;
    const ordered = orderMoves(board, legalMoves, principalVariation).sort(
      (a, b) =>
        rootMoveBias(board, b, recentAiPieceIds) -
        rootMoveBias(board, a, recentAiPieceIds),
    );

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
      const strategicScore =
        result.score + rootMoveBias(board, move, recentAiPieceIds);
      if (strategicScore > iterationScore) {
        iterationScore = strategicScore;
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
    engine: "strategic-alpha-beta-tt",
    completedDepth,
    nodes: context.nodes,
    score: Number.isFinite(bestScore) ? bestScore : null,
  };
  return serialized;
}
