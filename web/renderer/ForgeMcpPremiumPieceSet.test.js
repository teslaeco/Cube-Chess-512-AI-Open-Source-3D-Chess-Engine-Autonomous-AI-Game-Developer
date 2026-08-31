import * as THREE from "three";
import { describe, expect, it } from "vitest";
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

function rolesOf(object) {
  const roles = [];
  object.traverse((child) => {
    if (child.userData?.openSourceStauntonRole) roles.push(child.userData.openSourceStauntonRole);
  });
  return roles;
}

describe("Normal public open-source art-directed Staunton v11 set", () => {
  it.each(TYPES)("builds %s inside one strict 512-cell envelope", (type) => {
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
    expect(triangles).toBeGreaterThan(1500);
    expect(triangles).toBeLessThan(30000);
    expect(object.userData.referenceAssetsPolicy).toBe("reference-only-not-runtime");
    expect(object.userData.forgeVisualSource).toBe("open-source-staunton-v11-art-directed");
  });

  it("preserves classical descending height hierarchy", () => {
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

  it("sculpts knight as horse anatomy with one continuous mane plate", () => {
    const knight = new OpenSourceStauntonPieceSet().create("knight", "black");
    const roles = rolesOf(knight);
    expect(roles).toContain("knight-body");
    expect(roles).toContain("knight-jaw");
    expect(roles.filter((role) => role === "knight-ear")).toHaveLength(2);
    expect(roles).toContain("knight-eye");
    expect(roles).toContain("knight-nostril");
    expect(roles.filter((role) => role === "knight-mane")).toHaveLength(1);
    expect(roles).not.toContain("mane-plate");
    expect(roles).not.toContain("mane-ridge");
  });

  it("models bishop as two mitre lobes with an actual diagonal slit volume", () => {
    const bishop = new OpenSourceStauntonPieceSet().create("bishop", "white");
    const roles = rolesOf(bishop);
    expect(roles).toContain("bishop-mitre-left");
    expect(roles).toContain("bishop-mitre-right");
    expect(roles).toContain("bishop-slit");
    expect(roles).toContain("bishop-gem");
  });

  it("gives rook, queen and king recognizable modeled top geometry", () => {
    const set = new OpenSourceStauntonPieceSet();
    expect(rolesOf(set.create("rook", "black")).filter((r) => r === "rook-battlement")).toHaveLength(8);
    expect(rolesOf(set.create("queen", "black")).filter((r) => r === "queen-crown")).toHaveLength(8);
    expect(rolesOf(set.create("king", "black")).filter((r) => r === "king-cross")).toHaveLength(2);
  });

  it("uses real compact procedural PBR texture maps on both sides", () => {
    const set = new OpenSourceStauntonPieceSet();
    for (const color of ["white", "black"]) {
      const pawn = set.create("pawn", color);
      const textured = [];
      pawn.traverse((child) => {
        if (child.isMesh && child.material?.map && child.material?.roughnessMap) textured.push(child.material);
      });
      expect(textured.length).toBeGreaterThan(0);
      expect(textured[0].map.image.width).toBe(128);
      expect(textured[0].roughnessMap.image.width).toBe(64);
    }
  });

  it("keeps browser geometry and resource counts bounded", () => {
    const set = new OpenSourceStauntonPieceSet();
    for (const type of TYPES) {
      const object = set.create(type, "white");
      expect(countObjectTriangles(object)).toBeLessThan(30000);
      const resources = countUniquePieceResources(object);
      expect(resources.meshes).toBeGreaterThan(0);
      expect(resources.uniqueMaterials).toBeLessThanOrEqual(4);
    }
  });

  it("reports v11 as the free normal runtime source", () => {
    const set = new OpenSourceStauntonPieceSet();
    expect(OPEN_SOURCE_STAUNTON_REVISION).toContain("staunton-v11-art-directed");
    for (const item of set.inspectAll()) {
      expect(item.runtimePrimarySource).toBe("open-source-staunton-v11-art-directed");
      expect(item.referenceAssetsPolicy).toBe("reference-only-not-runtime");
      expect(item.freeForPublicRenderer).toBe(true);
      expect(item.triangles).toBeLessThan(30000);
      expect(item.finite).toBe(true);
      expect(item.fitsLevel).toBe(true);
      expect(item.fitsCell).toBe(true);
    }
  });

  it("keeps historical WebMCP constructor on the same free v11 source", () => {
    const compatible = new ForgeMcpPremiumPieceSet();
    expect(compatible.inspect("pawn").runtimePrimarySource).toBe("open-source-staunton-v11-art-directed");
  });
});
