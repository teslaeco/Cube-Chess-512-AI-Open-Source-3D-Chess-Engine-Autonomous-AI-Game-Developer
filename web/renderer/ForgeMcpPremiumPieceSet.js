import {
  OpenSourceStauntonV14PieceSet,
  OPEN_SOURCE_STAUNTON_V14_REVISION,
  countObjectTriangles,
  countUniquePieceResources,
} from "./OpenSourceStauntonV14PieceSet.js";
import { PIECE_CELL_ENVELOPE } from "./pieceScaleProfile.js";

const REVISION = OPEN_SOURCE_STAUNTON_V14_REVISION;
const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];

export class OpenSourceReferenceGuidedV14PieceSet extends OpenSourceStauntonV14PieceSet {
  inspect(type, color = "white") {
    const object = this.create(type, color);
    return { ...super.inspect(type, color), resources: countUniquePieceResources(object) };
  }
  inspectAll() { return TYPES.map((type) => this.inspect(type, "white")); }
}

export class OpenSourceStauntonPieceSet extends OpenSourceReferenceGuidedV14PieceSet {}
export class ForgeMcpPremiumPieceSet extends OpenSourceReferenceGuidedV14PieceSet {}

export const OPEN_SOURCE_STAUNTON_REVISION = OPEN_SOURCE_STAUNTON_V14_REVISION;
export { countObjectTriangles, countUniquePieceResources };
export const FORGEMCP_PREMIUM_REVISION = REVISION;
export const OPEN_SOURCE_STAUNTON_SAFE_FIT = PIECE_CELL_ENVELOPE;
export const FORGEMCP_PREMIUM_SAFE_FIT = PIECE_CELL_ENVELOPE;
