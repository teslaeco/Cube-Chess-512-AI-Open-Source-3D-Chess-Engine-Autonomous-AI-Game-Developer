import {
  Board3D,
  Coordinate3D,
  generateLegalMovesForPiece,
} from "../../src/engine3d/index.ts";

function toEnginePiece(piece) {
  return {
    id: piece.id,
    type: piece.type,
    color: piece.color,
    position: new Coordinate3D(
      piece.position.x,
      piece.position.y,
      piece.position.z,
    ),
    hasMoved: Boolean(piece.hasMoved),
  };
}

export function legalTargetsForPiece(pieces, pieceId) {
  const enginePieces = pieces.map(toEnginePiece);
  const board = new Board3D(enginePieces);
  const selected = enginePieces.find((piece) => piece.id === pieceId);

  if (!selected) {
    return [];
  }

  return generateLegalMovesForPiece(board, selected).map((move) => ({
    square3D: move.to.toSquareAddress(),
    kind: move.kind,
    capturedPieceId: move.capturedPieceId ?? null,
  }));
}
