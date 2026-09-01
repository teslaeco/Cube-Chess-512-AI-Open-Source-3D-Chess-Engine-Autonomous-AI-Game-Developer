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
import { getRoleTexture } from "./OpenSourceStauntonV12PieceSet.js";

const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];
const HEIGHT_ORDER = ["king", "queen", "bishop", "knight", "rook", "pawn"];

function rolesOf(object) {
  const roles = [];
  object.traverse((child) => {
    if (child.userData?.openSourceStauntonRole) roles.push(child.userData.openSourceStauntonRole);
  });
  return roles;
}

describe("Normal public open-source Staunton v13 silhouette pass", () => {
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
    expect(object.userData.forgeVisualSource).toBe("open-source-staunton-v13-silhouette-pass");
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

  it("removes the slab-like knight mane while preserving horse anatomy", () => {
    const knight = new OpenSourceStauntonPieceSet().create("knight", "black");
    const roles = rolesOf(knight);
    expect(roles).toContain("knight-sculpt");
    expect(roles).toContain("knight-jaw");
    expect(roles).toContain("knight-cheek");
    expect(roles.filter((role) => role === "knight-ear")).toHaveLength(2);
    expect(roles.filter((role) => role === "knight-eye")).toHaveLength(2);
    expect(roles).toContain("knight-nostril");
    expect(roles.filter((role) => role === "knight-mane")).toHaveLength(1);
    expect(roles.filter((role) => role === "knight-mane-trim")).toHaveLength(1);
    expect(roles).toContain("knight-muzzle-refined");
    expect(roles).toContain("knight-mouth");
    expect(roles).not.toContain("mane-plate");
    expect(roles).not.toContain("mane-ridge");
  });

  it("keeps bishop as two volumetric mitre lobes with a narrow diagonal slit", () => {
    const bishop = new OpenSourceStauntonPieceSet().create("bishop", "white");
    const roles = rolesOf(bishop);
    expect(roles).toContain("bishop-mitre-left");
    expect(roles).toContain("bishop-mitre-right");
    expect(roles.filter((role) => role === "bishop-slit")).toHaveLength(1);
    expect(roles.filter((role) => role === "bishop-gem")).toHaveLength(1);
  });

  it("keeps rook, queen and king unmistakable at the crown", () => {
    const set = new OpenSourceStauntonPieceSet();
    expect(rolesOf(set.create("rook", "black")).filter((r) => r === "rook-battlement")).toHaveLength(8);
    expect(rolesOf(set.create("rook", "black"))).toContain("rook-crown-trim");
    expect(rolesOf(set.create("queen", "black")).filter((r) => r === "queen-crown-point")).toHaveLength(8);
    expect(rolesOf(set.create("queen", "black")).filter((r) => r === "queen-gem")).toHaveLength(8);
    expect(rolesOf(set.create("king", "black")).filter((r) => r === "king-cross")).toHaveLength(1);
    expect(rolesOf(set.create("king", "black"))).toContain("king-crown-trim");
  });

  it("keeps twelve compact role-specific color maps: six roles by two sides", () => {
    const textures = [];
    for (const side of ["white", "black"]) {
      for (const type of TYPES) {
        const texture = getRoleTexture(type, side);
        textures.push(texture);
        expect(texture.image.width).toBe(128);
        expect(texture.image.height).toBe(128);
        expect(texture.userData.type).toBe(type);
        expect(texture.userData.side).toBe(side);
      }
    }
    expect(new Set(textures.map((texture) => texture.uuid)).size).toBe(12);
  });

  it("keeps compact physical PBR maps and browser resource budgets", () => {
    const set = new OpenSourceStauntonPieceSet();
    for (const side of ["white", "black"]) {
      for (const type of TYPES) {
        const object = set.create(type, side);
        expect(countObjectTriangles(object)).toBeLessThan(30000);
        const resources = countUniquePieceResources(object);
        expect(resources.meshes).toBeGreaterThan(0);
        expect(resources.uniqueMaterials).toBeLessThanOrEqual(4);
        expect(resources.uniqueTextures).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("reports v13 as the free normal runtime source", () => {
    const set = new OpenSourceStauntonPieceSet();
    expect(OPEN_SOURCE_STAUNTON_REVISION).toContain("staunton-v13-silhouette-pass");
    for (const item of set.inspectAll()) {
      expect(item.runtimePrimarySource).toBe("open-source-staunton-v13-silhouette-pass");
      expect(item.referenceAssetsPolicy).toBe("reference-only-not-runtime");
      expect(item.freeForPublicRenderer).toBe(true);
      expect(item.triangles).toBeLessThan(30000);
      expect(item.finite).toBe(true);
      expect(item.fitsLevel).toBe(true);
      expect(item.fitsCell).toBe(true);
    }
  });

  it("keeps historical WebMCP constructor on the same free v13 source", () => {
    const compatible = new ForgeMcpPremiumPieceSet();
    expect(compatible.inspect("pawn").runtimePrimarySource).toBe("open-source-staunton-v13-silhouette-pass");
  });
});
