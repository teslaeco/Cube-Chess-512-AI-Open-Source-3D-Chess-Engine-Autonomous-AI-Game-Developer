// Backward-compatible module path used by the existing live renderer and WebMCP tools.
// The active implementation is the NORMAL, PUBLIC, OPEN-SOURCE Staunton v8 set for every player.
// There is no paid/premium visual tier; the legacy class name remains only for compatibility.
export {
  OpenSourceStauntonV8PieceSet,
  OpenSourceStauntonPieceSet,
  ForgeMcpPremiumPieceSet,
  OPEN_SOURCE_STAUNTON_REVISION,
  OPEN_SOURCE_STAUNTON_SAFE_FIT,
  FORGEMCP_PREMIUM_REVISION,
  FORGEMCP_PREMIUM_SAFE_FIT,
  countObjectTriangles,
  countUniquePieceResources,
} from "./OpenSourceStauntonV8PieceSet.js";
