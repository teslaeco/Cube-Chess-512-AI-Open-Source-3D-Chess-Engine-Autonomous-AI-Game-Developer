import { createSquareAddress } from "../renderer/coordinates.js";

const BACK_RANK = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];

function piece(color, type, x, y, ordinal) {
  const position = createSquareAddress(x, y, 0);
  return { id: `${color}-${type}-${ordinal}`, color, type, position };
}

export function createInitialPieces() {
  const pieces = [];
  for (let x = 0; x < 8; x += 1) {
    pieces.push(piece("white", BACK_RANK[x], x, 0, x + 1));
    pieces.push(piece("white", "pawn", x, 1, x + 1));
    pieces.push(piece("black", "pawn", x, 6, x + 1));
    pieces.push(piece("black", BACK_RANK[x], x, 7, x + 1));
  }
  return pieces;
}
