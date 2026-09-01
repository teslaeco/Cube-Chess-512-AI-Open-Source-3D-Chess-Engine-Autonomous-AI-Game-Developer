import * as THREE from "three";
import { decodeBase64Bytes, parseCompactChessGeometry } from "./MeshyChessModelSet.js";
import { normalizeImportedPiece } from "./OriginalChessModelSet.js";
import { pieceCellEnvelope } from "./pieceScaleProfile.js";

export const HIGH_DETAIL_CHESS_REVISION = "2026-09-01-uploaded-glb-v1";
export const HIGH_DETAIL_CHESS_SOURCE_ID = "owner-uploaded-meshy-high-detail";
const MINIMUM_TRIANGLES = 70_000;

const PUBLIC_BASE = import.meta.env?.BASE_URL ?? "/";
function modelUrl(type) {
  return `${PUBLIC_BASE}assets/high-detail-chess-models/${type}.ccm.b64?v=${HIGH_DETAIL_CHESS_REVISION}`;
}

export const HIGH_DETAIL_CHESS_MODEL_URLS = Object.freeze({
  pawn: modelUrl("pawn"),
  rook: modelUrl("rook"),
  knight: modelUrl("knight"),
  bishop: modelUrl("bishop"),
  queen: modelUrl("queen"),
  king: modelUrl("king"),
});

async function fetchGeometry(url) {
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Failed to load high-detail chess model (${response.status})`);
  return parseCompactChessGeometry(decodeBase64Bytes(await response.text()));
}

function triangleCount(geometry) {
  if (geometry?.index?.count) return Math.floor(geometry.index.count / 3);
  return Math.floor((geometry?.attributes?.position?.count ?? 0) / 3);
}

function notifyVisualDiagnostics() {
  queueMicrotask(() => globalThis.__forgeMcpPublishVisualDiagnostics?.());
}

function releaseFallbackMaterials(fallback) {
  const materials = new Set();
  fallback?.traverse?.((child) => {
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of childMaterials) {
      if (material?.userData?.forgePieceInstanceMaterial) materials.add(material);
    }
  });
  for (const material of materials) material.dispose();
}

export function prepareHighDetailPiece(geometry, materialTemplate, type, color) {
  const material = materialTemplate.clone();
  material.userData = {
    ...material.userData,
    forgeSharedPieceMaterial: false,
    forgePieceInstanceMaterial: true,
  };

  const surface = new THREE.Mesh(geometry, material);
  surface.name = `${color}-${type}-uploaded-high-detail-surface`;
  surface.castShadow = true;
  surface.receiveShadow = true;
  surface.frustumCulled = false;
  surface.userData = {
    forgeVisualSource: HIGH_DETAIL_CHESS_SOURCE_ID,
    ownerUploadedChessMesh: true,
  };

  const source = new THREE.Group();
  source.add(surface);
  const normalized = normalizeImportedPiece(source, type);
  normalized.name = `${color}-${type}-uploaded-high-detail`;
  normalized.userData = {
    forgeVisualSource: HIGH_DETAIL_CHESS_SOURCE_ID,
    forgeVisualRevision: HIGH_DETAIL_CHESS_REVISION,
    ownerUploadedChessAsset: true,
  };
  return normalized;
}

function inspectPrepared(object, type, geometry) {
  object.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  const envelope = pieceCellEnvelope(type);
  return {
    type,
    triangles: triangleCount(geometry),
    vertices: geometry.attributes.position.count,
    bounds: { x: size.x, y: size.y, z: size.z },
    finite: [size.x, size.y, size.z].every(Number.isFinite),
    fitsCell: size.x <= envelope.maxFootprint + 1e-6 && size.z <= envelope.maxFootprint + 1e-6,
    fitsLevel: size.y <= envelope.maxHeight + 1e-6,
    runtimePrimarySource: HIGH_DETAIL_CHESS_SOURCE_ID,
    revision: HIGH_DETAIL_CHESS_REVISION,
  };
}

export class HighDetailChessModelSet {
  constructor(materials) {
    this.materials = materials;
    this.geometryPromises = new Map();
  }

  loadGeometry(type) {
    const url = HIGH_DETAIL_CHESS_MODEL_URLS[type];
    if (!url) return Promise.reject(new Error(`No high-detail model is registered for ${type}`));
    if (!this.geometryPromises.has(type)) {
      this.geometryPromises.set(type, fetchGeometry(url).then((geometry) => {
        const triangles = triangleCount(geometry);
        if (triangles < MINIMUM_TRIANGLES) {
          throw new Error(`${type} retained only ${triangles} triangles; expected at least ${MINIMUM_TRIANGLES}`);
        }
        geometry.userData.highDetailChessModel = Object.freeze({
          type,
          triangles,
          vertices: geometry.attributes.position.count,
          revision: HIGH_DETAIL_CHESS_REVISION,
          source: HIGH_DETAIL_CHESS_SOURCE_ID,
        });
        geometry.userData.forgeSharedPieceGeometry = true;
        return geometry;
      }));
    }
    return this.geometryPromises.get(type);
  }

  async inspect(type, color = "white") {
    const geometry = await this.loadGeometry(type);
    const object = prepareHighDetailPiece(geometry, this.materials[color], type, color);
    const result = inspectPrepared(object, type, geometry);
    object.traverse((child) => {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (material?.userData?.forgePieceInstanceMaterial) material.dispose();
      }
    });
    return result;
  }

  create(type, color, fallback) {
    const holder = new THREE.Group();
    holder.name = `${color}-${type}`;
    holder.userData = {
      highDetailModelState: "loading",
      forgeVisualSource: `${HIGH_DETAIL_CHESS_SOURCE_ID}-loading`,
      forgeVisualPreset: "FORGEMCP_PREMIUM",
      forgeVisualRevision: HIGH_DETAIL_CHESS_REVISION,
      highDetailAssetUrl: HIGH_DETAIL_CHESS_MODEL_URLS[type],
    };
    holder.add(fallback);

    this.loadGeometry(type)
      .then((geometry) => {
        const model = prepareHighDetailPiece(
          geometry,
          this.materials[color],
          type,
          color,
        );
        releaseFallbackMaterials(fallback);
        holder.clear();
        holder.add(model);
        holder.userData.highDetailModelState = "ready";
        holder.userData.highDetailModelStats = geometry.userData.highDetailChessModel;
        holder.userData.forgeVisualSource = HIGH_DETAIL_CHESS_SOURCE_ID;
        holder.userData.ownerUploadedChessAsset = true;
        notifyVisualDiagnostics();
      })
      .catch((error) => {
        holder.userData.highDetailModelState = "fallback";
        holder.userData.highDetailModelError = String(error?.message ?? error);
        holder.userData.forgeVisualSource = fallback?.userData?.forgeVisualSource ?? "procedural-fallback";
        notifyVisualDiagnostics();
        console.warn(`Cube Chess could not load the uploaded high-detail ${type} model.`, error);
      });

    return holder;
  }
}
