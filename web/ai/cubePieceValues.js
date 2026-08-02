// Empty-board mobility for the current authoritative 8×8×8 movement rules.
// These values are documentation and regression anchors, not a replacement for
// search. Material values deliberately grow more slowly than raw mobility so
// that safety, king pressure and forced tactics remain decisive.
export const EMPTY_BOARD_AVERAGE_MOBILITY = Object.freeze({
  pawn: 3,
  knight: 15.75,
  bishop: 21,
  rook: 21,
  queen: 59.5,
  king: 19.796875,
});

export const CUBE_PIECE_VALUES = Object.freeze({
  pawn: 100,
  knight: 430,
  bishop: 500,
  rook: 600,
  queen: 1_400,
  king: 20_000,
});

export function materialValue(pieceOrType) {
  const type = typeof pieceOrType === "string" ? pieceOrType : pieceOrType?.type;
  return CUBE_PIECE_VALUES[type] ?? 0;
}
