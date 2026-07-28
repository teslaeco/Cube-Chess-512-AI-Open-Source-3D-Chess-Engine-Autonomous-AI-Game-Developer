import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

export const ORIGINAL_CHESS_MODEL_URL = new URL(
  "../../assets/original-chess-models/chess.fbx?revision=20260728-fbx-only-2",
  import.meta.url,
).href;

const MAX_HEIGHT = 0.78;
const MAX_FOOTPRINT = 0.68;

const MODEL_NAMES = Object.freeze({
  pawn: [/^pawn(?:\.\d+)?$/i],
  rook: [/^rook(?:\.\d+)?$/i],
  knight: [/^knight(?:\.\d+)?$/i],
  bishop: [/^bishop(?:\.\d+)?$/i],
  queen: [/^que+en(?:\.\d+)?$/i],
  king: [/^king(?:\.\d+)?$/i],
});

function cleanFbxName(name) {
  return String(name ?? "").split("\u0000")[0].trim();
}

function containsRenderableMesh(object) {
  let found = false;
  object.traverse((child) => {
    if (child.isMesh && child.geometry?.attributes?.position?.count > 0) found = true;
  });
  return found;
}

function worldVolume(object) {
  object.updateWorldMatrix(true, true);
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0)) {
    return 0;
  }
  return size.x * size.y * size.z;
}

export function findImportedPiece(scene, type) {
  const patterns = MODEL_NAMES[type] ?? [];
  const candidates = [];

  scene.traverse((object) => {
    const name = cleanFbxName(object.name);
    if (!patterns.some((pattern) => pattern.test(name))) return;
    if (!containsRenderableMesh(object)) return;
    candidates.push(object);
  });

  candidates.sort((a, b) => worldVolume(b) - worldVolume(a));
  return candidates[0] ?? null;
}

function addOutline(group, color) {
  const meshes = [];
  group.traverse((child) => {
    if (child.isMesh && !child.userData.decorative) meshes.push(child);
  });

  for (const source of meshes) {
    const outline = new THREE.Mesh(
      source.geometry,
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    );
    outline.position.copy(source.position);
    outline.quaternion.copy(source.quaternion);
    outline.scale.copy(source.scale).multiplyScalar(1.008);
    outline.renderOrder = 30;
    outline.frustumCulled = false;
    outline.userData.decorative = true;
    source.parent.add(outline);
  }
}

export function normalizeImportedPiece(piece) {
  const group = new THREE.Group();
  group.add(piece);
  group.updateMatrixWorld(true);

  let bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("Original chess model has invalid bounds");
  }

  const scale = Math.min(
    MAX_HEIGHT / size.y,
    MAX_FOOTPRINT / size.x,
    MAX_FOOTPRINT / size.z,
  );
  group.scale.setScalar(scale);
  group.updateMatrixWorld(true);

  bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());
  group.position.set(-center.x, -bounds.min.y, -center.z);
  group.updateMatrixWorld(true);
  return group;
}

function cloneWithWorldTransform(source) {
  source.updateWorldMatrix(true, true);
  const model = source.clone(true);
  model.matrix.copy(source.matrixWorld);
  model.matrix.decompose(model.position, model.quaternion, model.scale);
  model.matrixAutoUpdate = true;
  return model;
}

function preparePiece(source, material, outlineColor, type, color) {
  const model = cloneWithWorldTransform(source);
  model.name = `${color}-${type}-original-source`;
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.material = material;
    child.castShadow = true;
    child.receiveShadow = true;
    child.frustumCulled = false;
  });

  const normalized = normalizeImportedPiece(model);
  normalized.name = `${color}-${type}-original`;
  addOutline(normalized, outlineColor);
  return normalized;
}

function createLoadingHitTarget(type, color) {
  const geometry = new THREE.CylinderGeometry(0.28, 0.34, 0.72, 12);
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    colorWrite: false,
  });
  const target = new THREE.Mesh(geometry, material);
  target.name = `${color}-${type}-loading-hit-target`;
  target.position.y = 0.36;
  target.userData.loadingHitTarget = true;
  target.frustumCulled = false;
  return target;
}

function setLoadState(holder, state, error = null) {
  holder.originalModelState = state;
  holder.userData.originalModelState = state;
  if (error) {
    const message = String(error?.message ?? error);
    holder.originalModelError = message;
    holder.userData.originalModelError = message;
  } else {
    delete holder.originalModelError;
    delete holder.userData.originalModelError;
  }
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

  create(type, color) {
    const holder = new THREE.Group();
    holder.name = `${color}-${type}`;
    setLoadState(holder, "loading");
    holder.add(createLoadingHitTarget(type, color));

    this.loadScene()
      .then((scene) => {
        const source = findImportedPiece(scene, type);
        if (!source) {
          const availableNames = [];
          scene.traverse((object) => {
            const name = cleanFbxName(object.name);
            if (name && containsRenderableMesh(object)) availableNames.push(name);
          });
          throw new Error(
            `The FBX scene does not contain a complete ${type} object. Available renderable names: ${[...new Set(availableNames)].join(", ")}`,
          );
        }

        const model = preparePiece(
          source,
          this.materials[color],
          color === "white" ? 0x202733 : 0xc8d3df,
          type,
          color,
        );
        holder.clear();
        holder.add(model);
        setLoadState(holder, "ready");
      })
      .catch((error) => {
        holder.clear();
        setLoadState(holder, "error", error);
        console.error(
          `Cube Chess failed to load the required original ${type} model from ${ORIGINAL_CHESS_MODEL_URL}. No procedural fallback is permitted.`,
          error,
        );
      });

    return holder;
  }
}
