export function shouldPreferDifferentPiece(selected, recentPieceIds = []) {
  if (!selected?.pieceId || recentPieceIds.length < 2) return false;
  if (selected.capturedPieceId || selected.kind === "capture" || selected.kind === "promotion") {
    return false;
  }
  return recentPieceIds[0] === selected.pieceId && recentPieceIds[1] === selected.pieceId;
}

export function chooseDiverseMove(selected, orderedAlternatives, recentPieceIds = []) {
  if (!shouldPreferDifferentPiece(selected, recentPieceIds)) return selected;
  return orderedAlternatives.find((move) => move.pieceId !== selected.pieceId) ?? selected;
}
