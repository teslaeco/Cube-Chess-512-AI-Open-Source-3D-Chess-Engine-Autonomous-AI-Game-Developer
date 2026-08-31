// Backward-compatible module path used by the existing live renderer and WebMCP tools.
// The active implementation is now the open-source sculpted Staunton v7 set.
export {
  OpenSourceStauntonPieceSet,
  ForgeMcpPremiumPieceSet,
  OPEN_SOURCE_STAUNTON_REVISION,
  OPEN_SOURCE_STAUNTON_SAFE_FIT,
  FORGEMCP_PREMIUM_REVISION,
  FORGEMCP_PREMIUM_SAFE_FIT,
  countObjectTriangles,
  countUniquePieceResources,
} from "./OpenSourceStauntonV7PieceSet.js";
