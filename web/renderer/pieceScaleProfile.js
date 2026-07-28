export const PIECE_CELL_ENVELOPE = Object.freeze({
  pawn: Object.freeze({ maxHeight: 0.64, maxFootprint: 0.54 }),
  rook: Object.freeze({ maxHeight: 0.88, maxFootprint: 0.76 }),
  knight: Object.freeze({ maxHeight: 0.9, maxFootprint: 0.74 }),
  bishop: Object.freeze({ maxHeight: 0.92, maxFootprint: 0.72 }),
  queen: Object.freeze({ maxHeight: 0.94, maxFootprint: 0.76 }),
  king: Object.freeze({ maxHeight: 0.96, maxFootprint: 0.76 }),
});

export function pieceCellEnvelope(type) {
  return PIECE_CELL_ENVELOPE[type] ?? PIECE_CELL_ENVELOPE.pawn;
}
