import {
  OpenSourceStauntonV12PieceSet,
  OPEN_SOURCE_STAUNTON_REVISION,
  countObjectTriangles,
  countUniquePieceResources,
} from "./OpenSourceStauntonV12PieceSet.js";
import { PIECE_CELL_ENVELOPE } from "./pieceScaleProfile.js";

// Compatibility facade only. There is NO paid/premium visual tier.
// The normal public game and WebMCP visual tools use the same free v12 renderer.
const REVISION = OPEN_SOURCE_STAUNTON_REVISION;
const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];

export class OpenSourceReferenceGuidedV12PieceSet extends OpenSourceStauntonV12PieceSet {
  inspect(type, color = "white") {
    const object = this.create(type, color);
    return {
      ...super.inspect(type, color),
      resources: countUniquePieceResources(object),
    };
  }
  inspectAll() { return TYPES.map((type) => this.inspect(type, "white")); }
}

export class OpenSourceStauntonPieceSet extends OpenSourceReferenceGuidedV12PieceSet {}

// Historical constructor name retained only so existing WebMCP imports continue to work.
export class ForgeMcpPremiumPieceSet extends OpenSourceReferenceGuidedV12PieceSet {}

export const FORGEMCP_PREMIUM_REVISION = REVISION;
export const OPEN_SOURCE_STAUNTON_SAFE_FIT = PIECE_CELL_ENVELOPE;
export { countObjectTriangles, countUniquePieceResources };
export const FORGEMCP_PREMIUM_SAFE_FIT = PIECE_CELL_ENVELOPE;
