export function oppositeColor(color) {
  return color === "white" ? "black" : "white";
}

export function squareOf(piece) {
  return piece?.position?.square3D || "";
}

export function inferAuthoritativeMove(localPieces, state) {
  const localById = new Map((localPieces || []).map((piece) => [piece.id, piece]));
  for (const piece of state?.pieces || []) {
    const local = localById.get(piece.id);
    if (local && squareOf(local) !== squareOf(piece)) {
      return { pieceId: piece.id, square3D: squareOf(piece) };
    }
  }
  return null;
}

export function shouldApplyAuthoritativeState(localSequence, state) {
  if (state?.started !== true) return false;
  const remoteSequence = Number(state.sequence) || 0;
  return remoteSequence > (Number(localSequence) || 0);
}
