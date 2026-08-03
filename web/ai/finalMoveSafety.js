import { generateLegalMovesForColor } from "../../src/engine3d/index.ts";
import { materialValue } from "./cubePieceValues.js";
import {
  assessRootMoveSafety,
  staticExchangeNet,
} from "./rootMoveSafety.js";
import { applyMoveForSearch, opposite } from "./searchEngine.js";

const GUARDED_TYPES = new Set(["queen", "rook", "bishop", "knight"]);

export function moveIdentity(move) {
  if (!move) return "";
  return [
    move.pieceId,
    move.from?.x,
    move.from?.y,
    move.from?.z,
    move.to?.x,
    move.to?.y,
    move.to?.z,
  ].join(":");
}

export function findMatchingLegalMove(moves, selected) {
  if (!selected) return null;
  const selectedKey = moveIdentity(selected);
  return moves.find((move) => moveIdentity(move) === selectedKey) ?? null;
}

function pieceById(board, id) {
  if (!id) return null;
  return board.getAllPieces().find((piece) => piece.id === id) ?? null;
}

function legalRecapturesOfMovedPiece(board, move, sideToMove) {
  const next = applyMoveForSearch(board, move);
  const movedAfter = next.getAllPieces().find((piece) => piece.id === move.pieceId);
  if (!movedAfter) return { next, movedAfter: null, recaptures: [] };

  const recaptures = generateLegalMovesForColor(next, opposite(sideToMove)).filter(
    (reply) => reply.capturedPieceId === movedAfter.id,
  );
  return { next, movedAfter, recaptures };
}

/**
 * Final material veto used immediately before the Worker posts a move.
 *
 * The worker delegates to the same bounded static-exchange evaluator used at
 * the search root. This prevents search, a fallback path or a move serializer
 * from disagreeing about whether a queen-for-knight/pawn trade is acceptable.
 */
export function assessImmediateMaterialSafety(board, move, sideToMove) {
  const moving = board.getPieceAt(move?.from);
  if (!moving || moving.color !== sideToMove || !GUARDED_TYPES.has(moving.type)) {
    return {
      safe: true,
      reason: "not-guarded",
      materialNet: 0,
      recaptureCount: 0,
    };
  }

  const { movedAfter, recaptures } = legalRecapturesOfMovedPiece(
    board,
    move,
    sideToMove,
  );
  const capturedBefore = pieceById(board, move.capturedPieceId);
  const strategicAssessment = assessRootMoveSafety(board, move, sideToMove);
  const exchangeNet = Number.isFinite(strategicAssessment.exchangeNet)
    ? strategicAssessment.exchangeNet
    : staticExchangeNet(board, move);

  if (strategicAssessment.safe) {
    return {
      safe: true,
      reason: strategicAssessment.reason,
      materialNet: exchangeNet,
      recaptureCount: recaptures.length,
      exchangeNet,
      promotionCredit: strategicAssessment.promotionCredit ?? 0,
      exposedPieceType: movedAfter?.type ?? moving.type,
      capturedPieceType: capturedBefore?.type ?? null,
    };
  }

  return {
    safe: false,
    reason: strategicAssessment.reason,
    materialNet: exchangeNet,
    exchangeNet,
    recaptureCount: recaptures.length,
    promotionCredit: strategicAssessment.promotionCredit ?? 0,
    exposedPieceType: movedAfter?.type ?? moving.type,
    exposedPieceValue: materialValue(movedAfter ?? moving),
    capturedPieceType: capturedBefore?.type ?? null,
    capturedPieceValue: materialValue(capturedBefore),
    recaptureMoveIds: recaptures.map(moveIdentity),
  };
}

export function filterMovesByFinalSafety(board, moves, sideToMove) {
  return moves.filter(
    (move) => assessImmediateMaterialSafety(board, move, sideToMove).safe,
  );
}
