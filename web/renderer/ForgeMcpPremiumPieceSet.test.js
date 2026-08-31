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

describe("Normal public open-source reference-guided v9 set", () => {
  it.each(TYPES)("builds %s entirely from generated geometry inside one 512-cell envelope", (type) => {
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
    expect(size.x).toBeLessThanOrEqual(CELL_RENDER_SIZE * 0.33 + 1e-6);
    expect(size.z).toBeLessThanOrEqual(CELL_RENDER_SIZE * 0.33 + 1e-6);
    expect(triangles).toBeGreaterThan(1800);
    expect(triangles).toBeLessThan(30000);
    expect(object.userData.referenceAssetsPolicy).toBe("reference-only-not-runtime");
    expect(object.userData.forgeVisualSource).toBe("open-source-reference-guided-generated-v9");
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

  it("keeps at least 62 percent of a level clear above every piece", () => {
    const set = new OpenSourceStauntonPieceSet();
    for (const type of TYPES) {
      const object = set.create(type, "black");
      object.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(object);
      expect(LEVEL_SPACING - bounds.max.y).toBeGreaterThanOrEqual(LEVEL_SPACING * 0.62 - 1e-6);
    }
  });

  it("replaces pencil-like knight mane with backward-following faceted mane plates", () => {
    const knight = new OpenSourceStauntonPieceSet().create("knight", "black");
    const plates = [];
    knight.traverse((child) => {
      if (child.userData?.openSourceStauntonRole === "mane-plate") plates.push(child);
    });
    expect(plates.length).toBe(10);
    expect(plates.every((plate) => plate.geometry?.isBufferGeometry)).toBe(true);
    expect(plates[0].position.y).toBeLessThan(plates.at(-1).position.y);
  });

  it("adds new modeled detail to all six roles", () => {
    const set = new OpenSourceStauntonPieceSet();
    const rolesFor = (type) => {
      const roles = [];
      set.create(type, "white").traverse((child) => {
        if (child.userData?.openSourceStauntonRole) roles.push(child.userData.openSourceStauntonRole);
      });
      return roles;
    };
    expect(rolesFor("pawn")).toContain("pawn-facet");
    expect(rolesFor("rook")).toContain("rook-buttress");
    expect(rolesFor("knight")).toContain("knight-cheek-facet");
    expect(rolesFor("bishop")).toContain("bishop-rib");
    expect(rolesFor("queen")).toContain("queen-crown-facet");
    expect(rolesFor("king")).toContain("king-cross-facet");
  });

  it("keeps browser geometry below the existing triangle ceiling", () => {
    const set = new OpenSourceStauntonPieceSet();
    for (const type of TYPES) {
      expect(countObjectTriangles(set.create(type, "white"))).toBeLessThan(30000);
    }
  });

  it("keeps browser resource counts bounded", () => {
    const set = new OpenSourceStauntonPieceSet();
    for (const type of TYPES) {
      const resources = countUniquePieceResources(set.create(type, "white"));
      expect(resources.meshes).toBeGreaterThan(0);
      expect(resources.uniqueGeometries).toBeLessThanOrEqual(resources.meshes);
      expect(resources.uniqueMaterials).toBeLessThanOrEqual(5);
    }
  });

  it("reports generated source and reference-only asset policy for all pieces", () => {
    const set = new OpenSourceStauntonPieceSet();
    const stats = set.inspectAll();
    expect(stats.map((item) => item.type)).toEqual(TYPES);
    expect(OPEN_SOURCE_STAUNTON_REVISION).toContain("reference-guided-v9");
    for (const item of stats) {
      expect(item.runtimePrimarySource).toBe("open-source-reference-guided-generated-v9");
      expect(item.referenceAssetsPolicy).toBe("reference-only-not-runtime");
      expect(item.freeForPublicRenderer).toBe(true);
      expect(item.triangles).toBeLessThan(30000);
      expect(item.finite).toBe(true);
      expect(item.fitsLevel).toBe(true);
      expect(item.fitsCell).toBe(true);
    }
  });

  it("keeps the old internal compatibility constructor on the same free generated source", () => {
    const compatible = new ForgeMcpPremiumPieceSet();
    expect(compatible.inspect("pawn").runtimePrimarySource).toBe("open-source-reference-guided-generated-v9");
    expect(compatible.inspect("pawn").freeForPublicRenderer).toBe(true);
  });
});
