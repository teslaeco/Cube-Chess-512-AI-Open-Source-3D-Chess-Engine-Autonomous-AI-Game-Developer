import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CELL_RENDER_SIZE, LEVEL_SPACING } from "./coordinates.js";
import {
  OpenSourceStauntonPieceSet,
  ForgeMcpPremiumPieceSet,
  OPEN_SOURCE_STAUNTON_SAFE_FIT,
  OPEN_SOURCE_STAUNTON_REVISION,
  ORIGINAL_CHESS_SOURCE_ID,
  ORIGINAL_CHESS_MODEL_URL,
  countObjectTriangles,
  countUniquePieceResources,
} from "./ForgeMcpPremiumPieceSet.js";

const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];
const HEIGHT_ORDER = ["king", "queen", "bishop", "knight", "rook", "pawn"];

describe("Normal public open-source original-model v9 set", () => {
  it.each(TYPES)("starts %s with a safe sculpted fallback while the original FBX loads", (type) => {
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
    expect(object.userData.originalModelState).toBe("loading");
    expect(object.userData.originalChessSource).toBe(ORIGINAL_CHESS_SOURCE_ID);
  });

  it("preserves classical fallback height hierarchy before the FBX swap", () => {
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

  it("keeps at least 62 percent of a level clear in the loading fallback", () => {
    const set = new OpenSourceStauntonPieceSet();
    for (const type of TYPES) {
      const object = set.create(type, "black");
      object.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(object);
      expect(LEVEL_SPACING - bounds.max.y).toBeGreaterThanOrEqual(LEVEL_SPACING * 0.62 - 1e-6);
    }
  });

  it("keeps detailed geometry for all six roles during loading", () => {
    const set = new OpenSourceStauntonPieceSet();
    for (const type of TYPES) {
      const object = set.create(type, "white");
      expect(countObjectTriangles(object)).toBeGreaterThan(1800);
      expect(countObjectTriangles(object)).toBeLessThan(30000);
    }
  });

  it("shares immutable fallback geometry/materials between repeated pieces", () => {
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
  });

  it("keeps browser resource counts bounded during fallback", () => {
    const set = new OpenSourceStauntonPieceSet();
    for (const type of TYPES) {
      const resources = countUniquePieceResources(set.create(type, "white"));
      expect(resources.meshes).toBeGreaterThan(0);
      expect(resources.uniqueGeometries).toBeLessThanOrEqual(resources.meshes);
      expect(resources.uniqueMaterials).toBeLessThanOrEqual(4);
    }
  });

  it("declares the repository uploaded FBX as the real normal runtime source", () => {
    const set = new OpenSourceStauntonPieceSet();
    const stats = set.inspectAll();
    expect(stats.map((item) => item.type)).toEqual(TYPES);
    expect(OPEN_SOURCE_STAUNTON_REVISION).toContain("open-source-original-fbx-v9");
    expect(ORIGINAL_CHESS_SOURCE_ID).toBe("original-uploaded-chess-fbx");
    expect(ORIGINAL_CHESS_MODEL_URL).toContain("original-chess-models/chess.fbx");
    for (const item of stats) {
      expect(item.runtimePrimarySource).toBe(ORIGINAL_CHESS_SOURCE_ID);
      expect(item.runtimeAsset).toContain("chess.fbx");
      expect(item.freeForPublicRenderer).toBe(true);
      expect(item.triangles).toBeLessThan(30000);
    }
  });

  it("keeps the old internal compatibility constructor on the same free source", () => {
    const compatible = new ForgeMcpPremiumPieceSet();
    expect(compatible.inspect("pawn").runtimePrimarySource).toBe(ORIGINAL_CHESS_SOURCE_ID);
    expect(compatible.inspect("pawn").freeForPublicRenderer).toBe(true);
  });
});
