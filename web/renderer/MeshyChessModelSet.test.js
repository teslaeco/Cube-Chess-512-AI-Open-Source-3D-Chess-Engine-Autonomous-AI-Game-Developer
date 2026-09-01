import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  decodeBase64Bytes,
  MESHY_MODEL_URLS,
  parseCompactChessGeometry,
} from "./MeshyChessModelSet.js";

const MODEL_NAMES = ["pawn", "rook", "knight", "bishop", "queen", "king"];

function localAsset(type) {
  return new URL(`../../public/assets/meshy-chess-models/${type}.ccm.b64`, import.meta.url);
}

describe("Meshy compact chess model set", () => {
  it("registers one cacheable asset for every chess piece type", () => {
    expect(Object.keys(MESHY_MODEL_URLS)).toEqual(MODEL_NAMES);
    for (const type of MODEL_NAMES) {
      expect(MESHY_MODEL_URLS[type]).toContain(`${type}.ccm.b64`);
      expect(MESHY_MODEL_URLS[type]).not.toContain("undefined");
      expect(MESHY_MODEL_URLS[type]).toContain("/assets/meshy-chess-models/");
    }
  });

  it.each(MODEL_NAMES)("decodes and validates the optimized %s model", (type) => {
    const encoded = readFileSync(localAsset(type), "utf8");
    const geometry = parseCompactChessGeometry(decodeBase64Bytes(encoded));
    const stats = geometry.userData.compactChessModel;

    expect(stats.vertexCount).toBeGreaterThan(380);
    expect(stats.vertexCount).toBeLessThanOrEqual(450);
    expect(stats.triangleCount).toBeGreaterThan(800);
    expect(stats.triangleCount).toBeLessThanOrEqual(920);
    expect(geometry.boundingBox).not.toBeNull();
    expect(geometry.boundingSphere).not.toBeNull();
    expect(geometry.getAttribute("normal").count).toBe(stats.vertexCount);
  });

  it("rejects damaged compact model data", () => {
    expect(() => parseCompactChessGeometry(new Uint8Array(40))).toThrow(/signature/i);
  });
});
