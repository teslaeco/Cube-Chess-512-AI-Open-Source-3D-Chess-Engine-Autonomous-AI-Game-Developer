import {
  evaluatePosition,
  generateLegalMovesForColor,
} from "../../src/engine3d/index.ts";
import { CUBE_PIECE_VALUES, materialValue } from "./cubePieceValues.js";
import {
  applyMoveForSearch,
  isSearchPromotionMove,
  opposite,
} from "./searchEngine.js";

const GUARDED_TYPES = new Set(["queen", "rook", "bishop", "knight"]);
const MAX_EXCHANGE_DEPTH = 6;
const UNSOUND_MARGIN = 180;
const QUEEN_EXCHANGE_MARGIN = 75;
const LEVEL_SEVEN = 6;

function sameSquare(left, right) {
  return (
    left?.x === right?.x &&
    left?.y === right?.y &&
    left?.z === right?.z
  );
}

function chebyshevDistance(left, right) {
  return Math.max(
    Math.abs(left.x - right.x),
    Math.abs(left.y - right.y),
    Math.abs(left.z - right.z),
  );
}

function pieceById(board, id) {
  if (!id) return null;
  return board.getAllPieces().find((piece) => piece.id === id) ?? null;
}

function capturesOnSquare(board, side, target) {
  return generateLegalMovesForColor(board, side).filter(
    (move) => move.capturedPieceId && sameSquare(move.to, target),
  );
}

/**
 * Static exchange evaluation on one 3D square.
 *
 * The side to move may decline the capture, therefore zero is always an option.
 * Every recursive capture removes at least one piece, so the bounded recursion is
 * deterministic and small enough to use only for guarded root moves.
 */
function bestExchangeGain(board, side, target, occupantValue, depth = 0) {
  if (depth >= MAX_EXCHANGE_DEPTH) return 0;

  let best = 0;
  for (const capture of capturesOnSquare(board, side, target)) {
    const next = applyMoveForSearch(board, capture);
    const attackerAfter = next.getPieceAt(capture.to);
    if (!attackerAfter) continue;

    const continuation = bestExchangeGain(
      next,
      opposite(side),
      target,
      materialValue(attackerAfter),
      depth + 1,
    );
    best = Math.max(best, occupantValue - continuation);
  }
  return best;
}

export function staticExchangeNet(board, move) {
  const moving = board.getPieceAt(move.from);
  if (!moving) return 0;

  // Resolve captures by the authoritative id, not only by destination square.
  // This keeps the safety gate correct for every legal 3D capture encoding.
  const captured = pieceById(board, move.capturedPieceId);
  const immediateGain = materialValue(captured);
  const next = applyMoveForSearch(board, move);
  const movedAfter = next.getAllPieces().find((piece) => piece.id === moving.id);
  if (!movedAfter) return immediateGain;

  const opponentGain = bestExchangeGain(
    next,
    opposite(moving.color),
    movedAfter.position,
    materialValue(movedAfter),
  );
  return immediateGain - opponentGain;
}

function levelSevenPromotionCredit(board, move, color) {
  const movedAfter = board.getPieceAt(move.to);
  if (!movedAfter) return 0;

  const legalBeforeRecapture = generateLegalMovesForColor(board, color);
  const supportedPawnIds = [];

  for (const pawn of board.getPiecesByColor(color)) {
    if (pawn.type !== "pawn" || pawn.position.z !== LEVEL_SEVEN) continue;

    const promotions = legalBeforeRecapture.filter(
      (candidate) => candidate.pieceId === pawn.id && isSearchPromotionMove(board, candidate),
    );
    if (!promotions.length) continue;

    const supportsPawn = chebyshevDistance(movedAfter.position, pawn.position) <= 2;
    const supportsDestination = promotions.some(
      (candidate) => chebyshevDistance(movedAfter.position, candidate.to) <= 2,
    );
    if (supportsPawn || supportsDestination) supportedPawnIds.push(pawn.id);
  }

  if (!supportedPawnIds.length) return 0;

  const recaptures = capturesOnSquare(board, opposite(color), move.to);
  if (!recaptures.length) return 0;

  for (const recapture of recaptures) {
    const afterRecapture = applyMoveForSearch(board, recapture);
    const legalReplies = generateLegalMovesForColor(afterRecapture, color);
    const promotionSurvives = supportedPawnIds.some((pawnId) => {
      const pawn = afterRecapture.getAllPieces().find((piece) => piece.id === pawnId);
      if (!pawn || pawn.type !== "pawn" || pawn.position.z !== LEVEL_SEVEN) return false;
      return legalReplies.some(
        (candidate) =>
          candidate.pieceId === pawnId &&
          isSearchPromotionMove(afterRecapture, candidate),
      );
    });
    if (!promotionSurvives) return 0;
  }

  return CUBE_PIECE_VALUES.queen - CUBE_PIECE_VALUES.pawn;
}

export function assessRootMoveSafety(board, move, sideToMove) {
  const moving = board.getPieceAt(move.from);
  if (!moving || moving.color !== sideToMove || !GUARDED_TYPES.has(moving.type)) {
    return { safe: true, reason: "not-guarded", exchangeNet: 0, promotionCredit: 0 };
  }

  const next = applyMoveForSearch(board, move);
  const movedAfter = next.getAllPieces().find((piece) => piece.id === moving.id);
  if (!movedAfter) {
    return { safe: true, reason: "missing-piece", exchangeNet: 0, promotionCredit: 0 };
  }

  const enemy = opposite(sideToMove);
  const status = evaluatePosition(next, enemy);
  if (status.kind === "checkmate" && status.winner === sideToMove) {
    return {
      safe: true,
      reason: "immediate-checkmate",
      exchangeNet: Infinity,
      promotionCredit: 0,
    };
  }

  // Legal captures are authoritative. Do not rely on a pseudo-attack pre-check,
  // because a missed attack here can let the final worker approve a queen loss.
  const legalRecaptures = capturesOnSquare(next, enemy, movedAfter.position);
  if (!legalRecaptures.length) {
    return { safe: true, reason: "not-legally-capturable", exchangeNet: 0, promotionCredit: 0 };
  }

  const exchangeNet = staticExchangeNet(board, move);
  const captured = pieceById(board, move.capturedPieceId);
  const queenForLowerPiece = Boolean(
    moving.type === "queen" &&
      captured &&
      materialValue(captured) < materialValue(moving),
  );
  const requiredMargin = queenForLowerPiece
    ? -QUEEN_EXCHANGE_MARGIN
    : -UNSOUND_MARGIN;
  if (exchangeNet >= requiredMargin) {
    return {
      safe: true,
      reason: queenForLowerPiece ? "compensated-queen-exchange" : "sound-exchange",
      exchangeNet,
      promotionCredit: 0,
    };
  }

  const promotionCredit = levelSevenPromotionCredit(next, move, sideToMove);
  if (promotionCredit > 0 && exchangeNet + promotionCredit >= requiredMargin) {
    return {
      safe: true,
      reason: "supports-level-seven-promotion",
      exchangeNet,
      promotionCredit,
    };
  }

  return {
    safe: false,
    reason: queenForLowerPiece
      ? "queen-for-lower-piece-critical-blunder"
      : "uncompensated-high-value-sacrifice",
    exchangeNet,
    promotionCredit,
    movingPieceType: moving.type,
    capturedPieceType: captured?.type ?? null,
    legalRecaptureCount: legalRecaptures.length,
  };
}

export function filterRootMovesBySafety(board, moves, sideToMove) {
  const safe = moves.filter((move) => assessRootMoveSafety(board, move, sideToMove).safe);
  if (safe.length) return safe;

  // If the position is genuinely forced, prefer any non-queen legal move before
  // allowing a queen sacrifice. This prevents a broad fallback from undoing the
  // critical queen-value invariant.
  const nonQueen = moves.filter((move) => board.getPieceAt(move.from)?.type !== "queen");
  return nonQueen.length ? nonQueen : moves;
}
