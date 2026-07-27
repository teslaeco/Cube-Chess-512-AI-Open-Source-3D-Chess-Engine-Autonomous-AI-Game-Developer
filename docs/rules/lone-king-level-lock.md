# Lone King Level Lock

When one side has only its king remaining, that king becomes locked to its current board level.

## Activation

The rule activates immediately after the move that captures the side's final non-king piece. The locked level is the king's `z` coordinate in the resulting position.

## Effect

- The king may continue moving and capturing normally on that level.
- Any move that changes `z` is illegal.
- Check, checkmate and stalemate rules remain unchanged.
- The restriction applies equally to human players and the computer opponent.
- Undo restores the position before activation; redo restores it again.
- Saves derive the lock deterministically from the current piece set and king position, so no separate mutable flag is required.

## Rationale

The variant prevents a lone king from repeatedly escaping through all eight levels solely to prolong a decided ending, while preserving normal defensive play on the level where the king was stranded.
