import {
  evaluatePosition,
  generateLegalMovesForColor,
} from "../../src/engine3d/index.ts";
import { materialValue } from "./cubePieceValues.js";
import { assessRootMoveSafety } from "./rootMoveSafety.js";
import { applyMoveForSearch, opposite } from "./searchEngine.js";

const GUARDED_TYPES = new Set(["queen", "rook", "bishop", "knight"]);
const EQUAL_EXCHANGE_TOLERANCE = 75;

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

function legalRecapturesOfMovedPiece(board, move, sideToMove) {
  const next = applyMoveForSearch(board, move);
  const movedAfter = next.getPieceAt(move.to);
  if (!movedAfter) return { next, movedAfter: null, recaptures: [] };

  const recaptures = generateLegalMovesForColor(next, opposite(sideToMove)).filter(
    (reply) => reply.capturedPieceId === movedAfter.id,
  );
  return { next, movedAfter, recaptures };
}

/**
 * Final one-ply material veto used immediately before the Worker posts a move.
 *
 * This deliberately duplicates the most important safety invariant instead of
 * trusting search-only heuristics. A searched move, a variant-rule fallback or
 * a move from a lower difficulty must all pass the same production boundary.
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

  const { next, movedAfter, recaptures } = legalRecapturesOfMovedPiece(
    board,
    move,
    sideToMove,
  );
  if (!movedAfter) {
    return {
      safe: true,
      reason: "moved-piece-missing",
      materialNet: 0,
      recaptureCount: 0,
    };
  }

  const status = evaluatePosition(next, opposite(sideToMove));
  if (status.kind === "checkmate" && status.winner === sideToMove) {
    return {
      safe: true,
      reason: "immediate-checkmate",
      materialNet: Infinity,
      recaptureCount: 0,
    };
  }

  if (!recaptures.length) {
    return {
      safe: true,
      reason: "no-legal-immediate-recapture",
      materialNet: 0,
      recaptureCount: 0,
    };
  }

  const capturedBefore = move.capturedPieceId ? board.getPieceAt(move.to) : null;
  const gainedValue = materialValue(capturedBefore);
  const exposedValue = materialValue(movedAfter);
  const materialNet = gainedValue - exposedValue;

  // Equal exchanges and genuinely winning captures remain legal. The narrow
  // tolerance permits bishop-for-knight style trades, but not rook-for-bishop
  // or queen-for-any-lower-piece exchanges.
  if (materialNet >= -EQUAL_EXCHANGE_TOLERANCE) {
    return {
      safe: true,
      reason: "equal-or-winning-immediate-exchange",
      materialNet,
      recaptureCount: recaptures.length,
    };
  }

  // Preserve the user's only deliberate sacrifice exception. The existing root
  // policy proves that a level-G pawn still has a legal promotion on H after
  // every legal recapture; proximity alone is never enough.
  const strategicAssessment = assessRootMoveSafety(board, move, sideToMove);
  if (strategicAssessment.reason === "supports-level-seven-promotion") {
    return {
      safe: true,
      reason: "proven-level-seven-promotion-exception",
      materialNet,
      recaptureCount: recaptures.length,
      promotionCredit: strategicAssessment.promotionCredit,
    };
  }

  return {
    safe: false,
    reason: "immediate-high-value-for-low-value-blunder",
    materialNet,
    recaptureCount: recaptures.length,
    exposedPieceType: movedAfter.type,
    capturedPieceType: capturedBefore?.type ?? null,
    recaptureMoveIds: recaptures.map(moveIdentity),
  };
}

export function filterMovesByFinalSafety(board, moves, sideToMove) {
  return moves.filter(
    (move) => assessImmediateMaterialSafety(board, move, sideToMove).safe,
  );
}
