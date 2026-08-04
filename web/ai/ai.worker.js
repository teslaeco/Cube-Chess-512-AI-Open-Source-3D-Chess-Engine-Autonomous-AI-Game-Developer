import { generateLegalMovesForColor } from "../../src/engine3d/index.ts";
import {
  createBoard,
  orderMoves,
  serializeMove,
} from "./searchEngine.js";
import { chooseAdvancedMove } from "./advancedSearch.js";
import { chooseCompletedRootBaseline } from "./classicalRootBaseline.js";
import { chooseBasicArmyMove } from "./basicArmySearch.js";
import {
  getDifficultyProfile,
  normalizeDifficulty,
} from "./difficultyProfiles.js";
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
    requestedDifficulty = null,
    resolvedDifficulty = null,
    difficultyEngine = null,
    searchBudgetMilliseconds = null,
  },
) {
  return {
    ...serialized,
    search: {
      ...(serialized.search ?? {}),
      policy: "runtime-blunder-veto-v7",
      runtimeSafetyPolicy: "final-worker-static-exchange-gate-v2",
      requestedDifficulty,
      resolvedDifficulty,
      difficultyEngine,
      searchBudgetMilliseconds,
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

function chooseHardMove(pieces, sideToMove, options = {}) {
  const baseline = chooseCompletedRootBaseline(pieces, sideToMove, options);
  const advanced = chooseAdvancedMove(pieces, sideToMove, options);
  if (!advanced) return baseline;

  const completedDepth = advanced.search?.completedDepth ?? 0;
  if (completedDepth > 0) {
    return {
      ...advanced,
      search: {
        ...(advanced.search ?? {}),
        baselineCompleted: Boolean(baseline?.search?.baselineCompleted),
        baselineCandidateCount:
          baseline?.search?.baselineCandidateCount ?? null,
        resultSource: "completed-alpha-beta",
      },
    };
  }

  if (!baseline) return advanced;
  return {
    ...baseline,
    search: {
      ...(baseline.search ?? {}),
      advancedEngine: advanced.search?.engine ?? null,
      advancedCompletedDepth: completedDepth,
      advancedNodes: advanced.search?.nodes ?? 0,
      advancedAbortedBeforeCompletedDepth: true,
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

function routingDiagnostics(difficulty, options) {
  const resolvedDifficulty = normalizeDifficulty(difficulty);
  const profile = getDifficultyProfile(resolvedDifficulty);
  return {
    requestedDifficulty: options.requestedDifficulty ?? difficulty,
    resolvedDifficulty,
    difficultyEngine: profile.engine,
    searchBudgetMilliseconds:
      options.milliseconds ?? profile.searchMilliseconds,
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
  const resolvedDifficulty = normalizeDifficulty(difficulty);
  const route = routingDiagnostics(resolvedDifficulty, options);
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
      ...route,
    });
  }

  const safeMoves = filterMovesByFinalSafety(board, variantLegal, sideToMove);
  if (!safeMoves.length) {
    const fallback = leastLosingFallback(board, variantLegal, sideToMove);
    return attachRuntimeSafetyDiagnostics(serializeMove(fallback.move), {
      assessment: fallback.assessment,
      vetoApplied: true,
      vetoedMove: moveIdentity(candidate),
      safeCandidateCount: 0,
      forcedUnsafeFallback: true,
      ...route,
    });
  }

  let replacement = null;
  if (resolvedDifficulty === "hard") {
    replacement = chooseHardMove(pieces, sideToMove, {
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
    ...route,
  });
}

export function chooseMoveWithVariantRules(
  pieces,
  sideToMove,
  difficulty,
  options = {},
) {
  const resolvedDifficulty = normalizeDifficulty(difficulty);
  const profile = getDifficultyProfile(resolvedDifficulty);
  const resolvedOptions = {
    ...options,
    requestedDifficulty: options.requestedDifficulty ?? difficulty,
    milliseconds: options.milliseconds ?? profile.searchMilliseconds,
    maxDepth: options.maxDepth ?? profile.maxDepth,
    quiescenceDepth:
      options.quiescenceDepth ?? profile.quiescenceDepth,
  };
  const selected =
    resolvedDifficulty === "hard"
      ? chooseHardMove(pieces, sideToMove, resolvedOptions)
      : chooseBasicArmyMove(
          pieces,
          sideToMove,
          resolvedDifficulty,
          resolvedOptions,
        );
  if (!selected) return null;

  return enforceFinalWorkerSafety(
    pieces,
    sideToMove,
    resolvedDifficulty,
    selected,
    resolvedOptions,
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
        requestedDifficulty:
          event.data.requestedDifficulty ?? event.data.difficulty,
        milliseconds: event.data.searchMilliseconds,
        isCancelled: () => token !== generation,
        recentAiPieceIds: event.data.recentAiPieceIds ?? [],
        aiUsageCounts: event.data.aiUsageCounts ?? {},
      },
    );
    self.postMessage({ requestId: event.data.requestId, move });
  });
}
