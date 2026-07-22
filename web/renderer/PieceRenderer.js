import * as THREE from "three";
import { boardPosition } from "./coordinates.js";

export class PieceRenderer {
  constructor(pieces, factory) {
    this.group = new THREE.Group();
    this.group.name = "Pieces";
    this.pieces = new Map();
    this.factory = factory;
    this.sync(pieces);
  }

  createObject(piece) {
    const object = this.factory.create(piece.type, piece.color);
    object.userData = { kind: "piece", piece };
    this.group.add(object);
    this.pieces.set(piece.id, object);
    return object;
  }

  sync(pieces) {
    const nextIds = new Set(pieces.map((piece) => piece.id));
    for (const [id, object] of this.pieces) {
      if (!nextIds.has(id)) {
        this.group.remove(object);
        object.traverse((child) => child.geometry?.dispose());
        this.pieces.delete(id);
      }
    }

    for (const piece of pieces) {
      const object = this.pieces.get(piece.id) ?? this.createObject(piece);
      const position = boardPosition(piece.position);
      object.position.set(position.x, position.y, position.z);
      object.userData = { kind: "piece", piece };
    }
  }

  setSelected(pieceId) {
    this.pieces.forEach((object, id) =>
      object.scale.setScalar(id === pieceId ? 1.09 : 1),
    );
  }

  setLevelVisibility(levels) {
    const visible = new Map(
      levels.map((level) => [level.index, level.visible]),
    );
    this.pieces.forEach((object) => {
      object.visible =
        visible.get(object.userData.piece.position.z) ?? false;
    });
  }

  dispose() {
    this.group.traverse((child) => {
      child.geometry?.dispose();
      if (child.material && !Array.isArray(child.material)) {
        child.material.dispose?.();
      }
    });
    this.group.clear();
    this.pieces.clear();
  }
}
