import type { Move, Piece, Position } from "./types.js";

export function applyMove(position: Position, move: Move): Position {
  const moving = position.pieces.get(move.pieceId);
  if (!moving) throw new Error(`Unknown piece ${move.pieceId}`);
  const next = new Map(position.pieces);
  if (move.capturedPieceId) next.delete(move.capturedPieceId);
  const updated: Piece = {
    ...moving,
    position: move.to,
    hasMoved: true,
    ...(move.promotion ? { type: move.promotion } : {}),
  };
  next.set(updated.id, updated);
  return {
    sideToMove: position.sideToMove === "white" ? "black" : "white",
    pieces: next,
  };
}
