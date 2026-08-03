import {
  generateLegalMovesForColor,
  isSquareAttacked,
} from "../../src/engine3d/index.ts";
import {
  applyMoveForSearch,
  PIECE_VALUES,
  opposite,
} from "./searchEngine.js";

const NON_KING_STARTING_MATERIAL =
  8 * PIECE_VALUES.pawn +
  2 * PIECE_VALUES.knight +
  2 * PIECE_VALUES.bishop +
  2 * PIECE_VALUES.rook +
  PIECE_VALUES.queen;

function centerScore(position) {
  const distance =
    Math.abs(position.x - 3.5) +
    Math.abs(position.y - 3.5) +
    Math.abs(position.z - 3.5);
  return Math.max(0, Math.round(54 - distance * 5));
}

function centerWeight(type) {
  if (type === "pawn") return 0.35;
  if (type === "rook") return 0.55;
  if (type === "queen") return 0.65;
  if (type === "bishop") return 0.85;
  if (type === "knight") return 1;
  return 0;
}

function phaseOf(board) {
  let remaining = 0;
  for (const piece of board.getAllPieces()) {
    if (piece.type === "king" || piece.type === "pawn") continue;
    remaining += PIECE_VALUES[piece.type] ?? 0;
  }
  const bothSides = 2 * (NON_KING_STARTING_MATERIAL - 8 * PIECE_VALUES.pawn);
  return Math.max(0, Math.min(1, remaining / bothSides));
}

function buildMoveCache(board) {
  return {
    white: generateLegalMovesForColor(board, "white"),
    black: generateLegalMovesForColor(board, "black"),
  };
}

function movesFor(board, color, moveCache) {
  return moveCache?.[color] ?? generateLegalMovesForColor(board, color);
}

function pawnAdvance(piece) {
  return piece.color === "white" ? piece.position.y : 7 - piece.position.y;
}

function pawnPromotionDistance(piece) {
  const finalRank = piece.color === "white" ? 7 : 0;
  const rankDistance = Math.abs(finalRank - piece.position.y);
  const levelDistance = 7 - piece.position.z;
  return Math.min(rankDistance, levelDistance);
}

function movementProgress(piece, connected, defended, attacked) {
  if (piece.type !== "pawn") return 0;

  const forward = pawnAdvance(piece);
  const height = piece.position.z;
  const usefulAdvance = Math.min(forward, 3) * 4 + Math.min(height, 2) * 4;
  const overextension = Math.max(0, forward - 3) + Math.max(0, height - 2);
  let score = usefulAdvance - overextension * (connected ? 6 : 22);

  if (attacked && !defended) score -= 24 + overextension * 14;
  const promotionDistance = pawnPromotionDistance(piece);
  if (defended && promotionDistance <= 2) score += (3 - promotionDistance) * 24;
  return score;
}

function pawnStructure(board, pieces, color) {
  const pawns = pieces.filter((piece) => piece.color === color && piece.type === "pawn");
  const files = new Map();
  for (const pawn of pawns) {
    const key = `${pawn.position.x}:${pawn.position.z}`;
    files.set(key, (files.get(key) ?? 0) + 1);
  }

  let score = 0;
  for (const pawn of pawns) {
    const key = `${pawn.position.x}:${pawn.position.z}`;
    const doubled = files.get(key) ?? 0;
    if (doubled > 1) score -= (doubled - 1) * 18;

    let connected = false;
    for (const other of pawns) {
      if (other.id === pawn.id) continue;
      const dx = Math.abs(other.position.x - pawn.position.x);
      const dz = Math.abs(other.position.z - pawn.position.z);
      const dy = Math.abs(other.position.y - pawn.position.y);
      if (dx <= 1 && dz <= 1 && dy <= 1) {
        connected = true;
        break;
      }
    }

    const attacked = isSquareAttacked(board, pawn.position, opposite(color));
    const defended = isSquareAttacked(board, pawn.position, color);
    score += connected ? 14 : -9;
    score += movementProgress(pawn, connected, defended, attacked);
  }
  return score;
}

function kingSafety(board, color, openingPhase, moveCache) {
  const pieces = board.getAllPieces();
  const king = pieces.find((piece) => piece.color === color && piece.type === "king");
  if (!king) return -100_000;

  let shield = 0;
  let enemyPressure = 0;
  for (const piece of pieces) {
    if (piece.id === king.id) continue;
    const dx = Math.abs(piece.position.x - king.position.x);
    const dy = Math.abs(piece.position.y - king.position.y);
    const dz = Math.abs(piece.position.z - king.position.z);
    if (Math.max(dx, dy, dz) > 1) continue;
    if (piece.color === color) shield += piece.type === "pawn" ? 20 : 8;
  }

  const enemyMoves = movesFor(board, opposite(color), moveCache);
  for (const move of enemyMoves) {
    const dx = Math.abs(move.to.x - king.position.x);
    const dy = Math.abs(move.to.y - king.position.y);
    const dz = Math.abs(move.to.z - king.position.z);
    if (Math.max(dx, dy, dz) <= 1) enemyPressure += 9;
  }

  const kingCenterPenalty = centerScore(king.position) * openingPhase * 0.7;
  return Math.round(shield - enemyPressure - kingCenterPenalty);
}

function developmentScore(pieces, color, openingPhase) {
  const own = pieces.filter((piece) => piece.color === color);
  const minorPieces = own.filter(
    (piece) => piece.type === "bishop" || piece.type === "knight",
  );
  const developedMinor = minorPieces.filter((piece) => piece.hasMoved).length;
  let score = 0;

  for (const piece of minorPieces) {
    score += piece.hasMoved ? 44 : -Math.round(28 * openingPhase);
  }

  const queen = own.find((piece) => piece.type === "queen");
  if (queen?.hasMoved && developedMinor < 2) {
    score -= Math.round(95 * openingPhase);
  }

  for (const rook of own.filter((piece) => piece.type === "rook" && piece.hasMoved)) {
    score += developedMinor >= 2 ? 12 : -Math.round(30 * openingPhase);
  }

  score += Math.round(developedMinor * developedMinor * 12 * openingPhase);
  return score;
}

function activityScore(board, color, moveCache) {
  const moves = movesFor(board, color, moveCache);
  const active = new Set(moves.map((move) => move.pieceId)).size;
  const levels = new Set(moves.map((move) => move.to.z)).size;
  return moves.length + active * 18 + levels * 10;
}

function chebyshevDistance(left, right) {
  return Math.max(
    Math.abs(left.x - right.x),
    Math.abs(left.y - right.y),
    Math.abs(left.z - right.z),
  );
}

/**
 * Symmetric cooperation score used inside every Alpha-Beta leaf evaluation.
 * Root-level diversity remains a tie-break, but the search itself now values a
 * network of active, defended pieces that control several levels together.
 */
export function evaluateTeamCoordination(board, color, moveCache = null) {
  const pieces = board.getAllPieces();
  const own = pieces.filter((piece) => piece.color === color);
  const ownMoves = movesFor(board, color, moveCache);
  const enemyKing = pieces.find(
    (piece) => piece.color === opposite(color) && piece.type === "king",
  );

  const activePieceIds = new Set();
  const reachableSquares = new Set();
  const activeByLevel = new Map();
  const attackersByTarget = new Map();
  const kingPressurePieces = new Set();

  for (const move of ownMoves) {
    activePieceIds.add(move.pieceId);
    reachableSquares.add(`${move.to.x},${move.to.y},${move.to.z}`);
    let levelPieces = activeByLevel.get(move.to.z);
    if (!levelPieces) {
      levelPieces = new Set();
      activeByLevel.set(move.to.z, levelPieces);
    }
    levelPieces.add(move.pieceId);

    if (move.capturedPieceId) {
      let attackers = attackersByTarget.get(move.capturedPieceId);
      if (!attackers) {
        attackers = new Set();
        attackersByTarget.set(move.capturedPieceId, attackers);
      }
      attackers.add(move.pieceId);
    }

    if (enemyKing && chebyshevDistance(move.to, enemyKing.position) <= 2) {
      kingPressurePieces.add(move.pieceId);
    }
  }

  let score = 0;
  let defendedPieces = 0;
  let defendedMajors = 0;
  let isolatedMajors = 0;
  for (const piece of own) {
    if (piece.type === "king") continue;
    const defended = isSquareAttacked(board, piece.position, color);
    if (defended) {
      defendedPieces += 1;
      if (piece.type === "queen" || piece.type === "rook") defendedMajors += 1;
    } else if (piece.type === "queen" || piece.type === "rook") {
      isolatedMajors += 1;
    }
  }

  let coordinatedTargets = 0;
  for (const attackers of attackersByTarget.values()) {
    if (attackers.size >= 2) coordinatedTargets += 1;
  }

  let squadLevels = 0;
  for (const levelPieces of activeByLevel.values()) {
    if (levelPieces.size >= 2) squadLevels += 1;
  }

  score += defendedPieces * 9;
  score += defendedMajors * 12;
  score -= isolatedMajors * 34;
  score += Math.max(0, activePieceIds.size - 1) * 12;
  score += coordinatedTargets * 46;
  score += squadLevels * 14;
  score += kingPressurePieces.size * 11;
  score += Math.min(72, Math.round(reachableSquares.size * 0.35));
  return score;
}

function tacticalIntegrity(board, color) {
  const enemy = opposite(color);
  let score = 0;
  for (const piece of board.getAllPieces()) {
    if (piece.color !== color || piece.type === "king") continue;
    const attacked = isSquareAttacked(board, piece.position, enemy);
    const defended = isSquareAttacked(board, piece.position, color);
    const value = PIECE_VALUES[piece.type] ?? 0;
    if (attacked && !defended) score -= Math.round(value * 0.95);
    else if (attacked && defended) score -= Math.round(value * 0.18);
    else if (defended) score += Math.round(value * 0.025);
  }
  return score;
}

function exchangeLiability(board, color, moveCache) {
  const pieces = new Map(board.getAllPieces().map((piece) => [piece.id, piece]));
  const worstByVictim = new Map();

  for (const move of movesFor(board, opposite(color), moveCache)) {
    if (!move.capturedPieceId) continue;
    const victim = pieces.get(move.capturedPieceId);
    const attacker = pieces.get(move.pieceId);
    if (!victim || !attacker || victim.color !== color || victim.type === "king") continue;

    const victimValue = PIECE_VALUES[victim.type] ?? 0;
    const attackerValue = PIECE_VALUES[attacker.type] ?? 0;
    const defended = isSquareAttacked(board, victim.position, color);
    const unfavorableDifference = Math.max(0, victimValue - attackerValue);
    const risk = defended
      ? Math.round(unfavorableDifference * 0.38 + victimValue * 0.06)
      : Math.round(unfavorableDifference * 0.9 + victimValue * 0.3);
    worstByVictim.set(victim.id, Math.max(worstByVictim.get(victim.id) ?? 0, risk));
  }

  let score = 0;
  for (const risk of worstByVictim.values()) score -= risk;
  return score;
}

function sideScore(board, color, moveCache = null) {
  const pieces = board.getAllPieces();
  const openingPhase = phaseOf(board);
  let score = 0;

  for (const piece of pieces) {
    if (piece.color !== color) continue;
    score += PIECE_VALUES[piece.type] ?? 0;
    if (piece.type !== "king") {
      score += Math.round(centerScore(piece.position) * centerWeight(piece.type));
    }
  }

  score += pawnStructure(board, pieces, color);
  score += developmentScore(pieces, color, openingPhase);
  score += activityScore(board, color, moveCache);
  score += evaluateTeamCoordination(board, color, moveCache);
  score += kingSafety(board, color, openingPhase, moveCache);
  score += tacticalIntegrity(board, color);
  score += exchangeLiability(board, color, moveCache);
  return score;
}

export function evaluateStrategicPosition(board, perspective) {
  const moveCache = buildMoveCache(board);
  return (
    sideScore(board, perspective, moveCache) -
    sideScore(board, opposite(perspective), moveCache)
  );
}

export function strategicMoveBias(board, move, recentPieceIds = []) {
  const pieces = board.getAllPieces();
  const moving = pieces.find((piece) => piece.id === move.pieceId);
  if (!moving) return 0;

  const before = sideScore(board, moving.color, buildMoveCache(board));
  const next = applyMoveForSearch(board, move);
  const after = sideScore(next, moving.color, buildMoveCache(next));
  let score = Math.round((after - before) * 0.5);

  const movedAfter = next.getAllPieces().find((piece) => piece.id === move.pieceId);
  const promoted = moving.type === "pawn" && movedAfter?.type !== "pawn";
  const tactical = Boolean(move.capturedPieceId || promoted);
  const repeats = recentPieceIds.filter((id) => id === move.pieceId).length;
  if (!tactical) score -= repeats * 26;

  if (move.capturedPieceId) {
    const victim = pieces.find((piece) => piece.id === move.capturedPieceId);
    if (victim) {
      score += (PIECE_VALUES[victim.type] ?? 0) - Math.round((PIECE_VALUES[moving.type] ?? 0) * 0.12);
    }
  }

  if (promoted) score += PIECE_VALUES.queen - PIECE_VALUES.pawn;

  if (movedAfter && movedAfter.type !== "king") {
    const attacked = isSquareAttacked(next, movedAfter.position, opposite(moving.color));
    const defended = isSquareAttacked(next, movedAfter.position, moving.color);
    const movedValue = PIECE_VALUES[movedAfter.type] ?? 0;
    if (attacked && !defended) score -= Math.round(movedValue * 1.05);
    else if (attacked && defended) score -= Math.round(movedValue * 0.15);
  }
  return score;
}
