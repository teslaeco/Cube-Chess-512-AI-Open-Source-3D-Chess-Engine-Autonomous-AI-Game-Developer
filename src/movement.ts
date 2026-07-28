import { BOARD_SIZE, isInsideBoard } from "./coord.js";
import { Board3D } from "./board.js";
import type { Coord3, Move, Piece, Position } from "./types.js";

const ROOK_DIRECTIONS: readonly Coord3[] = [
  {x:1,y:0,z:0},{x:-1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:-1,z:0},{x:0,y:0,z:1},{x:0,y:0,z:-1}
];

const BISHOP_DIRECTIONS: readonly Coord3[] = (() => {
  const result: Coord3[] = [];
  for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) {
    const nonZero = [x,y,z].filter(Boolean).length;
    if (nonZero >= 2) result.push({x,y,z});
  }
  return result;
})();

const KING_DIRECTIONS: readonly Coord3[] = (() => {
  const result: Coord3[] = [];
  for (const x of [-1,0,1]) for (const y of [-1,0,1]) for (const z of [-1,0,1]) {
    if (x || y || z) result.push({x,y,z});
  }
  return result;
})();

const KNIGHT_OFFSETS: readonly Coord3[] = (() => {
  const values = [-2,-1,0,1,2];
  const out: Coord3[] = [];
  for (const x of values) for (const y of values) for (const z of values) {
    const abs = [Math.abs(x),Math.abs(y),Math.abs(z)].sort((a,b)=>a-b);
    if (abs[0] === 0 && abs[1] === 1 && abs[2] === 2) out.push({x,y,z});
  }
  return out;
})();

function destinationAllowed(board: Board3D, piece: Piece, to: Coord3): boolean {
  const target = board.pieceAt(to);
  return !target || target.color !== piece.color;
}

function rayMoves(board: Board3D, piece: Piece, dirs: readonly Coord3[]): Move[] {
  const moves: Move[] = [];
  for (const d of dirs) {
    for (let distance = 1; distance < BOARD_SIZE; distance++) {
      const to = {
        x: piece.position.x + d.x * distance,
        y: piece.position.y + d.y * distance,
        z: piece.position.z + d.z * distance,
      };
      if (!isInsideBoard(to)) break;
      const target = board.pieceAt(to);
      if (target?.color === piece.color) break;
      moves.push({
        pieceId: piece.id,
        from: piece.position,
        to,
        ...(target ? { capturedPieceId: target.id } : {}),
      });
      if (target) break;
    }
  }
  return moves;
}

export function generatePseudoLegalMoves(position: Position, piece: Piece): Move[] {
  const board = new Board3D(position);
  switch (piece.type) {
    case "rook":
      return rayMoves(board, piece, ROOK_DIRECTIONS);
    case "bishop":
      return rayMoves(board, piece, BISHOP_DIRECTIONS);
    case "queen":
      return rayMoves(board, piece, [...ROOK_DIRECTIONS, ...BISHOP_DIRECTIONS]);
    case "king":
      return KING_DIRECTIONS
        .map(d => ({x:piece.position.x+d.x,y:piece.position.y+d.y,z:piece.position.z+d.z}))
        .filter(isInsideBoard)
        .filter(to => destinationAllowed(board,piece,to))
        .map(to => {
          const target = board.pieceAt(to);
          return {pieceId:piece.id,from:piece.position,to,...(target?{capturedPieceId:target.id}:{})};
        });
    case "knight":
      return KNIGHT_OFFSETS
        .map(d => ({x:piece.position.x+d.x,y:piece.position.y+d.y,z:piece.position.z+d.z}))
        .filter(isInsideBoard)
        .filter(to => destinationAllowed(board,piece,to))
        .map(to => {
          const target = board.pieceAt(to);
          return {pieceId:piece.id,from:piece.position,to,...(target?{capturedPieceId:target.id}:{})};
        });
    case "pawn":
      return generatePawnMoves(board, piece);
  }
}

function generatePawnMoves(board: Board3D, piece: Piece): Move[] {
  const direction = piece.color === "white" ? 1 : -1;
  const moves: Move[] = [];

  const addQuietMove = (to: Coord3): void => {
    if (isInsideBoard(to) && board.isEmpty(to)) {
      moves.push({pieceId:piece.id,from:piece.position,to});
    }
  };

  const forwardOne = {
    x: piece.position.x,
    y: piece.position.y + direction,
    z: piece.position.z,
  };
  addQuietMove(forwardOne);

  if (!piece.hasMoved && isInsideBoard(forwardOne) && board.isEmpty(forwardOne)) {
    addQuietMove({
      x: piece.position.x,
      y: piece.position.y + direction * 2,
      z: piece.position.z,
    });
  }

  addQuietMove({
    x: piece.position.x,
    y: piece.position.y + direction,
    z: piece.position.z + direction,
  });

  if (!piece.hasMoved) {
    addQuietMove({
      x: piece.position.x,
      y: piece.position.y,
      z: piece.position.z + direction * 2,
    });
  }

  const captures: Coord3[] = [
    {x:piece.position.x-1,y:piece.position.y+direction,z:piece.position.z},
    {x:piece.position.x+1,y:piece.position.y+direction,z:piece.position.z},
    {x:piece.position.x-1,y:piece.position.y,z:piece.position.z+direction},
    {x:piece.position.x+1,y:piece.position.y,z:piece.position.z+direction},
  ];
  for (const to of captures) {
    if (!isInsideBoard(to)) continue;
    const target = board.pieceAt(to);
    if (target && target.color !== piece.color) {
      moves.push({pieceId:piece.id,from:piece.position,to,capturedPieceId:target.id});
    }
  }
  return moves;
}
