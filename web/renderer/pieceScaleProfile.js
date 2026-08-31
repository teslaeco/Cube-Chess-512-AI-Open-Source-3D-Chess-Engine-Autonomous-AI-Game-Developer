// Strict envelopes for the normal public 8x8x8 renderer.
// LEVEL_SPACING is 1.25. These values are deliberately conservative so every
// finished generated piece remains inside one cube and leaves large vertical air.
// Pawn is intentionally much smaller than every major piece to preserve chess readability.
export const PIECE_CELL_ENVELOPE = Object.freeze({
  pawn: Object.freeze({ maxHeight: 0.23, maxFootprint: 0.28 }),
  rook: Object.freeze({ maxHeight: 0.30, maxFootprint: 0.32 }),
  knight: Object.freeze({ maxHeight: 0.34, maxFootprint: 0.33 }),
  bishop: Object.freeze({ maxHeight: 0.37, maxFootprint: 0.32 }),
  queen: Object.freeze({ maxHeight: 0.41, maxFootprint: 0.34 }),
  king: Object.freeze({ maxHeight: 0.45, maxFootprint: 0.34 }),
});

export function pieceCellEnvelope(type) {
  return PIECE_CELL_ENVELOPE[type] ?? PIECE_CELL_ENVELOPE.pawn;
}
