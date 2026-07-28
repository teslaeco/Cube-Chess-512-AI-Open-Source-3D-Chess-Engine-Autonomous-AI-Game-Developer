import type { Board3D } from "../board/Board3D.js";
import type { Piece } from "../pieces/Piece.js";
import type { Vector } from "./DirectionVectors.js";
import type { Move } from "./Move.js";
import { createMove } from "./MoveFactory.js";

export function generatePawnMoves(board: Board3D, piece: Piece): Move[] {
  const rankDirection = piece.color === "white" ? 1 : -1;
  // Both armies start on level A. Height progression is therefore always
  // A -> H. Pawns never move back toward a lower level.
  const heightDirection = 1;
  const moves: Move[] = [];

  const addQuietMove = (vector: Vector): void => {
    const to = piece.position.tryAdd(...vector);
    if (to && board.isEmpty(to)) moves.push(createMove(piece, to));
  };

  // Normal forward move on the current level.
  const rankOne: Vector = [0, rankDirection, 0];
  addQuietMove(rankOne);

  // 3D forward move: one rank forward and one level higher.
  addQuietMove([0, rankDirection, heightDirection]);

  if (!piece.hasMoved) {
    // Classical two-square opening move. The intermediate square must be free.
    const rankMiddle = piece.position.tryAdd(...rankOne);
    const rankTwo = piece.position.tryAdd(0, rankDirection * 2, 0);
    if (
      rankMiddle &&
      rankTwo &&
      board.isEmpty(rankMiddle) &&
      board.isEmpty(rankTwo)
    ) {
      moves.push(createMove(piece, rankTwo));
    }

    // Cube Chess opening move from level A directly to level C.
    // The pawn changes only height and still cannot move back toward A.
    addQuietMove([0, 0, heightDirection * 2]);
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
