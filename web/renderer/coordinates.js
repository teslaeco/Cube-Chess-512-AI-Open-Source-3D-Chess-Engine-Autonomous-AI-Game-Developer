export const BOARD_SIZE = 8;
export const TOTAL_LEVELS = 8;
export const TOTAL_SQUARES = BOARD_SIZE ** 2 * TOTAL_LEVELS;
export const CELL_SIZE = 1.25;
export const CELL_GAP = 0.06;
export const CELL_RENDER_SIZE = CELL_SIZE - CELL_GAP;
export const SQUARE_SIZE = CELL_SIZE;
export const LEVEL_SPACING = CELL_SIZE;

const FILES = "abcdefgh";
const LEVELS = "ABCDEFGH";

export function assertBoardCoordinate(x, y, z = 0) {
  for (const value of [x, y, z]) {
    if (!Number.isInteger(value) || value < 0 || value >= BOARD_SIZE) {
      throw new RangeError(
        `Board coordinate must be an integer from 0 to 7; received ${value}`,
      );
    }
  }
}

export function createSquareAddress(x, y, z = 0) {
  assertBoardCoordinate(x, y, z);
  const file = FILES[x];
  const rank = y + 1;
  const level = LEVELS[z];
  const algebraic2D = `${file}${rank}`;
  return {
    x,
    y,
    z,
    file,
    rank,
    level,
    algebraic2D,
    square3D: `${level}:${algebraic2D}`,
  };
}

export function boardPosition(address, levelIndex = address.z) {
  assertBoardCoordinate(address.x, address.y, levelIndex);
  const offset = ((BOARD_SIZE - 1) * CELL_SIZE) / 2;
  return {
    x: address.x * CELL_SIZE - offset,
    y: levelIndex * LEVEL_SPACING,
    z: address.y * CELL_SIZE - offset,
  };
}

export function createLevelSquares(levelIndex = 0) {
  assertBoardCoordinate(0, 0, levelIndex);
  return Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) =>
    createSquareAddress(
      index % BOARD_SIZE,
      Math.floor(index / BOARD_SIZE),
      levelIndex,
    ),
  );
}

export function createCubeSquareAddresses() {
  return Array.from(
    { length: TOTAL_LEVELS },
    (_, level) => createLevelSquares(level),
  ).flat();
}
