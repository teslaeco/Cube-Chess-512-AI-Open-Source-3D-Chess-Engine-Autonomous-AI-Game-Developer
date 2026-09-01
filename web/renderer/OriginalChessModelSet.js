import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { pieceCellEnvelope } from "./pieceScaleProfile.js";

const MODEL_REVISION = "20260901-1";
export const ORIGINAL_CHESS_SOURCE_ID = "original-uploaded-chess-fbx";

const PUBLIC_BASE = import.meta.env?.BASE_URL ?? "/";
export const ORIGINAL_CHESS_MODEL_URL = `${PUBLIC_BASE}assets/original-chess-models/chess.fbx?v=${MODEL_REVISION}`;

const MODEL_NAMES = Object.freeze({
  pawn: [/^Pawn(?:\.\d+)?$/i],
  rook: [/^Rook(?:\.\d+)?$/i],
  knight: [/^Knight(?:\.\d+)?$/i],
  bishop: [/^bishop(?:\.\d+)?$/i],
  queen: [/^queeen(?:\.\d+)?$/i, /^queen(?:\.\d+)?$/i],
  king: [/^king(?:\.\d+)?$/i],
});

function cleanFbxName(name) {
  return String(name ?? "").split("\u0000")[0];
}

function hasRenderableMesh(object) {
  let found = false;
  object.traverse((child) => {
    if (child.isMesh && child.geometry) found = true;
  });
  return found;
}

function objectVolume(object) {
  object.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0)) return 0;
  return size.x * size.y * size.z;
}

export function findImportedPiece(scene, type) {
  const patterns = MODEL_NAMES[type] ?? [];
  const candidates = [];
  scene.traverse((object) => {
    const name = cleanFbxName(object.name);
    if (!patterns.some((pattern) => pattern.test(name))) return;
    if (!hasRenderableMesh(object)) return;
    candidates.push(object);
  });
  candidates.sort((left, right) => objectVolume(right) - objectVolume(left));
  return candidates[0] ?? null;
}

function addOutline(group, color) {
  const meshes = [];
  group.traverse((child) => {
    if (child.isMesh && !child.userData.decorative) meshes.push(child);
  });
  const outlineMaterial = new THREE.MeshBasicMaterial({
    color,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  for (const source of meshes) {
    const outline = new THREE.Mesh(source.geometry, outlineMaterial);
    outline.position.copy(source.position);
    outline.quaternion.copy(source.quaternion);
    outline.scale.copy(source.scale).multiplyScalar(1.008);
    outline.renderOrder = 30;
    outline.userData.decorative = true;
    source.parent.add(outline);
  }
}

export function normalizeImportedPiece(piece, type = "pawn") {
  const envelope = pieceCellEnvelope(type);
  const group = new THREE.Group();
  group.add(piece);
  piece.position.set(0, 0, 0);
  group.updateMatrixWorld(true);

  let bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("Original chess model has invalid bounds");
  }

  const scale = Math.min(
    envelope.maxHeight / size.y,
    envelope.maxFootprint / size.x,
    envelope.maxFootprint / size.z,
  );
  group.scale.setScalar(scale);
  group.updateMatrixWorld(true);

  bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());
  group.position.set(-center.x, -bounds.min.y, -center.z);
  group.updateMatrixWorld(true);

  // Hard post-normalization guard. A bad source transform must never leak into another cell/level.
  const finalSize = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
  if (finalSize.y > envelope.maxHeight + 1e-6 || finalSize.x > envelope.maxFootprint + 1e-6 || finalSize.z > envelope.maxFootprint + 1e-6) {
    throw new Error(`Normalized ${type} exceeds its 512-cell envelope`);
  }
  return group;
}

function preparePiece(source, material, outlineColor, type, color) {
  const model = source.clone(true);
  model.name = `${color}-${type}-original-source`;
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.material = material;
    child.castShadow = true;
    child.receiveShadow = true;
    child.frustumCulled = false;
    child.userData.openSourceOriginalChessMesh = true;
  });

  const normalized = normalizeImportedPiece(model, type);
  normalized.name = `${color}-${type}-original`;
  normalized.userData.openSourceOriginalChessAsset = true;
  normalized.userData.originalChessSource = ORIGINAL_CHESS_SOURCE_ID;
  addOutline(normalized, outlineColor);
  return normalized;
}

export class OriginalChessModelSet {
  constructor(materials) {
    this.materials = materials;
    this.loader = new FBXLoader();
    this.scenePromise = null;
  }

  loadScene() {
    if (!this.scenePromise) {
      this.scenePromise = this.loader.loadAsync(ORIGINAL_CHESS_MODEL_URL).then((scene) => {
        scene.updateMatrixWorld(true);
        return scene;
      });
    }
    return this.scenePromise;
  }

  create(type, color, fallback) {
    const holder = new THREE.Group();
    holder.name = `${color}-${type}`;
    holder.userData.originalModelState = "loading";
    holder.userData.forgeVisualSource = "open-source-procedural-fallback-loading";
    holder.userData.originalAssetUrl = ORIGINAL_CHESS_MODEL_URL;
    holder.userData.originalChessSource = ORIGINAL_CHESS_SOURCE_ID;
    holder.add(fallback);

    this.loadScene()
      .then((scene) => {
        const source = findImportedPiece(scene, type);
        if (!source) throw new Error(`The FBX scene does not contain a complete ${type} object`);
        const model = preparePiece(
          source,
          this.materials[color],
          color === "white" ? 0x303844 : 0xc0cad3,
          type,
          color,
        );
        holder.clear();
        holder.add(model);
        holder.userData.originalModelState = "ready";
        holder.userData.forgeVisualSource = ORIGINAL_CHESS_SOURCE_ID;
        holder.userData.openSourceOriginalChessAsset = true;
      })
      .catch((error) => {
        holder.userData.originalModelState = "fallback";
        holder.userData.forgeVisualSource = "open-source-procedural-fallback";
        holder.userData.originalModelError = String(error?.message ?? error);
        console.warn(`Cube Chess could not load the original ${type} model from ${ORIGINAL_CHESS_MODEL_URL}.`, error);
      });

    return holder;
  }
}
