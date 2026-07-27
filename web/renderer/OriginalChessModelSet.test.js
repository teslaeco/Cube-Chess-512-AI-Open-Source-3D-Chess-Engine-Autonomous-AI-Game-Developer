import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { normalizeImportedPiece } from "./OriginalChessModelSet.js";

function bounds(object) {
  object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(object);
}

describe("original FBX chess-piece normalization", () => {
  it("centers an imported piece, places it on the board and fits it inside one cube", () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 10, 3));
    mesh.position.set(6, 8, -5);

    const normalized = normalizeImportedPiece(mesh);
    const box = bounds(normalized);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    expect(size.y).toBeLessThanOrEqual(0.78);
    expect(size.x).toBeLessThanOrEqual(0.68);
    expect(size.z).toBeLessThanOrEqual(0.68);
    expect(box.min.y).toBeCloseTo(0, 6);
    expect(center.x).toBeCloseTo(0, 6);
    expect(center.z).toBeCloseTo(0, 6);
  });
});
