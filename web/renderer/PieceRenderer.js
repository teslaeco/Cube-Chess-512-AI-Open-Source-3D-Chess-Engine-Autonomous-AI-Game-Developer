import * as THREE from "three";
import { boardPosition } from "./coordinates.js";

export class PieceRenderer {
  constructor(pieces, factory) {
    this.group = new THREE.Group();
    this.group.name = "Pieces"; this.pieces = new Map(); this.factory = factory;
    for (const piece of pieces) {
      const object = factory.create(piece.type, piece.color); const position = boardPosition(piece.position);
      object.position.set(position.x, 0, position.z); object.userData = { kind: "piece", piece };
      this.group.add(object); this.pieces.set(piece.id, object);
    }
  }
  setSelected(pieceId) {
    this.pieces.forEach((object, id) => object.scale.setScalar(id === pieceId ? 1.09 : 1));
  }
  dispose() { this.group.traverse((child) => child.geometry?.dispose()); this.group.clear(); }
}
