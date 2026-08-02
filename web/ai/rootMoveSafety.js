import {
  generateLegalMovesForColor,
  isSquareAttacked,
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

  const captured = move.capturedPieceId ? board.getPieceAt(move.to) : null;
  const immediateGain = materialValue(captured);
  const next = applyMoveForSearch(board, move);
  const movedAfter = next.getPieceAt(move.to);
  if (!movedAfter) return immediateGain;

  const opponentGain = bestExchangeGain(
    next,
    opposite(moving.color),
    move.to,
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

  // The exception is valid only when accepting the sacrifice cannot remove the
  // promised immediate promotion. If even one legal recapture blocks promotion,
  // the opponent can choose it and the material sacrifice remains unsound.
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
  const movedAfter = next.getPieceAt(move.to);
  if (!movedAfter) {
    return { safe: true, reason: "missing-piece", exchangeNet: 0, promotionCredit: 0 };
  }

  const enemy = opposite(sideToMove);
  if (!isSquareAttacked(next, movedAfter.position, enemy)) {
    return { safe: true, reason: "not-attacked", exchangeNet: 0, promotionCredit: 0 };
  }

  // Pseudo-attacks are only a fast pre-check. Pinned pieces and checkmate may
  // make every apparent capture illegal, so the guard confirms a legal capture.
  const canBeCaptured = capturesOnSquare(next, enemy, move.to).length > 0;
  if (!canBeCaptured) {
    return { safe: true, reason: "not-legally-capturable", exchangeNet: 0, promotionCredit: 0 };
  }

  const exchangeNet = staticExchangeNet(board, move);
  if (exchangeNet >= -UNSOUND_MARGIN) {
    return { safe: true, reason: "sound-exchange", exchangeNet, promotionCredit: 0 };
  }

  const promotionCredit = levelSevenPromotionCredit(next, move, sideToMove);
  if (promotionCredit > 0 && exchangeNet + promotionCredit >= -UNSOUND_MARGIN) {
    return {
      safe: true,
      reason: "supports-level-seven-promotion",
      exchangeNet,
      promotionCredit,
    };
  }

  return {
    safe: false,
    reason: "uncompensated-high-value-sacrifice",
    exchangeNet,
    promotionCredit,
  };
}

export function filterRootMovesBySafety(board, moves, sideToMove) {
  const safe = moves.filter((move) => assessRootMoveSafety(board, move, sideToMove).safe);

  // Never leave the engine without a legal move. If every legal move loses
  // material (for example in a forced defence), full minimax remains authoritative.
  return safe.length ? safe : moves;
}
