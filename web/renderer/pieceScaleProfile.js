// Strict envelopes for the normal public 8x8x8 renderer.
// LEVEL_SPACING is 1.25, so even the king stays far below the level above.
export const PIECE_CELL_ENVELOPE = Object.freeze({
  pawn: Object.freeze({ maxHeight: 0.27, maxFootprint: 0.32 }),
  rook: Object.freeze({ maxHeight: 0.30, maxFootprint: 0.34 }),
  knight: Object.freeze({ maxHeight: 0.34, maxFootprint: 0.35 }),
  bishop: Object.freeze({ maxHeight: 0.37, maxFootprint: 0.34 }),
  queen: Object.freeze({ maxHeight: 0.41, maxFootprint: 0.36 }),
  king: Object.freeze({ maxHeight: 0.45, maxFootprint: 0.36 }),
});

export function pieceCellEnvelope(type) {
  return PIECE_CELL_ENVELOPE[type] ?? PIECE_CELL_ENVELOPE.pawn;
}
