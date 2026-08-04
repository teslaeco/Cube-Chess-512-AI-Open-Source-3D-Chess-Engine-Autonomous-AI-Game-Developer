import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  decodeBase64Bytes,
  MESHY_MODEL_URLS,
  parseCompactChessGeometry,
} from "./MeshyChessModelSet.js";

const MODEL_NAMES = ["pawn", "rook", "knight", "bishop", "queen", "king"];

function localAsset(type, part) {
  return new URL(
    `../../public/assets/meshy-chess-models/${type}.ccm.b64.part${part}`,
    import.meta.url,
  );
}

function encodedAsset(type) {
  return Array.from({ length: 4 }, (_, index) =>
    readFileSync(localAsset(type, index + 1), "utf8"),
  ).join("");
}

describe("Meshy compact chess model set", () => {
  it("registers four cacheable asset parts for every chess piece type", () => {
    expect(Object.keys(MESHY_MODEL_URLS)).toEqual(MODEL_NAMES);
    for (const type of MODEL_NAMES) {
      expect(MESHY_MODEL_URLS[type]).toHaveLength(4);
      expect(MESHY_MODEL_URLS[type][0]).toContain(`${type}.ccm.b64.part1`);
      expect(MESHY_MODEL_URLS[type][3]).toContain(`${type}.ccm.b64.part4`);
    }
  });

  it.each(MODEL_NAMES)("decodes and validates the optimized %s model", (type) => {
    const encoded = encodedAsset(type);
    const geometry = parseCompactChessGeometry(decodeBase64Bytes(encoded));
    const stats = geometry.userData.compactChessModel;

    expect(stats.vertexCount).toBeGreaterThan(1_300);
    expect(stats.vertexCount).toBeLessThanOrEqual(1_600);
    expect(stats.triangleCount).toBeGreaterThan(2_700);
    expect(stats.triangleCount).toBeLessThanOrEqual(3_200);
    expect(geometry.boundingBox).not.toBeNull();
    expect(geometry.boundingSphere).not.toBeNull();
    expect(geometry.getAttribute("normal").count).toBe(stats.vertexCount);
  });

  it("rejects damaged compact model data", () => {
    expect(() => parseCompactChessGeometry(new Uint8Array(40))).toThrow(/signature/i);
  });
});
