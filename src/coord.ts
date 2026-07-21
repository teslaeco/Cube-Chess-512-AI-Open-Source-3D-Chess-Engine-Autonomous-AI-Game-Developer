import type { Coord3 } from "./types.js";

export const BOARD_SIZE = 8;

export function isInsideBoard(c: Coord3): boolean {
  return [c.x, c.y, c.z].every((v) => Number.isInteger(v) && v >= 0 && v < BOARD_SIZE);
}

export function coordKey(c: Coord3): string {
  return `${c.x},${c.y},${c.z}`;
}

export function sameCoord(a: Coord3, b: Coord3): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

export function parseSquare3D(value: string): Coord3 {
  const match = /^L([1-8]):([a-h])([1-8])$/i.exec(value.trim());
  if (!match) throw new Error(`Invalid 3D square: ${value}. Expected e.g. L4:e5`);
  return {
    z: Number(match[1]) - 1,
    x: match[2]!.toLowerCase().charCodeAt(0) - 97,
    y: Number(match[3]) - 1,
  };
}

export function formatSquare3D(c: Coord3): string {
  if (!isInsideBoard(c)) throw new Error("Coordinate outside 8x8x8 board");
  return `L${c.z + 1}:${String.fromCharCode(97 + c.x)}${c.y + 1}`;
}
