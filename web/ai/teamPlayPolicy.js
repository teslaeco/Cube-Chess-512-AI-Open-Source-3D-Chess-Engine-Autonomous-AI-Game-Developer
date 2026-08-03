import {
  evaluatePosition,
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

export function createTeamPlayBaseline(board, sideToMove, recentPieceIds = []) {
  const own = board.getPiecesByColor(sideToMove);
  return {
    defendedPieceIds: defendedPieceIds(board, sideToMove),
    developedMinorCount: own.filter(
      (piece) =>
        (piece.type === "bishop" || piece.type === "knight") && piece.hasMoved,
    ).length,
    recentPieceId: recentPieceIds[0] ?? null,
  };
}

export function scoreTeamPlayFeatures(
  features,
  weights = TEAM_PLAY_WEIGHTS,
) {
  let repetitionPenalty =
    features.repeatStreak * weights.repeatLinearPenalty +
    features.repeatStreak * features.repeatStreak * weights.repeatQuadraticPenalty;
  if (features.forcing) repetitionPenalty *= weights.tacticalRepeatMultiplier;

  let score = -repetitionPenalty;
  if (features.switchedPiece) score += weights.switchPieceBonus;
  score +=
    features.newlyDefendedPartners * weights.newlyDefendedPartnerBonus;
  if (features.movedPieceDefended) score += weights.movedPieceDefendedBonus;
  if (features.mutualPair) score += weights.mutualPairBonus;
  if (features.supportsRecentPiece) score += weights.supportsRecentPieceBonus;
  if (features.undevelopedMinor) score += weights.undevelopedMinorBonus;
  if (features.earlyMajorRepeat) score -= weights.earlyMajorRepeatPenalty;
  if (features.isolated) score -= weights.isolatedMovePenalty;

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
  if (!moving) {
    return {
      score: 0,
      forcing: false,
      repeatStreak: 0,
      switchedPiece: false,
      newlyDefendedPartners: 0,
      mutualPair: false,
      supportsRecentPiece: false,
      isolated: false,
    };
  }

  const resolvedBaseline =
    baseline ?? createTeamPlayBaseline(board, moving.color, recentPieceIds);
  const next = applyMoveForSearch(board, move);
  const movedAfter = next.getAllPieces().find((piece) => piece.id === moving.id);
  if (!movedAfter) {
    return {
      score: 0,
      forcing: false,
      repeatStreak: 0,
      switchedPiece: false,
      newlyDefendedPartners: 0,
      mutualPair: false,
      supportsRecentPiece: false,
      isolated: false,
    };
  }

  const enemy = opposite(moving.color);
  const status = evaluatePosition(next, enemy);
  const promotion = isSearchPromotionMove(board, move);
  const forcing = Boolean(
    move.capturedPieceId ||
      promotion ||
      status.kind === "check" ||
      status.kind === "checkmate",
  );

  const repeatStreak = consecutiveRepeatStreak(moving.id, recentPieceIds);
  const switchedPiece = Boolean(
    resolvedBaseline.recentPieceId && resolvedBaseline.recentPieceId !== moving.id,
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
  const isolated = Boolean(
    !forcing &&
      !movedPieceDefended &&
      newlyDefendedPartners === 0 &&
      !supportsRecentPiece,
  );
  const undevelopedMinor = Boolean(
    !moving.hasMoved &&
      (moving.type === "bishop" || moving.type === "knight"),
  );
  const earlyMajorRepeat = Boolean(
    repeatStreak > 0 &&
      (moving.type === "queen" || moving.type === "rook") &&
      resolvedBaseline.developedMinorCount < 2 &&
      !forcing,
  );

  const features = {
    forcing,
    repeatStreak,
    switchedPiece,
    newlyDefendedPartners,
    movedPieceDefended,
    mutualPair,
    supportsRecentPiece,
    undevelopedMinor,
    earlyMajorRepeat,
    isolated,
  };

  return {
    ...features,
    score: scoreTeamPlayFeatures(features, weights),
    recentPieceId: resolvedBaseline.recentPieceId,
    movingPieceId: moving.id,
  };
}

/**
 * Alpha-Beta remains authoritative outside a narrow strategic equivalence band.
 * Within that band, quiet moves that coordinate several pieces beat another
 * unsupported move of the same piece. Forcing moves use the raw search score
 * first and only use team play as an exact-score tie-break.
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

  if (difference > weights.rootScoreWindow) return candidate;
  if (difference < -weights.rootScoreWindow) return current;
  if (candidate.team.score !== current.team.score) {
    return candidate.team.score > current.team.score ? candidate : current;
  }
  return difference > 0 ? candidate : current;
}
