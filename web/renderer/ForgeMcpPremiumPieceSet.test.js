import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CELL_RENDER_SIZE, LEVEL_SPACING } from "./coordinates.js";
import {
  ForgeMcpPremiumPieceSet,
  FORGEMCP_PREMIUM_SAFE_FIT,
  countObjectTriangles,
  countUniquePieceResources,
} from "./ForgeMcpPremiumPieceSet.js";

const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];

describe("ForgeMCP Premium Piece Set v5", () => {
  it.each(TYPES)("builds reference-inspired %s geometry inside one board cell and one level", (type) => {
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
    expect(size.y).toBeLessThanOrEqual(LEVEL_SPACING * 0.60 + 1e-6);
    expect(size.x).toBeLessThanOrEqual(CELL_RENDER_SIZE * 0.52 + 1e-6);
    expect(size.z).toBeLessThanOrEqual(CELL_RENDER_SIZE * 0.52 + 1e-6);
    expect(triangles).toBeGreaterThan(900);
    expect(triangles).toBeLessThan(18000);
  });

  it("keeps at least forty percent vertical air gap to the next level", () => {
    const set = new ForgeMcpPremiumPieceSet();
    for (const type of TYPES) {
      const object = set.create(type, "black");
      object.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(object);
      expect(bounds.min.y).toBeGreaterThanOrEqual(-1e-6);
      expect(LEVEL_SPACING - bounds.max.y).toBeGreaterThanOrEqual(LEVEL_SPACING * 0.40 - 1e-6);
    }
  });

  it("creates a true 3D knight silhouette with modeled anatomy and crystal armor", () => {
    const knight = new ForgeMcpPremiumPieceSet().create("knight", "black");
    const roles = new Set();
    knight.traverse((child) => { if (child.userData?.forgePremiumRole) roles.add(child.userData.forgePremiumRole); });
    for (const role of ["neck", "head", "muzzle", "ear", "mane", "eye", "cheek", "armor-crystal"]) expect(roles.has(role)).toBe(true);
  });

  it("creates a crystalline bishop silhouette rather than a recolored classical body", () => {
    const bishop = new ForgeMcpPremiumPieceSet().create("bishop", "white");
    const roles = new Set();
    bishop.traverse((child) => { if (child.userData?.forgePremiumRole) roles.add(child.userData.forgePremiumRole); });
    for (const role of ["mitre", "bishop-cut", "glow-cut", "crystal-fin", "jewel"]) expect(roles.has(role)).toBe(true);
  });

  it("shares immutable geometry and materials between cloned pieces instead of duplicating GPU buffers", () => {
    const set = new ForgeMcpPremiumPieceSet();
    const first = set.create("knight", "white");
    const second = set.create("knight", "white");
    const firstMeshes = [];
    const secondMeshes = [];
    first.traverse((child) => { if (child.isMesh) firstMeshes.push(child); });
    second.traverse((child) => { if (child.isMesh) secondMeshes.push(child); });
    expect(first).not.toBe(second);
    expect(firstMeshes.length).toBe(secondMeshes.length);
    expect(firstMeshes[0].geometry).toBe(secondMeshes[0].geometry);
    expect(firstMeshes[0].material).toBe(secondMeshes[0].material);
    expect(countObjectTriangles(first)).toBe(countObjectTriangles(second));
  });

  it("keeps resource counts compact while preserving distinct materials", () => {
    const set = new ForgeMcpPremiumPieceSet();
    for (const type of TYPES) {
      const object = set.create(type, "white");
      const resources = countUniquePieceResources(object);
      expect(resources.meshes).toBeGreaterThan(0);
      expect(resources.uniqueGeometries).toBeLessThanOrEqual(resources.meshes);
      expect(resources.uniqueMaterials).toBeLessThanOrEqual(7);
    }
  });

  it("uses visibly different white and black PBR material signatures", () => {
    const set = new ForgeMcpPremiumPieceSet();
    const signature = (object) => {
      const values = [];
      object.traverse((child) => {
        if (child.isMesh && !child.userData?.decorative && child.material?.color) values.push([child.material.color.getHex(), child.material.metalness, child.material.roughness]);
      });
      return JSON.stringify(values.slice(0, 5));
    };
    expect(signature(set.create("king", "white"))).not.toBe(signature(set.create("king", "black")));
  });

  it("reports measured optimized stats for all six piece types", () => {
    const set = new ForgeMcpPremiumPieceSet();
    const stats = set.inspectAll();
    expect(stats.map((item) => item.type)).toEqual(TYPES);
    for (const item of stats) {
      expect(item.finite).toBe(true);
      expect(item.fitsLevel).toBe(true);
      expect(item.fitsCell).toBe(true);
      expect(item.referenceInspired).toBe(true);
      expect(item.sharedGeometryAndMaterials).toBe(true);
      expect(item.triangles).toBeGreaterThan(900);
      expect(item.triangles).toBeLessThan(18000);
    }
  });
});
