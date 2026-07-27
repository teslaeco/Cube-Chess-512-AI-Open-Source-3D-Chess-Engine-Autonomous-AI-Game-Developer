export function loneKingLockedLevel(pieces, color) {
  const sidePieces = pieces.filter((piece) => piece.color === color);
  if (sidePieces.length !== 1 || sidePieces[0].type !== "king") return null;
  return sidePieces[0].position.z;
}

export function applyLoneKingLevelRule(pieces, color, moves) {
  const lockedLevel = loneKingLockedLevel(pieces, color);
  if (lockedLevel === null) return moves;
  return moves.filter(
    (move) => move.from.z === lockedLevel && move.to.z === lockedLevel,
  );
}
