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

export function analyzeTeamPlayMove(
  board,
  move,
  recentPieceIds = [],
  weights = TEAM_PLAY_WEIGHTS,
  baseline = createTeamPlayBaseline(board, board.getPieceAt(move.from)?.color, recentPieceIds),
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
    baseline.recentPieceId && baseline.recentPieceId !== moving.id,
  );
  const afterDefended = defendedPieceIds(next, moving.color);
  let newlyDefendedPartners = 0;
  for (const defendedId of afterDefended) {
    if (defendedId === moving.id) continue;
    if (!baseline.defendedPieceIds.has(defendedId)) newlyDefendedPartners += 1;
  }

  const movedPieceDefended = afterDefended.has(moving.id);
  const recentBefore = baseline.recentPieceId
    ? board.getAllPieces().find((piece) => piece.id === baseline.recentPieceId)
    : null;
  const recentAfter = baseline.recentPieceId
    ? next.getAllPieces().find((piece) => piece.id === baseline.recentPieceId)
    : null;
  const supportsRecentPiece = Boolean(
    switchedPiece &&
      recentAfter &&
      !baseline.defendedPieceIds.has(recentAfter.id) &&
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

  let repetitionPenalty =
    repeatStreak * weights.repeatLinearPenalty +
    repeatStreak * repeatStreak * weights.repeatQuadraticPenalty;
  if (forcing) repetitionPenalty *= weights.tacticalRepeatMultiplier;

  let score = -repetitionPenalty;
  if (switchedPiece) score += weights.switchPieceBonus;
  score += newlyDefendedPartners * weights.newlyDefendedPartnerBonus;
  if (movedPieceDefended) score += weights.movedPieceDefendedBonus;
  if (mutualPair) score += weights.mutualPairBonus;
  if (supportsRecentPiece) score += weights.supportsRecentPieceBonus;
  if (
    !moving.hasMoved &&
    (moving.type === "bishop" || moving.type === "knight")
  ) {
    score += weights.undevelopedMinorBonus;
  }
  if (
    repeatStreak > 0 &&
    (moving.type === "queen" || moving.type === "rook") &&
    baseline.developedMinorCount < 2 &&
    !forcing
  ) {
    score -= weights.earlyMajorRepeatPenalty;
  }
  if (isolated) score -= weights.isolatedMovePenalty;

  return {
    score: Math.round(clamp(score, -weights.maxTeamBias, weights.maxTeamBias)),
    forcing,
    repeatStreak,
    switchedPiece,
    newlyDefendedPartners,
    movedPieceDefended,
    mutualPair,
    supportsRecentPiece,
    isolated,
    recentPieceId: baseline.recentPieceId,
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
