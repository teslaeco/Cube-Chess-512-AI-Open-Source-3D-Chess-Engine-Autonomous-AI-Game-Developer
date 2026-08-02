import {
  Board3D,
  Coordinate3D,
  evaluatePosition,
  generateLegalMovesForColor,
} from "../../src/engine3d/index.ts";
import { CUBE_PIECE_VALUES } from "./cubePieceValues.js";

export const PIECE_VALUES = CUBE_PIECE_VALUES;

export const DIFFICULTY_LIMITS = Object.freeze({
  easy: { maxDepth: 1, quiescenceDepth: 1, milliseconds: 120 },
  medium: { maxDepth: 2, quiescenceDepth: 2, milliseconds: 700 },
  hard: { maxDepth: 4, quiescenceDepth: 4, milliseconds: 2_800 },
});

const MATE_SCORE = 1_000_000;
const MAX_POSITIONAL_BONUS = 24;

export function createBoard(pieces) {
  return new Board3D(
    pieces.map((piece) => ({
      id: piece.id,
      type: piece.type,
      color: piece.color,
      position: new Coordinate3D(piece.position.x, piece.position.y, piece.position.z),
      hasMoved: Boolean(piece.hasMoved),
    })),
  );
}

export function opposite(color) {
  return color === "white" ? "black" : "white";
}

export function requiresSearchPromotion(piece, to) {
  if (!piece || piece.type !== "pawn" || !to) return false;
  if (to.z === 7) return true;
  const finalRank = piece.color === "white" ? 7 : 0;
  return to.z < 7 && to.y === finalRank;
}

export function isSearchPromotionMove(board, move) {
  return requiresSearchPromotion(board.getPieceAt(move.from), move.to);
}

/**
 * Applies a move to a cloned board and resolves the promotion that the real
 * presentation layer performs immediately after the legal pawn move.
 *
 * Search must never analyse a pawn on a promotion square as if it were still a
 * pawn. The production AI currently chooses a queen, so the search uses the
 * same deterministic replacement until underpromotion becomes part of search.
 */
export function applyMoveForSearch(board, move, promotionType = "queen") {
  const next = board.clone();
  const { movedPiece } = next.applyMove(move);
  if (!requiresSearchPromotion(movedPiece, movedPiece.position)) return next;

  return new Board3D(
    next.getAllPieces().map((piece) =>
      piece.id === movedPiece.id ? { ...piece, type: promotionType } : piece,
    ),
  );
}

function positionalBonus(piece) {
  if (piece.type === "king") return 0;
  const centerDistance =
    Math.abs(piece.position.x - 3.5) +
    Math.abs(piece.position.y - 3.5) +
    Math.abs(piece.position.z - 3.5);
  const weight = piece.type === "pawn" ? 0.45 : 1;
  return Math.max(0, Math.round((MAX_POSITIONAL_BONUS - centerDistance * 2) * weight));
}

export function evaluateBoard(board, perspective) {
  let score = 0;
  for (const piece of board.getAllPieces()) {
    const value = PIECE_VALUES[piece.type] + positionalBonus(piece);
    score += piece.color === perspective ? value : -value;
  }
  return score;
}

function pieceIndex(board) {
  return new Map(board.getAllPieces().map((piece) => [piece.id, piece]));
}

function moveOrderingScore(board, move) {
  const pieces = pieceIndex(board);
  const attacker = pieces.get(move.pieceId);
  const victim = move.capturedPieceId ? pieces.get(move.capturedPieceId) : null;
  let score = 0;

  if (victim) {
    score += 100_000 + PIECE_VALUES[victim.type] * 16;
    score -= attacker ? PIECE_VALUES[attacker.type] : 0;
  }
  if (isSearchPromotionMove(board, move)) {
    score += 120_000 + PIECE_VALUES.queen - PIECE_VALUES.pawn;
  }

  const centerDistance =
    Math.abs(move.to.x - 3.5) +
    Math.abs(move.to.y - 3.5) +
    Math.abs(move.to.z - 3.5);
  score += Math.round((10.5 - centerDistance) * 4);
  return score;
}

export function orderMoves(board, moves, preferredMove = null) {
  return [...moves].sort((left, right) => {
    if (preferredMove) {
      const leftPreferred = sameMove(left, preferredMove);
      const rightPreferred = sameMove(right, preferredMove);
      if (leftPreferred !== rightPreferred) return leftPreferred ? -1 : 1;
    }
    const scoreDifference = moveOrderingScore(board, right) - moveOrderingScore(board, left);
    if (scoreDifference !== 0) return scoreDifference;
    return left.to.toSquareAddress().localeCompare(right.to.toSquareAddress());
  });
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

function terminalScore(status, perspective, ply) {
  if (status.kind === "checkmate") {
    return status.winner === perspective ? MATE_SCORE - ply : -MATE_SCORE + ply;
  }
  if (status.kind === "stalemate") return 0;
  return null;
}

function quiescence(board, side, perspective, alpha, beta, depth, ply, shouldStop) {
  if (shouldStop()) return { score: evaluateBoard(board, perspective), aborted: true };

  const status = evaluatePosition(board, side);
  const terminal = terminalScore(status, perspective, ply);
  if (terminal !== null) return { score: terminal, aborted: false };

  const maximizing = side === perspective;
  const standPat = evaluateBoard(board, perspective);
  if (depth <= 0) return { score: standPat, aborted: false };

  if (maximizing) {
    if (standPat >= beta) return { score: standPat, aborted: false };
    alpha = Math.max(alpha, standPat);
  } else {
    if (standPat <= alpha) return { score: standPat, aborted: false };
    beta = Math.min(beta, standPat);
  }

  const tacticalMoves = orderMoves(
    board,
    generateLegalMovesForColor(board, side).filter(
      (move) => move.capturedPieceId || isSearchPromotionMove(board, move),
    ),
  );
  if (!tacticalMoves.length) return { score: standPat, aborted: false };

  let best = standPat;
  for (const move of tacticalMoves) {
    if (shouldStop()) return { score: best, aborted: true };
    const next = applyMoveForSearch(board, move);
    const child = quiescence(
      next,
      opposite(side),
      perspective,
      alpha,
      beta,
      depth - 1,
      ply + 1,
      shouldStop,
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
  shouldStop,
) {
  if (shouldStop()) return { score: evaluateBoard(board, perspective), aborted: true };

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
      shouldStop,
    );
  }

  const moves = orderMoves(board, generateLegalMovesForColor(board, side));
  const maximizing = side === perspective;
  let best = maximizing ? -Infinity : Infinity;

  for (const move of moves) {
    if (shouldStop()) return { score: best, aborted: true };
    const next = applyMoveForSearch(board, move);
    const child = alphaBeta(
      next,
      opposite(side),
      perspective,
      depth - 1,
      alpha,
      beta,
      quiescenceDepth,
      ply + 1,
      shouldStop,
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

  return {
    score: Number.isFinite(best) ? best : evaluateBoard(board, perspective),
    aborted: false,
  };
}

export function serializeMove(move) {
  return {
    pieceId: move.pieceId,
    from: {
      x: move.from.x,
      y: move.from.y,
      z: move.from.z,
      square3D: move.from.toSquareAddress(),
    },
    to: {
      x: move.to.x,
      y: move.to.y,
      z: move.to.z,
      square3D: move.to.toSquareAddress(),
    },
    square3D: move.to.toSquareAddress(),
    kind: move.kind,
    capturedPieceId: move.capturedPieceId ?? null,
  };
}

export function chooseBestMove(
  pieces,
  sideToMove,
  difficulty = "easy",
  options = {},
) {
  const board = createBoard(pieces);
  const legalMoves = orderMoves(board, generateLegalMovesForColor(board, sideToMove));
  if (!legalMoves.length) return null;

  const limit = DIFFICULTY_LIMITS[difficulty] ?? DIFFICULTY_LIMITS.easy;
  const now = options.now ?? (() => performance.now());
  const deadline = now() + (options.milliseconds ?? limit.milliseconds);
  const isCancelled = options.isCancelled ?? (() => false);
  const shouldStop = () => isCancelled() || now() >= deadline;
  const maxDepth = options.maxDepth ?? limit.maxDepth;
  const quiescenceDepth = options.quiescenceDepth ?? limit.quiescenceDepth;

  let bestMove = legalMoves[0];
  let principalVariationMove = bestMove;

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    let iterationBestMove = null;
    let iterationBestScore = -Infinity;
    let iterationAborted = false;
    const orderedRootMoves = orderMoves(board, legalMoves, principalVariationMove);

    for (const move of orderedRootMoves) {
      if (shouldStop()) {
        iterationAborted = true;
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
        quiescenceDepth,
        1,
        shouldStop,
      );
      if (result.aborted) {
        iterationAborted = true;
        break;
      }

      const tieBreak = iterationBestMove
        ? move.to.toSquareAddress().localeCompare(iterationBestMove.to.toSquareAddress())
        : -1;
      if (
        result.score > iterationBestScore ||
        (result.score === iterationBestScore && tieBreak < 0)
      ) {
        iterationBestScore = result.score;
        iterationBestMove = move;
      }
    }

    if (iterationAborted || !iterationBestMove) break;
    bestMove = iterationBestMove;
    principalVariationMove = iterationBestMove;
  }

  return serializeMove(bestMove);
}
