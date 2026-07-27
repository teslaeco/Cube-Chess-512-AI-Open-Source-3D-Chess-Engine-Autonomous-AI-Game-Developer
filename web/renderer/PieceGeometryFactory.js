import * as THREE from "three";
import { OriginalChessModelSet } from "./OriginalChessModelSet.js";

export class PieceGeometryFactory {
  constructor() {
    this.materials = {
      white: new THREE.MeshPhysicalMaterial({
        color: 0xf2ede2,
        metalness: 0.08,
        roughness: 0.24,
        clearcoat: 0.65,
        clearcoatRoughness: 0.22,
      }),
      black: new THREE.MeshPhysicalMaterial({
        color: 0x151a22,
        metalness: 0.34,
        roughness: 0.2,
        clearcoat: 0.72,
        clearcoatRoughness: 0.18,
      }),
    };

    this.originalModels = new OriginalChessModelSet(this.materials);
  }

  create(type, color) {
    return this.originalModels.create(type, color);
  }
}
