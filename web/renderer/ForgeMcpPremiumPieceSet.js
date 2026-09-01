import {
  OpenSourceStauntonV13RefinedPieceSet,
  OPEN_SOURCE_STAUNTON_REVISION,
  countObjectTriangles,
  countUniquePieceResources,
} from "./OpenSourceStauntonV13RefinedPieceSet.js";
import { PIECE_CELL_ENVELOPE } from "./pieceScaleProfile.js";

// Compatibility facade only. There is NO paid/premium visual tier.
// The normal public game and WebMCP visual tools use the same free refined v13 renderer.
const REVISION = OPEN_SOURCE_STAUNTON_REVISION;
const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];

export class OpenSourceReferenceGuidedV13PieceSet extends OpenSourceStauntonV13RefinedPieceSet {
  inspect(type, color = "white") {
    const object = this.create(type, color);
    const stat = super.inspect(type, color);
    return {
      ...stat,
      bounds: stat.bounds ?? { x: stat.width, y: stat.height, z: stat.depth },
      resources: countUniquePieceResources(object),
    };
  }
  inspectAll() { return TYPES.map((type) => this.inspect(type, "white")); }
}

export class OpenSourceStauntonPieceSet extends OpenSourceReferenceGuidedV13PieceSet {}

// Historical constructor name retained only so existing WebMCP imports continue to work.
export class ForgeMcpPremiumPieceSet extends OpenSourceReferenceGuidedV13PieceSet {}

export { OPEN_SOURCE_STAUNTON_REVISION, countObjectTriangles, countUniquePieceResources };
export const FORGEMCP_PREMIUM_REVISION = REVISION;
export const OPEN_SOURCE_STAUNTON_SAFE_FIT = PIECE_CELL_ENVELOPE;
export const FORGEMCP_PREMIUM_SAFE_FIT = PIECE_CELL_ENVELOPE;
