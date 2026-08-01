import {
  generateLegalMovesForColor,
  isSquareAttacked,
} from "../../src/engine3d/index.ts";
import { PIECE_VALUES, opposite } from "./searchEngine.js";

const NON_KING_STARTING_MATERIAL = 8 * 100 + 2 * 320 + 2 * 340 + 2 * 500 + 900;

function centerScore(position) {
  const distance =
    Math.abs(position.x - 3.5) +
    Math.abs(position.y - 3.5) +
    Math.abs(position.z - 3.5);
  return Math.max(0, Math.round(54 - distance * 5));
}

function phaseOf(board) {
  let remaining = 0;
  for (const piece of board.getAllPieces()) {
    if (piece.type === "king" || piece.type === "pawn") continue;
    remaining += PIECE_VALUES[piece.type] ?? 0;
  }
  const bothSides = 2 * (NON_KING_STARTING_MATERIAL - 8 * 100);
  return Math.max(0, Math.min(1, remaining / bothSides));
}

function pawnAdvance(piece) {
  return piece.color === "white" ? piece.position.y : 7 - piece.position.y;
}

function movementProgress(piece, connected) {
  if (piece.type !== "pawn") return 0;
  const forward = pawnAdvance(piece);
  const usefulAdvance = Math.min(forward, 3) * 4 + Math.min(piece.position.z, 2) * 3;
  const overextension = Math.max(0, forward - 3) + Math.max(0, piece.position.z - 2);
  return usefulAdvance - (connected ? overextension * 5 : overextension * 24);
}

function pawnStructure(pieces, color) {
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
    score += connected ? 14 : -9;
    score += movementProgress(pawn, connected);
  }
  return score;
}

function kingSafety(board, color, openingPhase) {
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

  const enemyMoves = generateLegalMovesForColor(board, opposite(color));
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
  let score = 0;
  let developedMinor = 0;
  for (const piece of pieces) {
    if (piece.color !== color) continue;
    if (piece.type === "bishop" || piece.type === "knight") {
      if (piece.hasMoved) {
        developedMinor += 1;
        score += 44;
      } else {
        score -= Math.round(28 * openingPhase);
      }
    }
    if (piece.type === "queen" && piece.hasMoved && developedMinor < 2) {
      score -= Math.round(95 * openingPhase);
    }
    if (piece.type === "rook" && piece.hasMoved) score += 10;
  }
  score += Math.round(developedMinor * developedMinor * 12 * openingPhase);
  return score;
}

function activityScore(board, color) {
  const moves = generateLegalMovesForColor(board, color);
  const active = new Set(moves.map((move) => move.pieceId)).size;
  const levels = new Set(moves.map((move) => move.to.z)).size;
  return moves.length * 2 + active * 16 + levels * 7;
}

function tacticalIntegrity(board, color) {
  const enemy = opposite(color);
  let score = 0;
  for (const piece of board.getAllPieces()) {
    if (piece.color !== color || piece.type === "king") continue;
    const attacked = isSquareAttacked(board, piece.position, enemy);
    const defended = isSquareAttacked(board, piece.position, color);
    const value = PIECE_VALUES[piece.type] ?? 0;
    if (attacked && !defended) score -= Math.round(value * 0.72);
    else if (attacked && defended) score -= Math.round(value * 0.12);
    else if (defended) score += Math.round(value * 0.035);
  }
  return score;
}

function sideScore(board, color) {
  const pieces = board.getAllPieces();
  const openingPhase = phaseOf(board);
  let score = 0;

  for (const piece of pieces) {
    if (piece.color !== color) continue;
    score += PIECE_VALUES[piece.type] ?? 0;
    if (piece.type !== "king") score += centerScore(piece.position);
  }

  score += pawnStructure(pieces, color);
  score += developmentScore(pieces, color, openingPhase);
  score += activityScore(board, color);
  score += kingSafety(board, color, openingPhase);
  score += tacticalIntegrity(board, color);
  return score;
}

export function evaluateStrategicPosition(board, perspective) {
  return sideScore(board, perspective) - sideScore(board, opposite(perspective));
}

export function strategicMoveBias(board, move, recentPieceIds = []) {
  const pieces = board.getAllPieces();
  const moving = pieces.find((piece) => piece.id === move.pieceId);
  if (!moving) return 0;

  const before = sideScore(board, moving.color);
  const next = board.clone();
  next.applyMove(move);
  const after = sideScore(next, moving.color);
  let score = Math.round((after - before) * 0.5);

  const tactical = Boolean(move.capturedPieceId || move.kind === "promotion");
  const repeats = recentPieceIds.filter((id) => id === move.pieceId).length;
  if (!tactical) score -= repeats * 26;

  if (move.capturedPieceId) {
    const victim = pieces.find((piece) => piece.id === move.capturedPieceId);
    if (victim) score += (PIECE_VALUES[victim.type] ?? 0) - Math.round((PIECE_VALUES[moving.type] ?? 0) * 0.08);
  }

  const movedAfter = next.getAllPieces().find((piece) => piece.id === move.pieceId);
  if (movedAfter && movedAfter.type !== "king") {
    const attacked = isSquareAttacked(next, movedAfter.position, opposite(moving.color));
    const defended = isSquareAttacked(next, movedAfter.position, moving.color);
    if (attacked && !defended) score -= Math.round((PIECE_VALUES[moving.type] ?? 0) * 0.85);
  }
  return score;
}
