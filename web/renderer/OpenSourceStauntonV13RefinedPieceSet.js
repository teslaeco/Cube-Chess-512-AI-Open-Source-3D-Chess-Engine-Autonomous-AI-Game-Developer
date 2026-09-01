import * as THREE from "three";
import {
  OpenSourceStauntonV13PieceSet,
  OPEN_SOURCE_STAUNTON_REVISION,
  OPEN_SOURCE_STAUNTON_SOURCE_ID,
  countObjectTriangles,
  countUniquePieceResources,
} from "./OpenSourceStauntonV13PieceSet.js";
import { pieceCellEnvelope } from "./pieceScaleProfile.js";
import { refineReferenceStyleV13 } from "./StauntonV13ReferenceRefinement.js";

const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];

function refit(group, type) {
  const envelope = pieceCellEnvelope(type);
  group.position.set(0, 0, 0);
  group.scale.setScalar(1);
  group.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error(`Invalid refined ${type} bounds`);
  }
  const scale = Math.min(
    envelope.maxHeight / size.y,
    envelope.maxFootprint / size.x,
    envelope.maxFootprint / size.z,
  );
  group.scale.setScalar(scale);
  group.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.x -= center.x;
  group.position.z -= center.z;
  group.position.y -= box.min.y;
  group.updateMatrixWorld(true);
  return group;
}

export class OpenSourceStauntonV13RefinedPieceSet {
  constructor() {
    this.base = new OpenSourceStauntonV13PieceSet();
    this.templates = new Map();
    this.stats = new Map();
  }

  key(type, side) { return `${type}:${side}`; }

  create(type, side = "white") {
    const safeType = TYPES.includes(type) ? type : "pawn";
    const safeSide = side === "black" ? "black" : "white";
    const key = this.key(safeType, safeSide);
    if (!this.templates.has(key)) {
      const object = this.base.create(safeType, safeSide);
      refineReferenceStyleV13(object, safeType);
      refit(object, safeType);
      object.userData = {
        ...object.userData,
        forgeVisualSource: OPEN_SOURCE_STAUNTON_SOURCE_ID,
        openSourceStauntonRevision: OPEN_SOURCE_STAUNTON_REVISION,
        referenceAssetsPolicy: "reference-only-not-runtime",
        freeForPublicRenderer: true,
        visualQaPass: "verified-closeup-reference-refinement",
      };
      this.templates.set(key, object);
      this.stats.set(key, this.inspectObject(object, safeType, safeSide));
    }
    const clone = this.templates.get(key).clone(true);
    clone.userData = { ...this.templates.get(key).userData };
    return clone;
  }

  inspectObject(object, type, side) {
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const envelope = pieceCellEnvelope(type);
    const resources = countUniquePieceResources(object);
    return {
      type,
      side,
      revision: OPEN_SOURCE_STAUNTON_REVISION,
      style: "Open-source Staunton v13 verified closeup refinement",
      runtimePrimarySource: OPEN_SOURCE_STAUNTON_SOURCE_ID,
      referenceAssetsPolicy: "reference-only-not-runtime",
      freeForPublicRenderer: true,
      triangles: countObjectTriangles(object),
      meshes: resources.meshes,
      uniqueGeometries: resources.uniqueGeometries,
      uniqueMaterials: resources.uniqueMaterials,
      uniqueTextures: resources.uniqueTextures,
      width: size.x,
      height: size.y,
      depth: size.z,
      bounds: { x: size.x, y: size.y, z: size.z },
      finite: [size.x, size.y, size.z].every(Number.isFinite),
      fitsCell: size.x <= envelope.maxFootprint + 1e-6 && size.z <= envelope.maxFootprint + 1e-6,
      fitsLevel: size.y <= envelope.maxHeight + 1e-6,
      roleTextureKey: object.userData.roleTextureKey,
      visualQaPass: object.userData.visualQaPass,
    };
  }

  inspect(type, side = "white") {
    const safeType = TYPES.includes(type) ? type : "pawn";
    const safeSide = side === "black" ? "black" : "white";
    const key = this.key(safeType, safeSide);
    if (!this.stats.has(key)) this.create(safeType, safeSide);
    return { ...this.stats.get(key) };
  }

  inspectAll(side = "white") {
    return TYPES.map((type) => this.inspect(type, side));
  }
}

export class OpenSourceStauntonPieceSet extends OpenSourceStauntonV13RefinedPieceSet {}
export { OPEN_SOURCE_STAUNTON_REVISION, countObjectTriangles, countUniquePieceResources };
