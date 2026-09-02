import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { PieceGeometryFactory } from "./PieceGeometryFactory.js";
import {
  CLASSIC_BLACK_WHITE_PRESET,
  CRAYON_CATHEDRAL_PRESET,
  FORGEMCP_PREMIUM_PRESET,
} from "../state/pieceVisualPresets.js";
import { CRAYON_CATHEDRAL_SOURCE_ID } from "./CrayonCathedralPieceSet.js";
import { fitObjectInsideCell } from "./ExternalKnightModel.js";
import { pieceCellEnvelope } from "./pieceScaleProfile.js";

function dimensions(object) {
  object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
}

describe("piece cell fitting", () => {
  it("keeps every procedural piece inside its assigned 3D cell envelope", () => {
    const factory = new PieceGeometryFactory();
    for (const color of ["white", "black"]) {
      for (const type of ["pawn", "rook", "knight", "bishop", "queen", "king"]) {
        const piece = factory.openSourceModels.create(type, color);
        const size = dimensions(piece);
        const envelope = pieceCellEnvelope(type);
        expect(size.y, `${color} ${type} height`).toBeLessThanOrEqual(envelope.maxHeight * 1.03);
        expect(size.x, `${color} ${type} width`).toBeLessThanOrEqual(envelope.maxFootprint * 1.03);
        expect(size.z, `${color} ${type} depth`).toBeLessThanOrEqual(envelope.maxFootprint * 1.03);
      }
    }
  });

  it("makes pawns visibly smaller than all major pieces", () => {
    const factory = new PieceGeometryFactory();
    const pawnHeight = dimensions(factory.openSourceModels.create("pawn", "white")).y;
    for (const type of ["rook", "knight", "bishop", "queen", "king"]) {
      expect(dimensions(factory.openSourceModels.create(type, "white")).y, `${type} versus pawn`).toBeGreaterThan(
        pawnHeight * 1.2,
      );
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

  it("switches between Lab LEDColor, Crayon Cathedral and Classic Black & White without replacing the factory", () => {
    const factory = new PieceGeometryFactory();
    factory.setVisualMode(CRAYON_CATHEDRAL_PRESET);
    const cathedral = factory.create("king", "white");
    expect(factory.__forgeVisualMode).toBe(CRAYON_CATHEDRAL_PRESET);
    expect(cathedral.userData.forgeVisualSource).toBe(CRAYON_CATHEDRAL_SOURCE_ID);

    factory.setVisualMode(FORGEMCP_PREMIUM_PRESET);
    expect(factory.__forgeVisualMode).toBe(FORGEMCP_PREMIUM_PRESET);

    factory.setVisualMode(CLASSIC_BLACK_WHITE_PRESET);
    expect(factory.__forgeVisualMode).toBe(CLASSIC_BLACK_WHITE_PRESET);
  });

  it("rejects unknown visual presets", () => {
    const factory = new PieceGeometryFactory();
    expect(() => factory.setVisualMode("UNKNOWN_SET")).toThrow(RangeError);
  });
});
