import type { Board3D } from "../board/Board3D.js";
import type { Piece } from "../pieces/Piece.js";
import type { Move } from "./Move.js";
import { createMove } from "./MoveFactory.js";
import type { Vector } from "./DirectionVectors.js";
export function generatePawnMoves(board: Board3D, piece: Piece): Move[] {
  const direction = piece.color === "white" ? 1 : -1; const moves: Move[] = [];
  for (const vector of [[0,direction,0],[0,0,direction]] as Vector[]) { const to = piece.position.tryAdd(...vector); if (to && board.isEmpty(to)) moves.push(createMove(piece,to)); }
  const middle = piece.position.tryAdd(0,direction,0), twice = piece.position.tryAdd(0,direction * 2,0);
  if (!piece.hasMoved && middle && twice && board.isEmpty(middle) && board.isEmpty(twice)) moves.push(createMove(piece,twice));
  for (const vector of [[1,direction,0],[-1,direction,0],[1,0,direction],[-1,0,direction]] as Vector[]) { const to=piece.position.tryAdd(...vector), target=to&&board.getPieceAt(to); if(to&&target&&target.color!==piece.color)moves.push(createMove(piece,to,target)); }
  return moves;
}
