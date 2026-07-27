import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { PieceGeometryFactory } from "./PieceGeometryFactory.js";
import { fitObjectInsideCell } from "./ExternalKnightModel.js";

function dimensions(object) {
  object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
}

describe("piece cell fitting", () => {
  it("keeps every procedural piece inside one 1.25-unit board cell", () => {
    const factory = new PieceGeometryFactory();
    for (const color of ["white", "black"]) {
      for (const type of ["pawn", "rook", "knight", "bishop", "queen", "king"]) {
        const piece = factory.create(type, color);
        const size = dimensions(piece);
        expect(size.y, `${color} ${type} height`).toBeLessThanOrEqual(1.06);
        expect(size.x, `${color} ${type} width`).toBeLessThanOrEqual(0.96);
        expect(size.z, `${color} ${type} depth`).toBeLessThanOrEqual(0.96);
      }
    }
  });

  it("centers and scales imported knight geometry to the same envelope", () => {
    const imported = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 9, 3));
    mesh.position.set(7, 5, -4);
    imported.add(mesh);
    fitObjectInsideCell(imported);

    const bounds = new THREE.Box3().setFromObject(imported);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    expect(size.y).toBeLessThanOrEqual(1.02);
    expect(size.x).toBeLessThanOrEqual(0.92);
    expect(size.z).toBeLessThanOrEqual(0.92);
    expect(bounds.min.y).toBeCloseTo(0, 6);
    expect(center.x).toBeCloseTo(0, 6);
    expect(center.z).toBeCloseTo(0, 6);
  });
});
