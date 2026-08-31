import {
  OpenSourceStauntonV11PieceSet,
  OPEN_SOURCE_STAUNTON_V11_REVISION,
  countObjectTriangles,
} from "./OpenSourceStauntonV11PieceSet.js";
import { PIECE_CELL_ENVELOPE } from "./pieceScaleProfile.js";

// Compatibility facade only. There is NO paid/premium visual tier.
// The normal public game and WebMCP visual tools use the exact same v11 renderer.
const REVISION = OPEN_SOURCE_STAUNTON_V11_REVISION;
const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];

export function countUniquePieceResources(object) {
  const geometries = new Set();
  const materials = new Set();
  let meshes = 0;
  object?.traverse?.((child) => {
    if (!child.isMesh) return;
    meshes += 1;
    if (child.geometry) geometries.add(child.geometry.uuid);
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      if (material) materials.add(material.uuid);
    }
  });
  return { meshes, uniqueGeometries: geometries.size, uniqueMaterials: materials.size };
}

export class OpenSourceReferenceGuidedV11PieceSet extends OpenSourceStauntonV11PieceSet {
  inspect(type, color = "white") {
    return {
      ...super.inspect(type, color),
      resources: countUniquePieceResources(this.create(type, color)),
    };
  }
  inspectAll() { return TYPES.map((type) => this.inspect(type, "white")); }
}

export class OpenSourceStauntonPieceSet extends OpenSourceReferenceGuidedV11PieceSet {}

// Historical constructor name retained so existing WebMCP imports continue to work.
export class ForgeMcpPremiumPieceSet extends OpenSourceReferenceGuidedV11PieceSet {}

export const OPEN_SOURCE_STAUNTON_REVISION = REVISION;
export const FORGEMCP_PREMIUM_REVISION = REVISION;
export const OPEN_SOURCE_STAUNTON_SAFE_FIT = PIECE_CELL_ENVELOPE;
export { countObjectTriangles };
export const FORGEMCP_PREMIUM_SAFE_FIT = PIECE_CELL_ENVELOPE;
