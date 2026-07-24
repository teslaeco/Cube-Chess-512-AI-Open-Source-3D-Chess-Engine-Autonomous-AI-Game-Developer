export type Vector = readonly [number, number, number];

const signs = [-1, 0, 1] as const;

const ALL_DIRECTIONS: readonly Vector[] = signs
  .flatMap((x) => signs.flatMap((y) => signs.map((z) => [x, y, z] as Vector)))
  .filter(([x, y, z]) => x !== 0 || y !== 0 || z !== 0);

export const ROOK_DIRECTIONS: readonly Vector[] = ALL_DIRECTIONS.filter(
  (vector) => vector.filter((value) => value !== 0).length === 1,
);

/**
 * A bishop must always remain diagonal on the 8x8 board projection.
 *
 * Therefore both board axes (x and y) must change by the same step. The
 * level axis (z) may stay unchanged for a classic diagonal or change by the
 * same step for a true 3D diagonal. Directions such as [0, 1, 1] and
 * [1, 0, 1] are deliberately excluded because they look and behave like a
 * straight forward/sideways move when the levels are viewed together.
 */
export const BISHOP_DIRECTIONS: readonly Vector[] = ALL_DIRECTIONS.filter(
  ([x, y, z]) =>
    x !== 0 &&
    y !== 0 &&
    Math.abs(x) === Math.abs(y) &&
    (z === 0 || Math.abs(z) === Math.abs(x)),
);

/**
 * The queen is the unrestricted sliding piece in Cube Chess 512. She may
 * travel along every straight 3D ray: axes, board diagonals, vertical-plane
 * diagonals and full spatial diagonals. This restores forward/upward capture
 * lines without changing the stricter bishop geometry.
 */
export const QUEEN_DIRECTIONS: readonly Vector[] = ALL_DIRECTIONS;

// The king may move one square in every adjacent 3D direction.
export const KING_DIRECTIONS: readonly Vector[] = ALL_DIRECTIONS;

export const KNIGHT_OFFSETS: readonly Vector[] = [-2, -1, 0, 1, 2]
  .flatMap((x) =>
    [-2, -1, 0, 1, 2].flatMap((y) =>
      [-2, -1, 0, 1, 2].map((z) => [x, y, z] as Vector),
    ),
  )
  .filter(
    (vector) =>
      [...vector].map(Math.abs).sort().join(",") === "0,1,2",
  );
