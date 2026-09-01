import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  CrayonCathedralPieceSet,
  CRAYON_CATHEDRAL_SOURCE_ID,
} from "./CrayonCathedralPieceSet.js";
import { CELL_RENDER_SIZE, LEVEL_SPACING } from "./coordinates.js";

const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];

function meshes(object) {
  const result = [];
  object.traverse((child) => {
    if (child.isMesh) result.push(child);
  });
  return result;
}

describe("original Crayon Cathedral chess collection", () => {
  it("provides six distinct, high-polygon windowed and crayon silhouettes", () => {
    const set = new CrayonCathedralPieceSet();
    const stats = set.inspectAll("white");

    expect(stats.map((item) => item.type)).toEqual(TYPES);
    expect(new Set(stats.map((item) => item.triangles)).size).toBeGreaterThanOrEqual(5);
    for (const stat of stats) {
      expect(stat.runtimePrimarySource).toBe(CRAYON_CATHEDRAL_SOURCE_ID);
      expect(stat.triangles, `${stat.type} triangle detail`).toBeGreaterThanOrEqual(45_000);
      expect(stat.resources.roles.some((role) => role.includes("window"))).toBe(true);
      expect(stat.resources.roles.some((role) => role.includes("crayon"))).toBe(true);
      expect(stat.resources.fullyTexturedMeshes).toBe(stat.resources.meshes);
      expect(stat.resources.meshes, `${stat.type} mobile draw-call batches`).toBeLessThanOrEqual(20);
    }
  });

  it("keeps even a selected 1.1x figure inside one field and below the next level", () => {
    const set = new CrayonCathedralPieceSet();
    for (const stat of set.inspectAll("white")) {
      expect(stat.fitsCell, `${stat.type} footprint`).toBe(true);
      expect(stat.fitsLevel, `${stat.type} height`).toBe(true);
      expect(stat.bounds.x * 1.1, `${stat.type} selected width`).toBeLessThan(CELL_RENDER_SIZE);
      expect(stat.bounds.z * 1.1, `${stat.type} selected depth`).toBeLessThan(CELL_RENDER_SIZE);
      expect(stat.bounds.y * 1.1, `${stat.type} selected height`).toBeLessThan(LEVEL_SPACING);
    }
  });

  it("shares immutable geometry while keeping per-piece highlight materials independent", () => {
    const set = new CrayonCathedralPieceSet();
    const first = set.create("queen", "white");
    const second = set.create("queen", "white");
    const firstMeshes = meshes(first);
    const secondMeshes = meshes(second);

    expect(firstMeshes).toHaveLength(secondMeshes.length);
    expect(firstMeshes[0].geometry).toBe(secondMeshes[0].geometry);
    expect(firstMeshes[0].material).not.toBe(secondMeshes[0].material);
    expect(firstMeshes[0].material.map).toBe(secondMeshes[0].material.map);
    firstMeshes[0].material.emissive.setHex(0x2f7dff);
    expect(firstMeshes[0].material.emissive.getHex()).not.toBe(
      secondMeshes[0].material.emissive.getHex(),
    );

    const opponent = set.create("queen", "black");
    const opponentMeshes = meshes(opponent);
    expect(firstMeshes[0].geometry).toBe(opponentMeshes[0].geometry);
    expect(firstMeshes[0].material).not.toBe(opponentMeshes[0].material);
    expect(firstMeshes[0].material.map).not.toBe(opponentMeshes[0].material.map);
  });

  it("centers every model on its field and grounds it at y=0", () => {
    const set = new CrayonCathedralPieceSet();
    for (const type of TYPES) {
      const object = set.create(type, "black");
      object.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(object);
      const center = bounds.getCenter(new THREE.Vector3());
      expect(bounds.min.y, `${type} ground`).toBeCloseTo(0, 6);
      expect(center.x, `${type} x center`).toBeCloseTo(0, 6);
      expect(center.z, `${type} z center`).toBeCloseTo(0, 6);
    }
  });
});
