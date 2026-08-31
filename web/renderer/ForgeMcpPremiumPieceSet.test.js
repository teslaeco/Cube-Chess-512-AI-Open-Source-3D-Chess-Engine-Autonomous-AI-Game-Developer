import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CELL_RENDER_SIZE, LEVEL_SPACING } from "./coordinates.js";
import {
  OpenSourceStauntonPieceSet,
  ForgeMcpPremiumPieceSet,
  OPEN_SOURCE_STAUNTON_SAFE_FIT,
  OPEN_SOURCE_STAUNTON_REVISION,
  countObjectTriangles,
  countUniquePieceResources,
} from "./ForgeMcpPremiumPieceSet.js";

const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];
const HEIGHT_ORDER = ["king", "queen", "bishop", "knight", "rook", "pawn"];

describe("Open-source Staunton Piece Set v7 sculpted", () => {
  it.each(TYPES)("builds detailed %s geometry fully inside one conservative 512-cell envelope", (type) => {
    const set = new OpenSourceStauntonPieceSet();
    const object = set.create(type, "white");
    object.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    const envelope = OPEN_SOURCE_STAUNTON_SAFE_FIT[type];
    const triangles = countObjectTriangles(object);

    expect([size.x, size.y, size.z].every(Number.isFinite)).toBe(true);
    expect(Math.min(size.x, size.y, size.z)).toBeGreaterThan(0);
    expect(bounds.min.y).toBeGreaterThanOrEqual(-1e-6);
    expect(size.y).toBeLessThanOrEqual(envelope.maxHeight + 1e-6);
    expect(size.x).toBeLessThanOrEqual(envelope.maxFootprint + 1e-6);
    expect(size.z).toBeLessThanOrEqual(envelope.maxFootprint + 1e-6);
    expect(size.x).toBeLessThanOrEqual(CELL_RENDER_SIZE * 0.40 + 1e-6);
    expect(size.z).toBeLessThanOrEqual(CELL_RENDER_SIZE * 0.40 + 1e-6);
    expect(triangles).toBeGreaterThan(1800);
    expect(triangles).toBeLessThan(30000);
  });

  it("preserves the classical descending height hierarchy", () => {
    const set = new OpenSourceStauntonPieceSet();
    const heights = Object.fromEntries(TYPES.map((type) => {
      const object = set.create(type, "white");
      object.updateMatrixWorld(true);
      return [type, new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3()).y];
    }));
    for (let i = 0; i < HEIGHT_ORDER.length - 1; i += 1) {
      expect(heights[HEIGHT_ORDER[i]]).toBeGreaterThan(heights[HEIGHT_ORDER[i + 1]]);
    }
  });

  it("keeps more than half a level of vertical air above every piece", () => {
    const set = new OpenSourceStauntonPieceSet();
    for (const type of TYPES) {
      const object = set.create(type, "black");
      object.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(object);
      expect(LEVEL_SPACING - bounds.max.y).toBeGreaterThanOrEqual(LEVEL_SPACING * 0.51 - 1e-6);
    }
  });

  it("creates a sculpted three-dimensional knight instead of a flat extruded silhouette", () => {
    const knight = new OpenSourceStauntonPieceSet().create("knight", "black");
    const roles = new Set();
    knight.traverse((child) => { if (child.userData?.openSourceStauntonRole) roles.add(child.userData.openSourceStauntonRole); });
    for (const role of ["knight-body", "knight-head", "knight-muzzle", "jaw", "ear", "mane-fin", "eye"]) expect(roles.has(role)).toBe(true);
    expect(countObjectTriangles(knight)).toBeGreaterThan(5000);
  });

  it("creates a smooth split bishop mitre with a real modeled diagonal notch", () => {
    const bishop = new OpenSourceStauntonPieceSet().create("bishop", "white");
    const roles = [];
    bishop.traverse((child) => { if (child.userData?.openSourceStauntonRole) roles.push(child.userData.openSourceStauntonRole); });
    expect(roles.filter((role) => role === "bishop-mitre").length).toBe(2);
    expect(roles.includes("bishop-notch")).toBe(true);
    expect(countObjectTriangles(bishop)).toBeGreaterThan(4000);
  });

  it("creates distinct rook battlements, queen crown and king cross", () => {
    const set = new OpenSourceStauntonPieceSet();
    const rolesFor = (type) => {
      const roles = [];
      set.create(type, "white").traverse((child) => { if (child.userData?.openSourceStauntonRole) roles.push(child.userData.openSourceStauntonRole); });
      return roles;
    };
    expect(rolesFor("rook").filter((role) => role === "battlement").length).toBe(8);
    expect(rolesFor("queen").filter((role) => role === "crown").length).toBeGreaterThanOrEqual(10);
    expect(rolesFor("king").filter((role) => role === "cross").length).toBe(2);
  });

  it("shares immutable geometry and materials between repeated live pieces", () => {
    const set = new OpenSourceStauntonPieceSet();
    const first = set.create("knight", "white");
    const second = set.create("knight", "white");
    const a = []; const b = [];
    first.traverse((child) => { if (child.isMesh) a.push(child); });
    second.traverse((child) => { if (child.isMesh) b.push(child); });
    expect(first).not.toBe(second);
    expect(a.length).toBe(b.length);
    expect(a[0].geometry).toBe(b[0].geometry);
    expect(a[0].material).toBe(b[0].material);
    expect(countObjectTriangles(first)).toBe(countObjectTriangles(second));
  });

  it("keeps resource counts bounded for browser rendering", () => {
    const set = new OpenSourceStauntonPieceSet();
    for (const type of TYPES) {
      const resources = countUniquePieceResources(set.create(type, "white"));
      expect(resources.meshes).toBeGreaterThan(0);
      expect(resources.uniqueGeometries).toBeLessThanOrEqual(resources.meshes);
      expect(resources.uniqueMaterials).toBeLessThanOrEqual(4);
    }
  });

  it("uses contrasting light and dark satin PBR materials", () => {
    const set = new OpenSourceStauntonPieceSet();
    const signature = (object) => {
      const values = [];
      object.traverse((child) => {
        if (child.isMesh && child.material?.color) values.push([child.material.color.getHex(), child.material.metalness, child.material.roughness]);
      });
      return JSON.stringify(values.slice(0, 4));
    };
    expect(signature(set.create("king", "white"))).not.toBe(signature(set.create("king", "black")));
  });

  it("reports measured open-source v7 stats for all six pieces", () => {
    const set = new OpenSourceStauntonPieceSet();
    const stats = set.inspectAll();
    expect(stats.map((item) => item.type)).toEqual(TYPES);
    expect(OPEN_SOURCE_STAUNTON_REVISION).toContain("opensource-staunton-v7-sculpted");
    for (const item of stats) {
      expect(item.finite).toBe(true);
      expect(item.fitsLevel).toBe(true);
      expect(item.fitsCell).toBe(true);
      expect(item.style).toContain("Staunton");
      expect(item.triangles).toBeGreaterThan(1800);
      expect(item.triangles).toBeLessThan(30000);
    }
  });

  it("keeps the existing WebMCP compatibility constructor functional", () => {
    const compatible = new ForgeMcpPremiumPieceSet().create("pawn", "white");
    expect(compatible.userData.forgeVisualSource).toBe("open-source-staunton-v7-sculpted");
  });
});
