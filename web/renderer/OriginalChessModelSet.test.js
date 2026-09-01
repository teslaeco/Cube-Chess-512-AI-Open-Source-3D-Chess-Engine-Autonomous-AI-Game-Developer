import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  findImportedPiece,
  normalizeImportedPiece,
  ORIGINAL_CHESS_MODEL_URL,
  ORIGINAL_CHESS_SOURCE_ID,
} from "./OriginalChessModelSet.js";
import { pieceCellEnvelope } from "./pieceScaleProfile.js";
import { LEVEL_SPACING } from "./coordinates.js";

function bounds(object) {
  object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(object);
}

describe("original FBX chess-piece loading", () => {
  it("resolves the local repository FBX and exposes provenance", () => {
    expect(ORIGINAL_CHESS_MODEL_URL).toContain("/assets/original-chess-models/chess.fbx");
    expect(ORIGINAL_CHESS_MODEL_URL).not.toContain("undefined");
    expect(ORIGINAL_CHESS_SOURCE_ID).toBe("original-uploaded-chess-fbx");
  });

  it("finds named FBX groups as well as directly named meshes", () => {
    const scene = new THREE.Group();
    const namedGroup = new THREE.Group();
    namedGroup.name = "Pawn.000";
    namedGroup.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1)));
    scene.add(namedGroup);
    expect(findImportedPiece(scene, "pawn")).toBe(namedGroup);
  });

  it("centers a pawn, places it on Y=0 and fits the strict public 512-cell envelope", () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 10, 3));
    mesh.position.set(6, 8, -5);
    const normalized = normalizeImportedPiece(mesh, "pawn");
    const box = bounds(normalized);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const envelope = pieceCellEnvelope("pawn");

    expect(size.y).toBeLessThanOrEqual(envelope.maxHeight + 1e-6);
    expect(size.x).toBeLessThanOrEqual(envelope.maxFootprint + 1e-6);
    expect(size.z).toBeLessThanOrEqual(envelope.maxFootprint + 1e-6);
    expect(box.min.y).toBeCloseTo(0, 6);
    expect(center.x).toBeCloseTo(0, 6);
    expect(center.z).toBeCloseTo(0, 6);
  });

  it("keeps even the larger readable king below the next level", () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 7, 2));
    const normalized = normalizeImportedPiece(mesh, "king");
    const size = bounds(normalized).getSize(new THREE.Vector3());
    const envelope = pieceCellEnvelope("king");
    expect(size.y).toBeLessThanOrEqual(envelope.maxHeight + 1e-6);
    expect(LEVEL_SPACING - size.y * 1.1).toBeGreaterThanOrEqual(0.19 - 1e-6);
  });
});
