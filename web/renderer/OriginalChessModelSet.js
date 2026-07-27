import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

export const ORIGINAL_CHESS_MODEL_URL = new URL(
  "assets/original-chess-models/chess.fbx",
  document.baseURI,
).href;

const MAX_HEIGHT = 0.78;
const MAX_FOOTPRINT = 0.68;

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

function findPiece(scene, type) {
  const patterns = MODEL_NAMES[type] ?? [];
  let result = null;
  scene.traverse((object) => {
    if (result || !object.isMesh) return;
    const name = cleanFbxName(object.name);
    if (patterns.some((pattern) => pattern.test(name))) result = object;
  });
  return result;
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
        opacity: 0.38,
        depthWrite: false,
      }),
    );
    outline.position.copy(source.position);
    outline.rotation.copy(source.rotation);
    outline.scale.copy(source.scale).multiplyScalar(1.018);
    outline.renderOrder = 30;
    outline.userData.decorative = true;
    source.parent.add(outline);
  }
}

export function normalizeImportedPiece(piece) {
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

function preparePiece(source, material, outlineColor, type, color) {
  const mesh = source.clone(true);
  mesh.name = `${color}-${type}-original-mesh`;
  mesh.traverse((child) => {
    if (!child.isMesh) return;
    child.material = material;
    child.castShadow = true;
    child.receiveShadow = true;
  });

  const normalized = normalizeImportedPiece(mesh);
  normalized.name = `${color}-${type}-original`;
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
      this.scenePromise = this.loader.loadAsync(ORIGINAL_CHESS_MODEL_URL);
    }
    return this.scenePromise;
  }

  create(type, color, fallback) {
    const holder = new THREE.Group();
    holder.name = `${color}-${type}`;
    holder.userData.originalModelState = "loading";
    holder.add(fallback);

    this.loadScene()
      .then((scene) => {
        if (!holder.parent) return;
        const source = findPiece(scene, type);
        if (!source) throw new Error(`The FBX scene does not contain a ${type} mesh`);
        const model = preparePiece(
          source,
          this.materials[color],
          color === "white" ? 0x202733 : 0xc8d3df,
          type,
          color,
        );
        holder.clear();
        holder.add(model);
        holder.userData.originalModelState = "ready";
      })
      .catch((error) => {
        holder.userData.originalModelState = "fallback";
        holder.userData.originalModelError = String(error?.message ?? error);
        console.warn(`Cube Chess could not load the original ${type} model.`, error);
      });

    return holder;
  }
}
