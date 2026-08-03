import {
  evaluatePosition,
  generateLegalMovesForColor,
  isSquareAttacked,
} from "../../src/engine3d/index.ts";
import {
  applyMoveForSearch,
  isSearchPromotionMove,
  opposite,
} from "./searchEngine.js";
import { TEAM_PLAY_WEIGHTS } from "./teamPlayWeights.js";

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function chebyshevDistance(left, right) {
  return Math.max(
    Math.abs(left.x - right.x),
    Math.abs(left.y - right.y),
    Math.abs(left.z - right.z),
  );
}

function consecutiveRepeatStreak(pieceId, recentPieceIds) {
  let streak = 0;
  for (const recentId of recentPieceIds) {
    if (recentId !== pieceId) break;
    streak += 1;
  }
  return streak;
}

function defendedPieceIds(board, color) {
  const defended = new Set();
  for (const piece of board.getPiecesByColor(color)) {
    if (piece.type === "king") continue;
    if (isSquareAttacked(board, piece.position, color)) defended.add(piece.id);
  }
  return defended;
}

function activityProfile(board, color) {
  const moves = generateLegalMovesForColor(board, color);
  return {
    activePieceCount: new Set(moves.map((move) => move.pieceId)).size,
    levelCoverageCount: new Set(moves.map((move) => move.to.z)).size,
  };
}

function coordinatedAttackProfile(board, color) {
  const attackersByTarget = new Map();
  for (const move of generateLegalMovesForColor(board, color)) {
    if (!move.capturedPieceId) continue;
    let attackers = attackersByTarget.get(move.capturedPieceId);
    if (!attackers) {
      attackers = new Set();
      attackersByTarget.set(move.capturedPieceId, attackers);
    }
    attackers.add(move.pieceId);
  }

  let coordinatedTargetCount = 0;
  for (const attackers of attackersByTarget.values()) {
    if (attackers.size >= 2) coordinatedTargetCount += 1;
  }
  return { attackersByTarget, coordinatedTargetCount };
}

function emptyAnalysis() {
  return {
    score: 0,
    forcing: false,
    tacticalCapture: false,
    repeatStreak: 0,
    historyUseCount: 0,
    switchedPiece: false,
    freshPiece: false,
    pieceMonopoly: false,
    queenMonopoly: false,
    newlyDefendedPartners: 0,
    movedPieceDefended: false,
    mutualPair: false,
    supportsRecentPiece: false,
    coordinatedTargetDelta: 0,
    movedPieceJointAttack: false,
    undevelopedMinor: false,
    queenEarlyMove: false,
    earlyMajorRepeat: false,
    isolated: false,
    isolatedQueen: false,
    activePieceDelta: 0,
    levelCoverageDelta: 0,
  };
}

export function createTeamPlayBaseline(board, sideToMove, recentPieceIds = []) {
  const own = board.getPiecesByColor(sideToMove);
  const activity = activityProfile(board, sideToMove);
  const attacks = coordinatedAttackProfile(board, sideToMove);
  return {
    defendedPieceIds: defendedPieceIds(board, sideToMove),
    developedMinorCount: own.filter(
      (piece) =>
        (piece.type === "bishop" || piece.type === "knight") && piece.hasMoved,
    ).length,
    recentPieceId: recentPieceIds[0] ?? null,
    recentPieceIds: recentPieceIds.slice(0, 8),
    activePieceCount: activity.activePieceCount,
    levelCoverageCount: activity.levelCoverageCount,
    coordinatedTargetCount: attacks.coordinatedTargetCount,
  };
}

export function scoreTeamPlayFeatures(
  features,
  weights = TEAM_PLAY_WEIGHTS,
) {
  const repeatStreak = features.repeatStreak ?? 0;
  let repetitionPenalty =
    repeatStreak * (weights.repeatLinearPenalty ?? 0) +
    repeatStreak * repeatStreak * (weights.repeatQuadraticPenalty ?? 0);
  let historyPenalty =
    (features.historyUseCount ?? 0) * (weights.historyUsePenalty ?? 0);
  if (features.forcing) {
    repetitionPenalty *= weights.tacticalRepeatMultiplier ?? 0;
    historyPenalty *= weights.tacticalRepeatMultiplier ?? 0;
  }

  let score = -repetitionPenalty - historyPenalty;
  if (features.switchedPiece) score += weights.switchPieceBonus ?? 0;
  if (features.freshPiece) score += weights.freshPieceBonus ?? 0;
  if (features.pieceMonopoly) score -= weights.pieceMonopolyPenalty ?? 0;
  if (features.queenMonopoly) score -= weights.queenMonopolyPenalty ?? 0;
  score +=
    (features.newlyDefendedPartners ?? 0) *
    (weights.newlyDefendedPartnerBonus ?? 0);
  if (features.movedPieceDefended) score += weights.movedPieceDefendedBonus ?? 0;
  if (features.mutualPair) score += weights.mutualPairBonus ?? 0;
  if (features.supportsRecentPiece) score += weights.supportsRecentPieceBonus ?? 0;
  score +=
    (features.coordinatedTargetDelta ?? 0) *
    (weights.coordinatedTargetDeltaBonus ?? 0);
  if (features.movedPieceJointAttack) {
    score += weights.movedPieceJointAttackBonus ?? 0;
  }
  if (features.undevelopedMinor) score += weights.undevelopedMinorBonus ?? 0;
  if (features.queenEarlyMove) score -= weights.queenEarlyMovePenalty ?? 0;
  if (features.earlyMajorRepeat) score -= weights.earlyMajorRepeatPenalty ?? 0;
  if (features.isolated) score -= weights.isolatedMovePenalty ?? 0;
  if (features.isolatedQueen) score -= weights.isolatedQueenPenalty ?? 0;
  score +=
    (features.activePieceDelta ?? 0) * (weights.activePieceDeltaBonus ?? 0);
  score +=
    (features.levelCoverageDelta ?? 0) *
    (weights.levelCoverageDeltaBonus ?? 0);

  return Math.round(clamp(score, -weights.maxTeamBias, weights.maxTeamBias));
}

export function analyzeTeamPlayMove(
  board,
  move,
  recentPieceIds = [],
  weights = TEAM_PLAY_WEIGHTS,
  baseline = null,
) {
  const moving = board.getPieceAt(move.from);
  if (!moving) return emptyAnalysis();

  const resolvedBaseline =
    baseline ?? createTeamPlayBaseline(board, moving.color, recentPieceIds);
  const next = applyMoveForSearch(board, move);
  const movedAfter = next.getAllPieces().find((piece) => piece.id === moving.id);
  if (!movedAfter) return emptyAnalysis();

  const enemy = opposite(moving.color);
  const status = evaluatePosition(next, enemy);
  const promotion = isSearchPromotionMove(board, move);
  const tacticalCapture = Boolean(move.capturedPieceId);

  // A capture is not automatically a forcing line. Treating every capture as
  // forcing allowed a shallow search to keep moving the queen while bypassing
  // all team-play controls. Checks, mates and promotions remain authoritative.
  const forcing = Boolean(
    promotion || status.kind === "check" || status.kind === "checkmate",
  );

  const historyWindow = resolvedBaseline.recentPieceIds ?? recentPieceIds.slice(0, 8);
  const repeatStreak = consecutiveRepeatStreak(moving.id, historyWindow);
  const historyUseCount = historyWindow.filter((id) => id === moving.id).length;
  const switchedPiece = Boolean(
    resolvedBaseline.recentPieceId && resolvedBaseline.recentPieceId !== moving.id,
  );
  const freshPiece = Boolean(
    switchedPiece && !historyWindow.slice(0, 6).includes(moving.id),
  );
  const pieceMonopoly = Boolean(
    !forcing && historyWindow.length >= 4 && historyUseCount >= 3,
  );
  const queenMonopoly = Boolean(
    moving.type === "queen" &&
      !forcing &&
      historyWindow.length >= 3 &&
      historyUseCount >= 2,
  );

  const afterDefended = defendedPieceIds(next, moving.color);
  let newlyDefendedPartners = 0;
  for (const defendedId of afterDefended) {
    if (defendedId === moving.id) continue;
    if (!resolvedBaseline.defendedPieceIds.has(defendedId)) {
      newlyDefendedPartners += 1;
    }
  }

  const movedPieceDefended = afterDefended.has(moving.id);
  const recentAfter = resolvedBaseline.recentPieceId
    ? next.getAllPieces().find(
        (piece) => piece.id === resolvedBaseline.recentPieceId,
      )
    : null;
  const supportsRecentPiece = Boolean(
    switchedPiece &&
      recentAfter &&
      !resolvedBaseline.defendedPieceIds.has(recentAfter.id) &&
      afterDefended.has(recentAfter.id),
  );
  const closePair = Boolean(
    switchedPiece &&
      recentAfter &&
      chebyshevDistance(movedAfter.position, recentAfter.position) <= 2,
  );
  const mutualPair = Boolean(
    closePair &&
      movedPieceDefended &&
      recentAfter &&
      afterDefended.has(recentAfter.id),
  );

  const afterAttacks = coordinatedAttackProfile(next, moving.color);
  const coordinatedTargetDelta = clamp(
    afterAttacks.coordinatedTargetCount -
      (resolvedBaseline.coordinatedTargetCount ?? 0),
    -4,
    4,
  );
  const movedPieceJointAttack = [...afterAttacks.attackersByTarget.values()].some(
    (attackers) => attackers.has(moving.id) && attackers.size >= 2,
  );

  const afterActivity = activityProfile(next, moving.color);
  const activePieceDelta = clamp(
    afterActivity.activePieceCount - resolvedBaseline.activePieceCount,
    -4,
    4,
  );
  const levelCoverageDelta = clamp(
    afterActivity.levelCoverageCount - resolvedBaseline.levelCoverageCount,
    -4,
    4,
  );
  const isolated = Boolean(
    !forcing &&
      !movedPieceDefended &&
      newlyDefendedPartners === 0 &&
      !supportsRecentPiece &&
      !movedPieceJointAttack &&
      activePieceDelta <= 0 &&
      levelCoverageDelta <= 0,
  );
  const undevelopedMinor = Boolean(
    !moving.hasMoved &&
      (moving.type === "bishop" || moving.type === "knight"),
  );
  const queenEarlyMove = Boolean(
    moving.type === "queen" &&
      resolvedBaseline.developedMinorCount < 2 &&
      !forcing,
  );
  const earlyMajorRepeat = Boolean(
    repeatStreak > 0 &&
      (moving.type === "queen" || moving.type === "rook") &&
      resolvedBaseline.developedMinorCount < 2 &&
      !forcing,
  );
  const isolatedQueen = Boolean(
    moving.type === "queen" &&
      !forcing &&
      !movedPieceDefended &&
      !movedPieceJointAttack &&
      coordinatedTargetDelta <= 0,
  );

  const features = {
    forcing,
    tacticalCapture,
    repeatStreak,
    historyUseCount,
    switchedPiece,
    freshPiece,
    pieceMonopoly,
    queenMonopoly,
    newlyDefendedPartners,
    movedPieceDefended,
    mutualPair,
    supportsRecentPiece,
    coordinatedTargetDelta,
    movedPieceJointAttack,
    undevelopedMinor,
    queenEarlyMove,
    earlyMajorRepeat,
    isolated,
    isolatedQueen,
    activePieceDelta,
    levelCoverageDelta,
  };

  return {
    ...features,
    score: scoreTeamPlayFeatures(features, weights),
    recentPieceId: resolvedBaseline.recentPieceId,
    movingPieceId: moving.id,
    movingPieceType: moving.type,
  };
}

function quietThirdRepeat(candidate) {
  return Boolean(
    candidate &&
      !candidate.team?.forcing &&
      (candidate.team?.repeatStreak ?? 0) >= 2,
  );
}

function quietMonopoly(candidate, field) {
  return Boolean(candidate && !candidate.team?.forcing && candidate.team?.[field]);
}

/**
 * Alpha-Beta remains authoritative outside a narrow strategic equivalence band.
 * Within that band, moves that coordinate several pieces beat another unsupported
 * queen excursion. Checks, mates and promotions use raw search score first.
 */
export function chooseTeamAwareRootCandidate(
  current,
  candidate,
  weights = TEAM_PLAY_WEIGHTS,
) {
  if (!current) return candidate;

  const eitherForcing = current.team.forcing || candidate.team.forcing;
  const difference = candidate.searchScore - current.searchScore;
  if (eitherForcing) {
    if (difference > 0) return candidate;
    if (difference < 0) return current;
    return candidate.team.score > current.team.score ? candidate : current;
  }

  // A quiet third consecutive move with the same piece is a team-play defect,
  // not merely a small style penalty. When any non-repeating legal alternative
  // exists, the repeated move cannot win the root tie-break.
  const currentThirdRepeat = quietThirdRepeat(current);
  const candidateThirdRepeat = quietThirdRepeat(candidate);
  if (currentThirdRepeat !== candidateThirdRepeat) {
    return currentThirdRepeat ? candidate : current;
  }

  // Queen monopoly gets a wider discipline window than ordinary positional
  // variety. This still preserves a clearly superior search result, but blocks
  // another unsupported queen excursion when a reasonable squad move exists.
  const currentQueenMonopoly = quietMonopoly(current, "queenMonopoly");
  const candidateQueenMonopoly = quietMonopoly(candidate, "queenMonopoly");
  if (
    currentQueenMonopoly !== candidateQueenMonopoly &&
    Math.abs(difference) <= weights.rootScoreWindow * 2
  ) {
    return currentQueenMonopoly ? candidate : current;
  }

  const currentPieceMonopoly = quietMonopoly(current, "pieceMonopoly");
  const candidatePieceMonopoly = quietMonopoly(candidate, "pieceMonopoly");
  if (
    currentPieceMonopoly !== candidatePieceMonopoly &&
    Math.abs(difference) <= weights.rootScoreWindow
  ) {
    return currentPieceMonopoly ? candidate : current;
  }

  if (difference > weights.rootScoreWindow) return candidate;
  if (difference < -weights.rootScoreWindow) return current;
  if (candidate.team.score !== current.team.score) {
    return candidate.team.score > current.team.score ? candidate : current;
  }
  return difference > 0 ? candidate : current;
}
