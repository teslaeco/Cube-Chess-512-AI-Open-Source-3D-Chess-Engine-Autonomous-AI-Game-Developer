import * as THREE from "three";
import {
  OriginalChessModelSet,
  ORIGINAL_CHESS_MODEL_URL,
  ORIGINAL_CHESS_SOURCE_ID,
} from "./OriginalChessModelSet.js";
import {
  OpenSourceStauntonV8PieceSet,
  OPEN_SOURCE_STAUNTON_REVISION as PROCEDURAL_FALLBACK_REVISION,
  OPEN_SOURCE_STAUNTON_SAFE_FIT,
  countObjectTriangles,
  countUniquePieceResources,
} from "./OpenSourceStauntonV8PieceSet.js";

// NORMAL / PUBLIC / OPEN-SOURCE renderer for every player.
// The repository's uploaded chess.fbx is the preferred runtime source.
// Procedural v8 is retained only as an immediate loading/error fallback.
const REVISION = "2026-09-01-open-source-original-fbx-v9";
const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];

const MATERIALS = Object.freeze({
  white: new THREE.MeshPhysicalMaterial({
    color: 0xf0ece4,
    metalness: 0.04,
    roughness: 0.35,
    clearcoat: 0.48,
    clearcoatRoughness: 0.22,
    reflectivity: 0.54,
  }),
  black: new THREE.MeshPhysicalMaterial({
    color: 0x12161b,
    metalness: 0.20,
    roughness: 0.29,
    clearcoat: 0.60,
    clearcoatRoughness: 0.22,
    reflectivity: 0.58,
  }),
});

export class OpenSourceStauntonV9PieceSet {
  constructor() {
    this.fallback = new OpenSourceStauntonV8PieceSet();
    this.original = new OriginalChessModelSet(MATERIALS);
  }

  create(type, color) {
    const fallback = this.fallback.create(type, color);
    fallback.userData.forgeVisualSource = "open-source-procedural-fallback-loading";
    fallback.userData.fallbackRevision = PROCEDURAL_FALLBACK_REVISION;
    const holder = this.original.create(type, color, fallback);
    holder.userData.openSourceStauntonRevision = REVISION;
    holder.userData.openSourceStauntonType = type;
    holder.userData.openSourceStauntonColor = color;
    return holder;
  }

  inspect(type, color = "white") {
    const fallback = this.fallback.inspect(type, color);
    return {
      ...fallback,
      type,
      color,
      revision: REVISION,
      style: "Open-source original uploaded chess FBX with procedural fallback",
      runtimePrimarySource: ORIGINAL_CHESS_SOURCE_ID,
      runtimeAsset: ORIGINAL_CHESS_MODEL_URL,
      fallbackRevision: PROCEDURAL_FALLBACK_REVISION,
      freeForPublicRenderer: true,
    };
  }

  inspectAll() {
    return TYPES.map((type) => this.inspect(type, "white"));
  }
}

export class OpenSourceStauntonPieceSet extends OpenSourceStauntonV9PieceSet {}

// Compatibility only: existing WebMCP code imports this old class name.
// It is NOT a paid/premium tier; it resolves to the exact same free v9 set.
export class ForgeMcpPremiumPieceSet extends OpenSourceStauntonV9PieceSet {}

export const OPEN_SOURCE_STAUNTON_REVISION = REVISION;
export const FORGEMCP_PREMIUM_REVISION = REVISION;
export { OPEN_SOURCE_STAUNTON_SAFE_FIT, countObjectTriangles, countUniquePieceResources };
export const FORGEMCP_PREMIUM_SAFE_FIT = OPEN_SOURCE_STAUNTON_SAFE_FIT;
export { ORIGINAL_CHESS_MODEL_URL, ORIGINAL_CHESS_SOURCE_ID };
