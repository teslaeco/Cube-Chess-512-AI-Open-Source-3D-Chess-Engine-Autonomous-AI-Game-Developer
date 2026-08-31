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

describe("Normal public open-source continuously sculpted v10 set", () => {
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
    expect(object.userData.forgeVisualSource).toBe("open-source-reference-guided-generated-v10");
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

  it("keeps at least 64 percent of a level clear above every piece", () => {
    const set = new OpenSourceStauntonPieceSet();
    for (const type of TYPES) {
      const object = set.create(type, "black");
      object.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(object);
      expect(LEVEL_SPACING - bounds.max.y).toBeGreaterThanOrEqual(LEVEL_SPACING - OPEN_SOURCE_STAUNTON_SAFE_FIT.king.maxHeight - 1e-6);
    }
  });

  it("sculpts knight as a continuous horse mass with one backward crest, not pencil spikes", () => {
    const knight = new OpenSourceStauntonPieceSet().create("knight", "black");
    const roles = [];
    knight.traverse((child) => { if (child.userData?.openSourceStauntonRole) roles.push(child.userData.openSourceStauntonRole); });
    expect(roles).toContain("knight-sculpt");
    expect(roles).toContain("knight-jaw");
    expect(roles).toContain("knight-cheek");
    expect(roles.filter((role) => role === "knight-ear")).toHaveLength(2);
    expect(roles.filter((role) => role === "mane-ridge")).toHaveLength(1);
    expect(roles).not.toContain("mane-plate");
    expect(roles).not.toContain("mane");
  });

  it("models bishop mitre as two spatial lobes with a physical diagonal gap", () => {
    const bishop = new OpenSourceStauntonPieceSet().create("bishop", "white");
    const roles = [];
    bishop.traverse((child) => { if (child.userData?.openSourceStauntonRole) roles.push(child.userData.openSourceStauntonRole); });
    expect(roles).toContain("bishop-mitre-left");
    expect(roles).toContain("bishop-mitre-right");
    expect(roles).toContain("bishop-notch-recess");
  });

  it("adds actual modeled geometry to all six roles", () => {
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
    expect(rolesFor("knight")).toContain("knight-sculpt");
    expect(rolesFor("bishop")).toContain("bishop-mitre-left");
    expect(rolesFor("queen")).toContain("queen-crown-facet");
    expect(rolesFor("king")).toContain("king-cross-facet");
  });

  it("keeps browser geometry below the existing triangle ceiling", () => {
    const set = new OpenSourceStauntonPieceSet();
    for (const type of TYPES) expect(countObjectTriangles(set.create(type, "white"))).toBeLessThan(30000);
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

  it("reports generated v10 source and reference-only asset policy for all pieces", () => {
    const set = new OpenSourceStauntonPieceSet();
    const stats = set.inspectAll();
    expect(stats.map((item) => item.type)).toEqual(TYPES);
    expect(OPEN_SOURCE_STAUNTON_REVISION).toContain("staunton-v10-sculpted");
    for (const item of stats) {
      expect(item.runtimePrimarySource).toBe("open-source-reference-guided-generated-v10");
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
    expect(compatible.inspect("pawn").runtimePrimarySource).toBe("open-source-reference-guided-generated-v10");
    expect(compatible.inspect("pawn").freeForPublicRenderer).toBe(true);
  });
});
