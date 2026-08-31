import * as THREE from "three";
import { CELL_RENDER_SIZE, LEVEL_SPACING } from "./coordinates.js";
import {
  ForgeMcpPremiumPieceSet,
  FORGEMCP_PREMIUM_SAFE_FIT,
  countObjectTriangles,
} from "./ForgeMcpPremiumPieceSet.js";

const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];

describe("ForgeMCP Premium Piece Set v4", () => {
  it.each(TYPES)("builds high-detail %s geometry inside one board cell and one level", (type) => {
    const set = new ForgeMcpPremiumPieceSet();
    const object = set.create(type, "white");
    object.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    const envelope = FORGEMCP_PREMIUM_SAFE_FIT[type];
    const triangles = countObjectTriangles(object);

    expect([size.x, size.y, size.z].every(Number.isFinite)).toBe(true);
    expect(Math.min(size.x, size.y, size.z)).toBeGreaterThan(0);
    expect(size.y).toBeLessThanOrEqual(envelope.maxHeight + 1e-6);
    expect(size.x).toBeLessThanOrEqual(envelope.maxFootprint + 1e-6);
    expect(size.z).toBeLessThanOrEqual(envelope.maxFootprint + 1e-6);
    expect(size.y).toBeLessThan(LEVEL_SPACING * 0.7);
    expect(size.x).toBeLessThan(CELL_RENDER_SIZE * 0.6);
    expect(size.z).toBeLessThan(CELL_RENDER_SIZE * 0.6);
    expect(triangles).toBeGreaterThan(7000);
    expect(triangles).toBeLessThan(45000);
  });

  it("keeps a real vertical air gap to the next level", () => {
    const set = new ForgeMcpPremiumPieceSet();
    for (const type of TYPES) {
      const object = set.create(type, "black");
      object.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(object);
      expect(bounds.min.y).toBeGreaterThanOrEqual(-1e-6);
      expect(LEVEL_SPACING - bounds.max.y).toBeGreaterThan(LEVEL_SPACING * 0.3);
    }
  });

  it("creates genuinely 3D knight geometry with modeled anatomy and ornament", () => {
    const knight = new ForgeMcpPremiumPieceSet().create("knight", "black");
    const roles = new Set();
    knight.traverse((child) => {
      if (child.userData?.forgePremiumRole) roles.add(child.userData.forgePremiumRole);
    });
    for (const role of ["neck", "head", "muzzle", "ear", "mane", "eye", "cheek"]) {
      expect(roles.has(role)).toBe(true);
    }
  });

  it("adds actual geometric surface detail beyond a recolor", () => {
    const set = new ForgeMcpPremiumPieceSet();
    for (const type of ["rook", "bishop", "queen", "king", "knight"]) {
      const object = set.create(type, "white");
      const roles = new Set();
      object.traverse((child) => {
        if (child.userData?.forgePremiumRole) roles.add(child.userData.forgePremiumRole);
      });
      expect(roles.size).toBeGreaterThanOrEqual(6);
    }
  });

  it("reuses cached templates but returns independently disposable geometry/materials", () => {
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

  it("uses visibly different white and black PBR material signatures", () => {
    const set = new ForgeMcpPremiumPieceSet();
    const white = set.create("king", "white");
    const black = set.create("king", "black");
    const signature = (object) => {
      const values = [];
      object.traverse((child) => {
        if (child.isMesh && !child.userData?.decorative && child.material?.color) {
          values.push([child.material.color.getHex(), child.material.metalness, child.material.roughness]);
        }
      });
      return JSON.stringify(values.slice(0, 5));
    };
    expect(signature(white)).not.toBe(signature(black));
  });

  it("reports measured high-poly stats and safe-fit status for all six piece types", () => {
    const set = new ForgeMcpPremiumPieceSet();
    const stats = set.inspectAll();
    expect(stats.map((item) => item.type)).toEqual(TYPES);
    for (const item of stats) {
      expect(item.finite).toBe(true);
      expect(item.fitsLevel).toBe(true);
      expect(item.fitsCell).toBe(true);
      expect(item.triangles).toBeGreaterThan(7000);
      expect(Number.isFinite(item.triangles)).toBe(true);
    }
  });
});
