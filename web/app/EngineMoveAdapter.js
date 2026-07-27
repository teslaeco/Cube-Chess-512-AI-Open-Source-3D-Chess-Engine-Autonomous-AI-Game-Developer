import {
  Board3D,
  Coordinate3D,
  evaluatePosition,
  generateLegalMovesForColor,
  generateLegalMovesForPiece,
} from "../../src/engine3d/index.ts";
import { applyLoneKingLevelRule } from "../rules/LoneKingLevelRule.js";

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

function createBoard(pieces) {
  return new Board3D(pieces.map(toEnginePiece));
}

export function legalTargetsForPiece(pieces, pieceId) {
  const board = createBoard(pieces);
  const selected = board.getAllPieces().find((piece) => piece.id === pieceId);

  if (!selected) return [];

  const moves = generateLegalMovesForPiece(board, selected).map(toBrowserMove);
  return applyLoneKingLevelRule(pieces, selected.color, moves);
}

export function legalMovesForSide(pieces, sideToMove) {
  const moves = generateLegalMovesForColor(createBoard(pieces), sideToMove).map(
    toBrowserMove,
  );
  return applyLoneKingLevelRule(pieces, sideToMove, moves);
}

function toBrowserMove(move) {
  return {
    pieceId: move.pieceId,
    from: {
      x: move.from.x,
      y: move.from.y,
      z: move.from.z,
      square3D: move.from.toSquareAddress(),
    },
    to: {
      x: move.to.x,
      y: move.to.y,
      z: move.to.z,
      square3D: move.to.toSquareAddress(),
    },
    square3D: move.to.toSquareAddress(),
    kind: move.kind,
    capturedPieceId: move.capturedPieceId ?? null,
  };
}

export function positionStatus(pieces, sideToMove) {
  return evaluatePosition(createBoard(pieces), sideToMove);
}
