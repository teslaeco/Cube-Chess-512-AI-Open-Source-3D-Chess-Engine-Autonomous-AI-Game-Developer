import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const MODEL_URL =
  "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@2bac6f8c57bf471df0d2a1e8a8ec023c7801dddf/Models/ABeautifulGame/glTF-Binary/ABeautifulGame.glb";
const MAX_HEIGHT = 1.02;
const MAX_FOOTPRINT = 0.92;

function addOutline(group, color) {
  const meshes = [];
  group.traverse((child) => {
    if (child.isMesh) meshes.push(child);
  });
  for (const child of meshes) {
    const outline = new THREE.Mesh(
      child.geometry,
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
    );
    outline.position.copy(child.position);
    outline.rotation.copy(child.rotation);
    outline.scale.copy(child.scale).multiplyScalar(1.018);
    outline.renderOrder = 30;
    outline.userData.decorative = true;
    child.parent.add(outline);
  }
}

export function fitObjectInsideCell(model, {
  maxHeight = MAX_HEIGHT,
  maxFootprint = MAX_FOOTPRINT,
} = {}) {
  model.position.set(0, 0, 0);
  model.scale.setScalar(1);
  model.updateMatrixWorld(true);

  let bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("The external knight has invalid bounds");
  }

  const scale = Math.min(
    maxHeight / size.y,
    maxFootprint / size.x,
    maxFootprint / size.z,
  );
  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);

  bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= bounds.min.y;
  model.updateMatrixWorld(true);
  return model;
}

function normalizeKnight(source, material, outlineColor) {
  const model = source.clone(true);
  model.rotation.set(0, 0, 0);

  model.traverse((child) => {
    if (!child.isMesh) return;
    child.material = material;
    child.castShadow = true;
    child.receiveShadow = true;
  });

  fitObjectInsideCell(model);
  addOutline(model, outlineColor);
  return model;
}

function findKnight(scene) {
  const exactNames = ["Knight_W1", "Knight_B1", "Knight_W2", "Knight_B2"];
  for (const name of exactNames) {
    const object = scene.getObjectByName(name);
    if (object) return object;
  }
  let found = null;
  scene.traverse((object) => {
    if (!found && /^Knight_[WB]\d+$/.test(object.name)) found = object;
  });
  return found;
}

export class ExternalKnightModel {
  constructor(materials) {
    this.materials = materials;
    this.loader = new GLTFLoader();
    this.sourcePromise = null;
  }

  loadSource() {
    if (!this.sourcePromise) {
      this.sourcePromise = this.loader.loadAsync(MODEL_URL).then((gltf) => {
        const knight = findKnight(gltf.scene);
        if (!knight) throw new Error("A Beautiful Game does not contain a named knight mesh");
        return knight;
      });
    }
    return this.sourcePromise;
  }

  create(color, fallback) {
    const holder = new THREE.Group();
    holder.name = `${color}-knight-external-holder`;
    holder.userData.externalModelState = "loading";
    holder.add(fallback);

    this.loadSource()
      .then((source) => {
        if (!holder.parent) return;
        const model = normalizeKnight(
          source,
          this.materials[color],
          color === "white" ? 0x202733 : 0xc8d3df,
        );
        holder.clear();
        holder.add(model);
        holder.userData.externalModelState = "ready";
      })
      .catch((error) => {
        holder.userData.externalModelState = "fallback";
        holder.userData.externalModelError = String(error?.message ?? error);
        console.warn("Cube Chess could not load the licensed glTF knight; using fallback.", error);
      });

    return holder;
  }
}

export { MODEL_URL as EXTERNAL_KNIGHT_MODEL_URL };
