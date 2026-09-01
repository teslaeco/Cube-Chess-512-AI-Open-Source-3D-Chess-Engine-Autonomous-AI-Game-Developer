import * as THREE from "three";
import { MeshyChessModelSet } from "./MeshyChessModelSet.js";
import { pieceCellEnvelope } from "./pieceScaleProfile.js";
import {
  OPEN_SOURCE_STAUNTON_V14_REVISION,
  OPEN_SOURCE_STAUNTON_V14_SOURCE_ID,
  OpenSourceStauntonV14PieceSet,
} from "./OpenSourceStauntonV14PieceSet.js";

export const OPEN_SOURCE_PRESET = "FORGEMCP_PREMIUM";
export const LEGACY_COMPACT_PRESET = "LEGACY_COMPACT";

export function fitPieceInsideCell(group, type = "pawn") {
  const envelope = pieceCellEnvelope(type);
  group.position.set(0, 0, 0);
  group.scale.setScalar(1);
  group.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0)) throw new Error("Piece geometry has invalid bounds");
  const scale = Math.min(envelope.maxHeight / size.y, envelope.maxFootprint / size.x, envelope.maxFootprint / size.z);
  group.scale.setScalar(scale);
  group.updateMatrixWorld(true);
  bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());
  group.position.x -= center.x;
  group.position.z -= center.z;
  group.position.y -= bounds.min.y;
  group.updateMatrixWorld(true);
  return group;
}

export class PieceGeometryFactory {
  constructor() {
    this.materials = {
      white: new THREE.MeshPhysicalMaterial({ color: 0xf2ede2, metalness: 0.08, roughness: 0.24, clearcoat: 0.65, clearcoatRoughness: 0.22 }),
      black: new THREE.MeshPhysicalMaterial({ color: 0x151a22, metalness: 0.34, roughness: 0.2, clearcoat: 0.72, clearcoatRoughness: 0.18 }),
    };
    for (const material of Object.values(this.materials)) {
      material.userData.forgeSharedPieceMaterial = true;
    }
    this.meshyModels = new MeshyChessModelSet(this.materials);
    this.originalModels = this.meshyModels;
    this.openSourceModels = new OpenSourceStauntonV14PieceSet();
    this.__forgeVisualMode = OPEN_SOURCE_PRESET;
  }

  create(type, color) {
    const object = this.openSourceModels.create(type, color);
    object.userData = {
      ...object.userData,
      forgeVisualPreset: OPEN_SOURCE_PRESET,
      forgeVisualRevision: OPEN_SOURCE_STAUNTON_V14_REVISION,
    };
    return object;
  }

  createLegacy(type, color) {
    const fallback = this.openSourceModels.create(type, color);
    fallback.userData = {
      ...fallback.userData,
      forgeVisualSource: `${OPEN_SOURCE_STAUNTON_V14_SOURCE_ID}-fallback`,
      forgeVisualPreset: LEGACY_COMPACT_PRESET,
      forgeVisualRevision: OPEN_SOURCE_STAUNTON_V14_REVISION,
    };
    const holder = this.meshyModels.create(type, color, fallback);
    holder.userData = {
      ...holder.userData,
      forgeVisualSource: "compact-meshy-loading",
      forgeVisualPreset: LEGACY_COMPACT_PRESET,
      forgeVisualRevision: OPEN_SOURCE_STAUNTON_V14_REVISION,
    };
    return holder;
  }
}
