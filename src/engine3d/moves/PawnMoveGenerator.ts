import type { Board3D } from "../board/Board3D.js";
import type { Piece } from "../pieces/Piece.js";
import type { Vector } from "./DirectionVectors.js";
import type { Move } from "./Move.js";
import { createMove } from "./MoveFactory.js";

export function generatePawnMoves(board: Board3D, piece: Piece): Move[] {
  const rankDirection = piece.color === "white" ? 1 : -1;
  // Both armies start on level A. Height progression is therefore always
  // A -> H, independently from the classical rank direction.
  const heightDirection = 1;
  const moves: Move[] = [];

  const advanceVectors: readonly Vector[] = [
    [0, rankDirection, 0],
    [0, 0, heightDirection],
  ];

  for (const vector of advanceVectors) {
    const to = piece.position.tryAdd(...vector);
    if (to && board.isEmpty(to)) {
      moves.push(createMove(piece, to));
    }
  }

  const middle = piece.position.tryAdd(0, rankDirection, 0);
  const twice = piece.position.tryAdd(0, rankDirection * 2, 0);
  if (
    !piece.hasMoved &&
    middle &&
    twice &&
    board.isEmpty(middle) &&
    board.isEmpty(twice)
  ) {
    moves.push(createMove(piece, twice));
  }

  const captureVectors: readonly Vector[] = [
    [1, rankDirection, 0],
    [-1, rankDirection, 0],
    [1, 0, heightDirection],
    [-1, 0, heightDirection],
  ];

  for (const vector of captureVectors) {
    const to = piece.position.tryAdd(...vector);
    const target = to ? board.getPieceAt(to) : undefined;
    if (to && target && target.color !== piece.color) {
      moves.push(createMove(piece, to, target));
    }
  }

  return moves;
}
