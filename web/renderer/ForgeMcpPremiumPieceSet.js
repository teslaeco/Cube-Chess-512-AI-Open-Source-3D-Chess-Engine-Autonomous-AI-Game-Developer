import {
  OpenSourceStauntonV8PieceSet,
  OPEN_SOURCE_STAUNTON_SAFE_FIT,
  OPEN_SOURCE_STAUNTON_REVISION,
  countObjectTriangles,
  countUniquePieceResources,
} from "./OpenSourceStauntonV8PieceSet.js";

// Compatibility facade for existing WebMCP imports.
// There is NO paid/premium tier: this is the same normal free open-source renderer used by every player.
// Uploaded FBX/GLB assets are reference-only and never become runtime pieces.
const REVISION = OPEN_SOURCE_STAUNTON_REVISION;
const SOURCE_ID = "open-source-reference-guided-generated-v10";
const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];

export class OpenSourceReferenceGuidedV10PieceSet extends OpenSourceStauntonV8PieceSet {
  create(type, color) {
    const object = super.create(type, color);
    object.userData.forgeVisualSource = SOURCE_ID;
    object.userData.openSourceStauntonRevision = REVISION;
    object.userData.referenceAssetsPolicy = "reference-only-not-runtime";
    return object;
  }

  inspect(type, color = "white") {
    const stat = super.inspect(type, color);
    return {
      ...stat,
      revision: REVISION,
      style: "Open-source continuously sculpted Staunton v10",
      runtimePrimarySource: SOURCE_ID,
      referenceAssetsPolicy: "reference-only-not-runtime",
      freeForPublicRenderer: true,
    };
  }

  inspectAll() {
    return TYPES.map((type) => this.inspect(type, "white"));
  }
}

export class OpenSourceStauntonPieceSet extends OpenSourceReferenceGuidedV10PieceSet {}

// Historical constructor name retained only so existing WebMCP code does not break.
export class ForgeMcpPremiumPieceSet extends OpenSourceReferenceGuidedV10PieceSet {}

export const OPEN_SOURCE_STAUNTON_REVISION = REVISION;
export const FORGEMCP_PREMIUM_REVISION = REVISION;
export const OPEN_SOURCE_STAUNTON_SAFE_FIT = OPEN_SOURCE_STAUNTON_SAFE_FIT;
export { countObjectTriangles, countUniquePieceResources };
export const FORGEMCP_PREMIUM_SAFE_FIT = OPEN_SOURCE_STAUNTON_SAFE_FIT;
