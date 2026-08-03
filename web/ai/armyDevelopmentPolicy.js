import {
  evaluatePosition,
  isSquareAttacked,
} from "../../src/engine3d/index.ts";
import {
  applyMoveForSearch,
  isSearchPromotionMove,
  opposite,
} from "./searchEngine.js";

const NON_KING_TYPES = new Set(["pawn", "knight", "bishop", "rook", "queen"]);

function numericCount(counts, pieceId) {
  const value = Number(counts?.[pieceId] ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function roleSet(board, color, usageCounts) {
  const roles = new Set();
  for (const piece of board.getPiecesByColor(color)) {
    if (!NON_KING_TYPES.has(piece.type)) continue;
    if (numericCount(usageCounts, piece.id) > 0) roles.add(piece.type);
  }
  return roles;
}

export function createArmyDevelopmentBaseline(
  board,
  color,
  usageCounts = {},
) {
  const own = board
    .getPiecesByColor(color)
    .filter((piece) => piece.type !== "king");
  const usedPieceIds = new Set(
    own
      .filter((piece) => numericCount(usageCounts, piece.id) > 0)
      .map((piece) => piece.id),
  );
  const totalUsage = own.reduce(
    (sum, piece) => sum + numericCount(usageCounts, piece.id),
    0,
  );
  const leastUsage = own.length
    ? Math.min(...own.map((piece) => numericCount(usageCounts, piece.id)))
    : 0;

  return {
    usageCounts,
    armySize: own.length,
    usedPieceIds,
    usedPieceCount: usedPieceIds.size,
    usedRoles: roleSet(board, color, usageCounts),
    totalUsage,
    leastUsage,
    developedMinorCount: own.filter(
      (piece) =>
        (piece.type === "bishop" || piece.type === "knight") && piece.hasMoved,
    ).length,
  };
}

export function analyzeArmyDevelopmentMove(
  board,
  move,
  usageCounts = {},
  baseline = null,
) {
  const moving = board.getPieceAt(move.from);
  if (!moving) {
    return {
      score: 0,
      activatesFreshUnit: false,
      queenArmyImbalance: false,
      broadensArmy: false,
      newRole: false,
      lifetimeUseCount: 0,
    };
  }

  const resolved =
    baseline ?? createArmyDevelopmentBaseline(board, moving.color, usageCounts);
  const next = applyMoveForSearch(board, move);
  const movedAfter = next
    .getAllPieces()
    .find((piece) => piece.id === moving.id);
  const status = evaluatePosition(next, opposite(moving.color));
  const forcing = Boolean(
    isSearchPromotionMove(board, move) ||
      status.kind === "check" ||
      status.kind === "checkmate",
  );
  const tacticalCapture = Boolean(move.capturedPieceId);
  const lifetimeUseCount = numericCount(resolved.usageCounts, moving.id);
  const activatesFreshUnit = lifetimeUseCount === 0;
  const underusedUnit = lifetimeUseCount <= resolved.leastUsage;
  const newRole = !resolved.usedRoles.has(moving.type);
  const movedPieceDefended = Boolean(
    movedAfter &&
      movedAfter.type !== "king" &&
      isSquareAttacked(next, movedAfter.position, moving.color),
  );
  // Active-piece and level deltas already come from analyzeTeamPlayMove and are
  // retained by combineTeamAndArmyAnalysis. Recomputing all legal moves here
  // doubled root-evaluation work on the 512-cell board.
  const broadensArmy = Boolean(activatesFreshUnit || newRole);

  const averageUsage =
    resolved.usedPieceCount > 0
      ? resolved.totalUsage / resolved.usedPieceCount
      : 0;
  const armyStillNarrow = resolved.usedPieceCount < Math.min(6, resolved.armySize);
  const queenArmyImbalance = Boolean(
    moving.type === "queen" &&
      !forcing &&
      !tacticalCapture &&
      armyStillNarrow &&
      lifetimeUseCount >= Math.max(1, Math.ceil(averageUsage)),
  );

  let score = 0;
  if (activatesFreshUnit) score += 110;
  if (underusedUnit && !activatesFreshUnit) score += 34;
  if (newRole) score += 42;
  if (movedPieceDefended) score += 24;
  if (!moving.hasMoved && (moving.type === "knight" || moving.type === "bishop")) {
    score += 72;
  }
  if (!moving.hasMoved && moving.type === "pawn") score += 20;
  if (queenArmyImbalance) score -= 260;
  if (
    moving.type === "rook" &&
    !forcing &&
    resolved.developedMinorCount < 2
  ) {
    score -= 70;
  }

  return {
    score,
    forcing,
    tacticalCapture,
    activatesFreshUnit,
    underusedUnit,
    newRole,
    broadensArmy,
    queenArmyImbalance,
    lifetimeUseCount,
    usedPieceCount: resolved.usedPieceCount,
    armySize: resolved.armySize,
    movingPieceType: moving.type,
  };
}

export function combineTeamAndArmyAnalysis(team, army) {
  return {
    ...team,
    ...army,
    queenMonopoly: Boolean(team?.queenMonopoly || army?.queenArmyImbalance),
    freshPiece: Boolean(team?.freshPiece || army?.activatesFreshUnit),
    broadensArmy: Boolean(
      army?.broadensArmy || Number(team?.activePieceDelta ?? 0) > 0,
    ),
    score: Number(team?.score ?? 0) + Number(army?.score ?? 0),
    teamScore: Number(team?.score ?? 0),
    armyScore: Number(army?.score ?? 0),
  };
}
