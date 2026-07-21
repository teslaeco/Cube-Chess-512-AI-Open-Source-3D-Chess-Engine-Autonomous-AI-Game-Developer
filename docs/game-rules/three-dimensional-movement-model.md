# Cube Chess 512 — Three-Dimensional Movement Model

## Status

This document defines the canonical pseudo-legal movement geometry for the 8×8×8 Cube Chess 512 board. It is the source of truth for move generation tests and future legal-move validation.

## Board model

The game uses one continuous board containing 512 squares:

- `x`: files `a` through `h`
- `y`: ranks `1` through `8`
- `z`: levels `A` through `H`

A square address is written as `Level:fileRank`, for example `A:a1`, `D:e4`, or `H:h8`.

Every level is a complete classical 8×8 chessboard. The eight levels are not separate games. A piece can remain on its current level or change level when its classical movement geometry can be extended consistently into the third axis.

## General principles

1. Classical movement on a fixed level must remain unchanged.
2. Height is a third spatial axis, not teleportation.
3. Sliding pieces cannot pass through occupied squares on any axis or diagonal.
4. A piece may capture the first opposing piece encountered along a valid path.
5. A piece may not enter a square occupied by a friendly piece.
6. Pseudo-legal generation does not yet check whether a king remains in check.

## Rook

The rook changes exactly one coordinate while the other two remain fixed.

Canonical unit directions:

- `(±1, 0, 0)`
- `(0, ±1, 0)`
- `(0, 0, ±1)`

The rook therefore has six sliding directions. Example: `A:e4` to `H:e4` is valid when every intermediate square is empty.

## Bishop

The bishop changes two or three coordinates by the same absolute distance.

Plane diagonals:

- `(±1, ±1, 0)`
- `(±1, 0, ±1)`
- `(0, ±1, ±1)`

Space diagonals:

- `(±1, ±1, ±1)`

The bishop has twenty sliding directions in total.

## Queen

The queen combines all rook and bishop directions. It has twenty-six sliding directions.

## King

The king moves one square in any non-zero combination of the three axes:

`dx, dy, dz ∈ {-1, 0, 1}`, excluding `(0, 0, 0)`.

A central king has twenty-six pseudo-legal destinations before occupancy and check restrictions are applied.

## Knight

The knight uses the classical `2-1` displacement across any two of the three axes. The remaining axis does not change.

Every offset is a signed permutation of:

`(2, 1, 0)`

A central knight has twenty-four destinations. The `(2, 1, 1)` variant is not part of Cube Chess 512.

## Pawn

Pawns are directional and use both the rank axis and the level axis.

White direction is positive; black direction is negative.

### Quiet advances

White:

- `(0, +1, 0)`
- `(0, 0, +1)`

Black:

- `(0, -1, 0)`
- `(0, 0, -1)`

A pawn that has not moved may advance two squares only on the rank axis, provided both squares are empty:

- White: `(0, +2, 0)`
- Black: `(0, -2, 0)`

There is no two-level vertical pawn advance.

### Captures

White captures using:

- `(±1, +1, 0)`
- `(±1, 0, +1)`

Black captures using:

- `(±1, -1, 0)`
- `(±1, 0, -1)`

A pawn does not move diagonally without capturing and does not combine rank and level advancement in one move.

## Deferred rules

The following are intentionally outside this movement specification and require separate rule modules:

- check and checkmate
- stalemate
- castling
- promotion
- en passant
- repetition and draw rules
- clocks and turn management

These rules must build on this geometry without changing its canonical direction sets.
