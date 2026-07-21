import { coordKey, isInsideBoard } from "./coord.js";
import type { Coord3, Piece, Position } from "./types.js";

export class Board3D {
  private readonly occupancy = new Map<string, Piece>();

  constructor(public readonly position: Position) {
    for (const piece of position.pieces.values()) {
      if (!isInsideBoard(piece.position)) throw new Error(`Piece ${piece.id} outside board`);
      const key = coordKey(piece.position);
      if (this.occupancy.has(key)) throw new Error(`Two pieces occupy ${key}`);
      this.occupancy.set(key, piece);
    }
  }

  pieceAt(c: Coord3): Piece | undefined {
    return this.occupancy.get(coordKey(c));
  }

  isEmpty(c: Coord3): boolean {
    return !this.pieceAt(c);
  }

  rayIsClear(from: Coord3, to: Coord3): boolean {
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);
    const dz = Math.sign(to.z - from.z);
    let c = { x: from.x + dx, y: from.y + dy, z: from.z + dz };
    while (c.x !== to.x || c.y !== to.y || c.z !== to.z) {
      if (!this.isEmpty(c)) return false;
      c = { x: c.x + dx, y: c.y + dy, z: c.z + dz };
    }
    return true;
  }
}
