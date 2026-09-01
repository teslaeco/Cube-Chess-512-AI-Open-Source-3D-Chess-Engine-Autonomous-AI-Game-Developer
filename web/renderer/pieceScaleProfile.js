// Readable envelopes for the normal public 8x8x8 renderer. This pass is only a
// 6-8% increase over the accepted high-detail set. A selected 1.1x king is
// still below the next 1.25-spaced level and every selected base remains well
// inside the 1.19-wide rendered square.
export const PIECE_RENDER_SCALE_REVISION = "2026-09-01-safe-size-plus-7-percent";

export const PIECE_CELL_ENVELOPE = Object.freeze({
  pawn: Object.freeze({ maxHeight: 0.66, maxFootprint: 0.62 }),
  rook: Object.freeze({ maxHeight: 0.81, maxFootprint: 0.75 }),
  knight: Object.freeze({ maxHeight: 0.84, maxFootprint: 0.73 }),
  bishop: Object.freeze({ maxHeight: 0.87, maxFootprint: 0.71 }),
  queen: Object.freeze({ maxHeight: 0.92, maxFootprint: 0.74 }),
  king: Object.freeze({ maxHeight: 0.96, maxFootprint: 0.75 }),
});

export function pieceCellEnvelope(type) {
  return PIECE_CELL_ENVELOPE[type] ?? PIECE_CELL_ENVELOPE.pawn;
}
