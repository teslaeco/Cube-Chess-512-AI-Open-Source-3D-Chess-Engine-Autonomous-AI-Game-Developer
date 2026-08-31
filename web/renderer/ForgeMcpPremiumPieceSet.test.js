import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { pieceCellEnvelope } from "./pieceScaleProfile.js";
import { ForgeMcpPremiumPieceSet, countObjectTriangles } from "./ForgeMcpPremiumPieceSet.js";

const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];

describe("ForgeMCP Premium Piece Set", () => {
  it.each(TYPES)("builds finite non-zero %s geometry inside its cell envelope", (type) => {
    const set = new ForgeMcpPremiumPieceSet();
    const object = set.create(type, "white");
    object.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    const envelope = pieceCellEnvelope(type);
    const triangles = countObjectTriangles(object);

    expect([size.x, size.y, size.z].every(Number.isFinite)).toBe(true);
    expect(Math.min(size.x, size.y, size.z)).toBeGreaterThan(0);
    expect(size.y).toBeLessThanOrEqual(envelope.maxHeight + 1e-6);
    expect(size.x).toBeLessThanOrEqual(envelope.maxFootprint + 1e-6);
    expect(size.z).toBeLessThanOrEqual(envelope.maxFootprint + 1e-6);
    expect(triangles).toBeGreaterThan(1500);
    expect(triangles).toBeLessThan(20000);
  });

  it("creates genuinely 3D knight geometry with multiple modeled anatomical parts", () => {
    const knight = new ForgeMcpPremiumPieceSet().create("knight", "black");
    const roles = new Set();
    knight.traverse((child) => {
      if (child.userData?.forgePremiumRole) roles.add(child.userData.forgePremiumRole);
    });
    for (const role of ["neck", "head", "muzzle", "ear", "mane", "eye"]) {
      expect(roles.has(role)).toBe(true);
    }
  });

  it("reuses cached templates but returns independently disposable instance geometry", () => {
    const set = new ForgeMcpPremiumPieceSet();
    const first = set.create("pawn", "white");
    const second = set.create("pawn", "white");
    const firstMesh = first.getObjectByProperty("isMesh", true);
    const secondMesh = second.getObjectByProperty("isMesh", true);
    expect(set.templates.size).toBe(1);
    expect(first).not.toBe(second);
    expect(firstMesh.geometry).not.toBe(secondMesh.geometry);
    expect(firstMesh.material).not.toBe(secondMesh.material);
    expect(countObjectTriangles(first)).toBe(countObjectTriangles(second));
  });

  it("uses visibly different white and black material signatures", () => {
    const set = new ForgeMcpPremiumPieceSet();
    const white = set.create("king", "white");
    const black = set.create("king", "black");
    const findColor = (object) => {
      let color = null;
      object.traverse((child) => {
        if (!color && child.isMesh && !child.userData?.decorative && child.material?.color) color = child.material.color.getHex();
      });
      return color;
    };
    expect(findColor(white)).not.toBe(findColor(black));
  });

  it("reports real measured triangle stats for all six premium types", () => {
    const set = new ForgeMcpPremiumPieceSet();
    const stats = set.inspectAll();
    expect(stats.map((item) => item.type)).toEqual(TYPES);
    for (const item of stats) {
      expect(item.finite).toBe(true);
      expect(item.triangles).toBeGreaterThan(1500);
      expect(Number.isFinite(item.triangles)).toBe(true);
    }
  });
});
