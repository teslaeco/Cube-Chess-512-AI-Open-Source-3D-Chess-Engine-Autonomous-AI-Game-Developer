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
      policy: "runtime-blunder-veto-v5",
      runtimeSafetyPolicy: "final-worker-material-gate-v1",
      safetyVetoApplied: vetoApplied,
      vetoedMove,
      safeCandidateCount,
      forcedUnsafeFallback,
      finalSafetyReason: assessment.reason,
      finalSafetyMaterialNet: Number.isFinite(assessment.materialNet)
        ? assessment.materialNet
        : null,
      finalSafetyRecaptures: assessment.recaptureCount ?? 0,
    },
  };
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
    // Forced positions must still progress. This is explicit in diagnostics and
    // can be found by self-play/regression tooling instead of silently hiding it.
    return attachRuntimeSafetyDiagnostics(serializeMove(candidate), {
      assessment,
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
