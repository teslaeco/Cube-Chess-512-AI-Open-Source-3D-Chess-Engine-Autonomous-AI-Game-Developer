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

  it("builds a centered classical Staunton profile with a complete eight-colour crayon mane", () => {
    const set = new CrayonCathedralPieceSet();
    const stat = set.inspect("knight", "white");
    const knight = set.create("knight", "white");
    knight.updateMatrixWorld(true);
    const wholeBounds = new THREE.Box3().setFromObject(knight);
    const wholeSize = wholeBounds.getSize(new THREE.Vector3());
    const wholeCenter = wholeBounds.getCenter(new THREE.Vector3());
    let stauntonBust = null;
    const maneMeshes = [];
    knight.traverse((child) => {
      if (child.userData?.forgeCrayonCathedralRole === "knight-classic-staunton-bust") {
        stauntonBust = child;
      }
      if (child.userData?.forgeCrayonCathedralRole === "knight-crayon-mane") {
        maneMeshes.push(child);
      }
    });

    expect(stauntonBust).not.toBeNull();
    expect(maneMeshes).toHaveLength(9);
    const bustBounds = new THREE.Box3().setFromObject(stauntonBust);
    const bustSize = bustBounds.getSize(new THREE.Vector3());
    const bustCenter = bustBounds.getCenter(new THREE.Vector3());
    const maneBounds = maneMeshes.reduce(
      (bounds, child) => bounds.union(new THREE.Box3().setFromObject(child)),
      new THREE.Box3(),
    );
    const maneSize = maneBounds.getSize(new THREE.Vector3());
    const maneColors = new Set(maneMeshes.map((child) => child.material.color.getHex()));
    const expectedCrayonColors = [
      0xff354f,
      0xff8a22,
      0xffd72e,
      0x58d35b,
      0x1baee8,
      0x784ee8,
      0xe842b3,
      0x24d6bd,
    ];

    expect(stat.triangles).toBeGreaterThanOrEqual(150_000);
    expect(stauntonBust.geometry.attributes.position.count).toBeGreaterThanOrEqual(150_000);
    expect(stat.resources.roles).toEqual(expect.arrayContaining([
      "knight-face-relief",
      "knight-face-glass",
      "knight-classic-staunton-bust",
      "knight-crayon-mane",
    ]));
    for (const color of expectedCrayonColors) expect(maneColors.has(color)).toBe(true);
    expect(wholeCenter.x).toBeCloseTo(0, 6);
    expect(wholeCenter.z).toBeCloseTo(0, 6);
    expect(bustCenter.x).toBeLessThan(wholeSize.x * 0.18);
    expect(bustCenter.z).toBeCloseTo(0, 6);
    expect(bustSize.y).toBeGreaterThan(bustSize.x);
    expect(bustSize.x).toBeLessThan(wholeSize.x * 0.72);
    expect(bustSize.y).toBeLessThan(wholeSize.y * 0.62);
    expect(maneBounds.min.x).toBeLessThan(bustBounds.min.x);
    expect(maneSize.y).toBeGreaterThan(bustSize.y * 0.75);
    expect(bustBounds.min.x).toBeGreaterThanOrEqual(wholeBounds.min.x - 1e-6);
    expect(bustBounds.max.x).toBeLessThanOrEqual(wholeBounds.max.x + 1e-6);
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
