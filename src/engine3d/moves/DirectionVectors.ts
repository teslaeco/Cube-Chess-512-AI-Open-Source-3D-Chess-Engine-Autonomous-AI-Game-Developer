export type Vector = readonly [number, number, number];

const signs = [-1, 0, 1] as const;

const ALL_DIRECTIONS: readonly Vector[] = signs
  .flatMap((x) => signs.flatMap((y) => signs.map((z) => [x, y, z] as Vector)))
  .filter(([x, y, z]) => x !== 0 || y !== 0 || z !== 0);

function changedAxisCount(vector: Vector): number {
  return vector.filter((value) => value !== 0).length;
}

export const ROOK_DIRECTIONS: readonly Vector[] = ALL_DIRECTIONS.filter(
  (vector) => changedAxisCount(vector) === 1,
);

/**
 * The bishop is the diagonal sliding piece in three-dimensional space.
 *
 * A legal bishop ray changes at least two axes by the same unit step:
 * - x-y: a classic diagonal on one board level,
 * - x-z: a sideways diagonal between levels,
 * - y-z: a forward/backward diagonal between levels,
 * - x-y-z: a full spatial diagonal.
 *
 * Axial rays are deliberately excluded because they belong to the rook.
 */
export const BISHOP_DIRECTIONS: readonly Vector[] = ALL_DIRECTIONS.filter(
  (vector) => changedAxisCount(vector) >= 2,
);

/** The queen combines every rook and bishop ray. */
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
