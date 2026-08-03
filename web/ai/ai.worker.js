import { generateLegalMovesForColor } from "../../src/engine3d/index.ts";
import {
  chooseBestMove,
  createBoard,
  orderMoves,
  serializeMove,
} from "./searchEngine.js";
import { chooseAdvancedMove } from "./advancedSearch.js";
import { applyLoneKingLevelRule } from "../rules/LoneKingLevelRule.js";
import {
  assessImmediateMaterialSafety,
  filterMovesByFinalSafety,
  findMatchingLegalMove,
  moveIdentity,
} from "./finalMoveSafety.js";

let generation = 0;

function attachRuntimeSafetyDiagnostics(
  serialized,
  {
    assessment,
    vetoApplied,
    vetoedMove = null,
    safeCandidateCount,
    forcedUnsafeFallback = false,
  },
) {
  return {
    ...serialized,
    search: {
      ...(serialized.search ?? {}),
      policy: "runtime-blunder-veto-v7",
      runtimeSafetyPolicy: "final-worker-static-exchange-gate-v2",
      safetyVetoApplied: vetoApplied,
      vetoedMove,
      safeCandidateCount,
      forcedUnsafeFallback,
      finalSafetyReason: assessment.reason,
      finalSafetyMaterialNet: Number.isFinite(assessment.materialNet)
        ? assessment.materialNet
        : null,
      finalSafetyExchangeNet: Number.isFinite(assessment.exchangeNet)
        ? assessment.exchangeNet
        : null,
      finalSafetyRecaptures: assessment.recaptureCount ?? 0,
      finalSafetyCapturedPieceType: assessment.capturedPieceType ?? null,
      finalSafetyExposedPieceType: assessment.exposedPieceType ?? null,
    },
  };
}

function leastLosingFallback(board, moves, sideToMove) {
  const ordered = orderMoves(board, moves);
  return ordered
    .map((move, orderIndex) => ({
      move,
      orderIndex,
      assessment: assessImmediateMaterialSafety(board, move, sideToMove),
      movingType: board.getPieceAt(move.from)?.type ?? null,
    }))
    .sort((left, right) => {
      const leftCriticalQueen =
        left.movingType === "queen" &&
        left.assessment.reason === "queen-for-lower-piece-critical-blunder";
      const rightCriticalQueen =
        right.movingType === "queen" &&
        right.assessment.reason === "queen-for-lower-piece-critical-blunder";
      if (leftCriticalQueen !== rightCriticalQueen) {
        return leftCriticalQueen ? 1 : -1;
      }

      const leftNet = Number.isFinite(left.assessment.materialNet)
        ? left.assessment.materialNet
        : 0;
      const rightNet = Number.isFinite(right.assessment.materialNet)
        ? right.assessment.materialNet
        : 0;
      if (leftNet !== rightNet) return rightNet - leftNet;
      return left.orderIndex - right.orderIndex;
    })[0];
}

/**
 * Last authoritative AI boundary before a move is posted to the game.
 *
 * Search, difficulty selection and variant fallbacks are not trusted to preserve
 * material safety on their own. Every returned move is reconstructed from the
 * current legal move list and checked again here.
 */
export function enforceFinalWorkerSafety(
  pieces,
  sideToMove,
  difficulty,
  selected,
  options = {},
) {
  const board = createBoard(pieces);
  const legal = generateLegalMovesForColor(board, sideToMove);
  const variantLegal = applyLoneKingLevelRule(
    pieces,
    sideToMove,
    orderMoves(board, legal),
  );
  if (!variantLegal.length) return null;

  const selectedLegal = findMatchingLegalMove(variantLegal, selected);
  const candidate = selectedLegal ?? variantLegal[0];
  const assessment = assessImmediateMaterialSafety(board, candidate, sideToMove);

  if (assessment.safe) {
    const serialized = selectedLegal ? selected : serializeMove(candidate);
    return attachRuntimeSafetyDiagnostics(serialized, {
      assessment,
      vetoApplied: false,
      safeCandidateCount: filterMovesByFinalSafety(
        board,
        variantLegal,
        sideToMove,
      ).length,
    });
  }

  const safeMoves = filterMovesByFinalSafety(board, variantLegal, sideToMove);
  if (!safeMoves.length) {
    // A forced position must still progress, but a broad fallback must never
    // silently restore a voluntary queen-for-pawn/knight exchange. Choose the
    // least losing non-critical legal move and expose the fallback in telemetry.
    const fallback = leastLosingFallback(board, variantLegal, sideToMove);
    return attachRuntimeSafetyDiagnostics(serializeMove(fallback.move), {
      assessment: fallback.assessment,
      vetoApplied: true,
      vetoedMove: moveIdentity(candidate),
      safeCandidateCount: 0,
      forcedUnsafeFallback: true,
    });
  }

  let replacement = null;
  if (difficulty === "hard") {
    replacement = chooseAdvancedMove(pieces, sideToMove, {
      ...options,
      allowedRootMoveIds: safeMoves.map(moveIdentity),
    });
  }

  const replacementLegal = findMatchingLegalMove(safeMoves, replacement);
  const finalMove = replacementLegal ?? orderMoves(board, safeMoves)[0];
  const finalSerialized = replacementLegal ? replacement : serializeMove(finalMove);
  const finalAssessment = assessImmediateMaterialSafety(
    board,
    finalMove,
    sideToMove,
  );

  return attachRuntimeSafetyDiagnostics(finalSerialized, {
    assessment: finalAssessment,
    vetoApplied: true,
    vetoedMove: moveIdentity(candidate),
    safeCandidateCount: safeMoves.length,
  });
}

export function chooseMoveWithVariantRules(
  pieces,
  sideToMove,
  difficulty,
  options = {},
) {
  const selected =
    difficulty === "hard"
      ? chooseAdvancedMove(pieces, sideToMove, options)
      : chooseBestMove(pieces, sideToMove, difficulty, options);
  if (!selected) return null;

  return enforceFinalWorkerSafety(
    pieces,
    sideToMove,
    difficulty,
    selected,
    options,
  );
}

if (typeof self !== "undefined") {
  self.addEventListener("message", (event) => {
    if (event.data.type === "cancel") {
      generation += 1;
      return;
    }
    if (event.data.type !== "choose-move") return;

    const token = generation;
    const move = chooseMoveWithVariantRules(
      event.data.pieces,
      event.data.sideToMove,
      event.data.difficulty,
      {
        isCancelled: () => token !== generation,
        recentAiPieceIds: event.data.recentAiPieceIds ?? [],
      },
    );
    self.postMessage({ requestId: event.data.requestId, move });
  });
}
