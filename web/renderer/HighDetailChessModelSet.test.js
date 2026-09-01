import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { decodeBase64Bytes, parseCompactChessGeometry } from "./MeshyChessModelSet.js";
import {
  HIGH_DETAIL_CHESS_MODEL_URLS,
  HIGH_DETAIL_CHESS_REVISION,
  HIGH_DETAIL_CHESS_SOURCE_ID,
  prepareHighDetailPiece,
} from "./HighDetailChessModelSet.js";
import { pieceCellEnvelope } from "./pieceScaleProfile.js";

const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];

async function assetGeometry(type) {
  const assetUrl = new URL(`../../public/assets/high-detail-chess-models/${type}.ccm.b64`, import.meta.url);
  const encoded = await readFile(assetUrl, "utf8");
  return parseCompactChessGeometry(decodeBase64Bytes(encoded));
}

describe("owner-uploaded high-detail chess models", () => {
  it("publishes all six versioned browser assets", () => {
    expect(HIGH_DETAIL_CHESS_REVISION).toContain("uploaded-glb");
    expect(HIGH_DETAIL_CHESS_SOURCE_ID).toBe("owner-uploaded-meshy-high-detail");
    for (const type of TYPES) {
      expect(HIGH_DETAIL_CHESS_MODEL_URLS[type]).toContain(`high-detail-chess-models/${type}.ccm.b64`);
    }
  });

  it("retains tens of thousands of vertices and triangles from every supplied GLB", async () => {
    for (const type of TYPES) {
      const geometry = await assetGeometry(type);
      expect(geometry.attributes.position.count, `${type} vertices`).toBeGreaterThan(35_000);
      expect(geometry.attributes.position.count, `${type} 16-bit index safety`).toBeLessThanOrEqual(65_535);
      expect(geometry.index.count / 3, `${type} triangles`).toBeGreaterThan(70_000);
      expect(geometry.index.count / 3, `${type} triangle ceiling`).toBeLessThan(120_000);
    }
  });

  it("fits every high-detail silhouette to the larger readable cell envelopes", async () => {
    const material = new THREE.MeshPhysicalMaterial({ color: 0xffffff });
    material.userData.forgeSharedPieceMaterial = true;
    for (const type of TYPES) {
      const object = prepareHighDetailPiece(await assetGeometry(type), material, type, "white");
      object.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(object);
      const size = bounds.getSize(new THREE.Vector3());
      const envelope = pieceCellEnvelope(type);
      expect(size.y, `${type} height`).toBeCloseTo(envelope.maxHeight, 5);
      expect(Math.max(size.x, size.z), `${type} footprint`).toBeCloseTo(envelope.maxFootprint, 5);
      expect(bounds.min.y, `${type} rests on board`).toBeCloseTo(0, 6);
    }
  });

  it("shares heavy geometry but isolates materials for per-piece selection highlights", async () => {
    const geometry = await assetGeometry("knight");
    const material = new THREE.MeshPhysicalMaterial({ color: 0xffffff });
    const first = prepareHighDetailPiece(geometry, material, "knight", "white");
    const second = prepareHighDetailPiece(geometry, material, "knight", "white");
    const firstMesh = first.getObjectByProperty("isMesh", true);
    const secondMesh = second.getObjectByProperty("isMesh", true);
    expect(firstMesh.geometry).toBe(secondMesh.geometry);
    expect(firstMesh.material).not.toBe(secondMesh.material);
    expect(firstMesh.material.userData.forgeSharedPieceMaterial).toBe(false);
    expect(firstMesh.material.userData.forgePieceInstanceMaterial).toBe(true);
    firstMesh.material.emissive.setHex(0x2f7dff);
    expect(secondMesh.material.emissive.getHex()).toBe(0x000000);
  });

  it("keeps a selected 1.1x king below the following level", () => {
    const king = pieceCellEnvelope("king");
    expect(king.maxHeight * 1.1).toBeLessThan(1.25);
    expect(king.maxFootprint * 1.1).toBeLessThan(1.2);
  });
});
