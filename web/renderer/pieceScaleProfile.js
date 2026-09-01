// Readable envelopes for the normal public 8x8x8 renderer.
// LEVEL_SPACING is 1.25, so even a selected 1.1x king remains below the next
// board. The previous 0.23-0.45 heights made the pieces illegible in gameplay.
export const PIECE_CELL_ENVELOPE = Object.freeze({
  pawn: Object.freeze({ maxHeight: 0.62, maxFootprint: 0.58 }),
  rook: Object.freeze({ maxHeight: 0.76, maxFootprint: 0.70 }),
  knight: Object.freeze({ maxHeight: 0.79, maxFootprint: 0.68 }),
  bishop: Object.freeze({ maxHeight: 0.82, maxFootprint: 0.66 }),
  queen: Object.freeze({ maxHeight: 0.86, maxFootprint: 0.69 }),
  king: Object.freeze({ maxHeight: 0.90, maxFootprint: 0.70 }),
});

export function pieceCellEnvelope(type) {
  return PIECE_CELL_ENVELOPE[type] ?? PIECE_CELL_ENVELOPE.pawn;
}
