import {
  evaluatePosition,
  generateLegalMovesForColor,
} from "../../src/engine3d/index.ts";
import {
  applyMoveForSearch,
  chooseBestMove,
  createBoard,
  evaluateBoard,
  isSearchPromotionMove,
  opposite,
  orderMoves,
  serializeMove,
} from "./searchEngine.js";
import {
  filterMovesByFinalSafety,
  findMatchingLegalMove,
} from "./finalMoveSafety.js";
import {
  analyzeTeamPlayMove,
  chooseTeamAwareRootCandidate,
  createTeamPlayBaseline,
} from "./teamPlayPolicy.js";
import {
  analyzeArmyDevelopmentMove,
  combineTeamAndArmyAnalysis,
  createArmyDevelopmentBaseline,
} from "./armyDevelopmentPolicy.js";
import { TEAM_PLAY_WEIGHTS } from "./teamPlayWeights.js";

function useCount(counts, pieceId) {
  const value = Number(counts?.[pieceId] ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function recentStreak(recent, pieceId) {
  let streak = 0;
  for (const id of recent ?? []) {
    if (id !== pieceId) break;
    streak += 1;
  }
  return streak;
}

export function needsArmyAlternative({
  selectedPieceId,
  selectedPieceType,
  recentAiPieceIds = [],
  aiUsageCounts = {},
}) {
  if (!selectedPieceId || selectedPieceType === "king") return false;
  const selectedUseCount = useCount(aiUsageCounts, selectedPieceId);
  const usedPieceCount = Object.values(aiUsageCounts).filter(
    (value) => Number(value) > 0,
  ).length;
  const streak = recentStreak(recentAiPieceIds, selectedPieceId);
  return Boolean(
    streak >= 2 ||
      selectedUseCount >= 4 ||
      (selectedPieceType === "queen" && selectedUseCount >= 1 && usedPieceCount < 6),
  );
}

function isQuietMove(board, move, sideToMove) {
  if (!move || move.capturedPieceId || isSearchPromotionMove(board, move)) {
    return false;
  }
  const next = applyMoveForSearch(board, move);
  const status = evaluatePosition(next, opposite(sideToMove));
  return status.kind !== "check" && status.kind !== "checkmate";
}

function diverseQuietCandidates(board, legal, selectedMove, sideToMove, counts) {
  const safe = filterMovesByFinalSafety(board, legal, sideToMove);
  const selectedUseCount = useCount(counts, selectedMove.pieceId);
  const represented = new Set();
  const result = [];

  for (const move of orderMoves(board, safe)) {
    if (move.pieceId === selectedMove.pieceId) continue;
    if (represented.has(move.pieceId)) continue;
    if (useCount(counts, move.pieceId) >= selectedUseCount) continue;
    if (!isQuietMove(board, move, sideToMove)) continue;
    represented.add(move.pieceId);
    result.push(move);
    if (result.length >= 12) break;
  }
  return result;
}

export function chooseBasicArmyMove(
  pieces,
  sideToMove,
  difficulty = "easy",
  options = {},
) {
  const searched = chooseBestMove(pieces, sideToMove, difficulty, options);
  if (!searched) return null;

  const board = createBoard(pieces);
  const legal = generateLegalMovesForColor(board, sideToMove);
  const selectedMove = findMatchingLegalMove(legal, searched);
  const selectedPiece = selectedMove ? board.getPieceAt(selectedMove.from) : null;
  const recent = options.recentAiPieceIds ?? [];
  const counts = options.aiUsageCounts ?? {};

  if (
    !selectedMove ||
    !selectedPiece ||
    !isQuietMove(board, selectedMove, sideToMove) ||
    !needsArmyAlternative({
      selectedPieceId: selectedMove.pieceId,
      selectedPieceType: selectedPiece.type,
      recentAiPieceIds: recent,
      aiUsageCounts: counts,
    })
  ) {
    return searched;
  }

  const candidates = diverseQuietCandidates(
    board,
    legal,
    selectedMove,
    sideToMove,
    counts,
  );
  if (!candidates.length) return searched;

  const weights = options.teamPlayWeights ?? TEAM_PLAY_WEIGHTS;
  const teamBaseline = createTeamPlayBaseline(board, sideToMove, recent);
  const armyBaseline = createArmyDevelopmentBaseline(board, sideToMove, counts);
  const selectedStaticScore = evaluateBoard(
    applyMoveForSearch(board, selectedMove),
    sideToMove,
  );
  const positionalTolerance = difficulty === "medium" ? 0 : 18;
  let choice = null;

  for (const move of candidates) {
    const next = applyMoveForSearch(board, move);
    const searchScore = evaluateBoard(next, sideToMove);
    if (searchScore < selectedStaticScore - positionalTolerance) continue;

    const team = analyzeTeamPlayMove(
      board,
      move,
      recent,
      weights,
      teamBaseline,
    );
    const army = analyzeArmyDevelopmentMove(
      board,
      move,
      counts,
      armyBaseline,
    );
    choice = chooseTeamAwareRootCandidate(
      choice,
      {
        move,
        searchScore,
        team: combineTeamAndArmyAnalysis(team, army),
      },
      weights,
    );
  }

  if (!choice) return searched;
  const serialized = serializeMove(choice.move);
  serialized.search = {
    engine: "classical-basic-army-tiebreak-v1",
    policy: "whole-army-quiet-root-v1",
    tacticalSearchEngine: "classical-basic",
    requestedDepth: options.maxDepth ?? null,
    resultSource: "quiet-whole-army-tiebreak",
    replacedPieceId: selectedMove.pieceId,
    replacedPieceType: selectedPiece.type,
    replacementPieceId: choice.move.pieceId,
    replacementStaticScore: choice.searchScore,
    searchedStaticScore: selectedStaticScore,
    positionalTolerance,
    armyDevelopmentScore: choice.team.armyScore ?? 0,
    teamPlayScore: choice.team.teamScore ?? choice.team.score,
    armyActivatesFreshUnit: Boolean(choice.team.activatesFreshUnit),
    armyNewRole: Boolean(choice.team.newRole),
    armyBroadens: Boolean(choice.team.broadensArmy),
  };
  return serialized;
}
