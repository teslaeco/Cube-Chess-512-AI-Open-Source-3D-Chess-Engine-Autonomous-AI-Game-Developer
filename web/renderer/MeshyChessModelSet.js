import * as THREE from "three";
import { normalizeImportedPiece } from "./OriginalChessModelSet.js";

const MODEL_REVISION = "20260804-1";
const HEADER_BYTES = 36;
const COMPACT_MODEL_MAGIC = "CCM1";

function modelUrl(name) {
  return new URL(
    `../../assets/meshy-chess-models/${name}.ccm.b64?v=${MODEL_REVISION}`,
    import.meta.url,
  ).href;
}

export const MESHY_MODEL_URLS = Object.freeze({
  pawn: modelUrl("pawn"),
  rook: modelUrl("rook"),
  knight: modelUrl("knight"),
  bishop: modelUrl("bishop"),
  queen: modelUrl("queen"),
  king: modelUrl("king"),
});

function readMagic(view) {
  return String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );
}

export function decodeBase64Bytes(encoded) {
  const cleaned = String(encoded ?? "").replace(/\s+/g, "");
  if (!cleaned) throw new Error("Compact chess model payload is empty");
  const binary = globalThis.atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function parseCompactChessGeometry(payload) {
  const bytes = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
  if (bytes.byteLength < HEADER_BYTES) {
    throw new Error("Compact chess model is shorter than its header");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (readMagic(view) !== COMPACT_MODEL_MAGIC) {
    throw new Error("Compact chess model has an invalid signature");
  }

  const vertexCount = view.getUint32(4, true);
  const indexCount = view.getUint32(8, true);
  if (vertexCount === 0 || vertexCount > 65_535) {
    throw new Error(`Compact chess model vertex count is invalid: ${vertexCount}`);
  }
  if (indexCount === 0 || indexCount % 3 !== 0) {
    throw new Error(`Compact chess model index count is invalid: ${indexCount}`);
  }

  const minimum = new THREE.Vector3(
    view.getFloat32(12, true),
    view.getFloat32(16, true),
    view.getFloat32(20, true),
  );
  const maximum = new THREE.Vector3(
    view.getFloat32(24, true),
    view.getFloat32(28, true),
    view.getFloat32(32, true),
  );
  const range = maximum.clone().sub(minimum);
  if (
    ![minimum.x, minimum.y, minimum.z, maximum.x, maximum.y, maximum.z].every(Number.isFinite) ||
    range.x <= 0 ||
    range.y <= 0 ||
    range.z <= 0
  ) {
    throw new Error("Compact chess model bounds are invalid");
  }

  const positionsByteLength = vertexCount * 3 * Uint16Array.BYTES_PER_ELEMENT;
  const indicesByteLength = indexCount * Uint16Array.BYTES_PER_ELEMENT;
  const expectedLength = HEADER_BYTES + positionsByteLength + indicesByteLength;
  if (bytes.byteLength !== expectedLength) {
    throw new Error(
      `Compact chess model length mismatch: expected ${expectedLength}, received ${bytes.byteLength}`,
    );
  }

  const positions = new Float32Array(vertexCount * 3);
  let offset = HEADER_BYTES;
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const target = vertex * 3;
    positions[target] = minimum.x + (view.getUint16(offset, true) / 65_535) * range.x;
    positions[target + 1] = minimum.y + (view.getUint16(offset + 2, true) / 65_535) * range.y;
    positions[target + 2] = minimum.z + (view.getUint16(offset + 4, true) / 65_535) * range.z;
    offset += 6;
  }

  const indices = new Uint16Array(indexCount);
  for (let index = 0; index < indexCount; index += 1) {
    const value = view.getUint16(offset, true);
    if (value >= vertexCount) {
      throw new Error(`Compact chess model index ${value} exceeds vertex count ${vertexCount}`);
    }
    indices[index] = value;
    offset += 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.compactChessModel = Object.freeze({
    vertexCount,
    triangleCount: indexCount / 3,
    revision: MODEL_REVISION,
  });
  return geometry;
}

async function fetchModelPayload(url) {
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Failed to load compact chess model (${response.status})`);
  }
  return decodeBase64Bytes(await response.text());
}

function addOutline(group, geometry, color) {
  const outline = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    }),
  );
  outline.scale.setScalar(1.014);
  outline.renderOrder = 30;
  outline.userData.decorative = true;
  outline.frustumCulled = false;
  group.add(outline);
}

function preparePiece(geometry, material, outlineColor, type, color) {
  const source = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `${color}-${type}-meshy-surface`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  source.add(mesh);
  addOutline(source, geometry, outlineColor);

  const normalized = normalizeImportedPiece(source, type);
  normalized.name = `${color}-${type}-meshy`;
  return normalized;
}

export class MeshyChessModelSet {
  constructor(materials) {
    this.materials = materials;
    this.geometryPromises = new Map();
  }

  loadGeometry(type) {
    const url = MESHY_MODEL_URLS[type];
    if (!url) return Promise.reject(new Error(`No Meshy model is registered for ${type}`));
    if (!this.geometryPromises.has(type)) {
      this.geometryPromises.set(
        type,
        fetchModelPayload(url).then((payload) => parseCompactChessGeometry(payload)),
      );
    }
    return this.geometryPromises.get(type);
  }

  create(type, color, fallback) {
    const holder = new THREE.Group();
    holder.name = `${color}-${type}`;
    holder.userData.meshyModelState = "loading";
    holder.add(fallback);

    this.loadGeometry(type)
      .then((geometry) => {
        const model = preparePiece(
          geometry,
          this.materials[color],
          color === "white" ? 0x202733 : 0xc8d3df,
          type,
          color,
        );
        holder.clear();
        holder.add(model);
        holder.userData.meshyModelState = "ready";
        holder.userData.meshyModelStats = geometry.userData.compactChessModel;
      })
      .catch((error) => {
        holder.userData.meshyModelState = "fallback";
        holder.userData.meshyModelError = String(error?.message ?? error);
        console.warn(`Cube Chess could not load the Meshy ${type} model.`, error);
      });

    return holder;
  }
}
