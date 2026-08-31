import "./promotion.css";
import { CubeChessApplication } from "../app/CubeChessApplication.js";
import { registerVisualWebMcpTools } from "../forgemcp/visualTools.js";
import { ForgeMcpPremiumPieceSet, FORGEMCP_PREMIUM_REVISION } from "../renderer/ForgeMcpPremiumPieceSet.js";
import { PieceGeometryFactory } from "../renderer/PieceGeometryFactory.js";
import { installPawnPromotion } from "./PawnPromotion.js";

const PREMIUM_PRESET = "FORGEMCP_PREMIUM";
const LEGACY_PRESET = "LEGACY_COMPACT";
const PUBLIC_VISUAL_REVISION = "2026-08-31-public-premium-v3";

function countTriangles(object) {
  let triangles = 0;
  object?.traverse?.((child) => {
    if (!child.isMesh || child.userData?.decorative) return;
    if (child.geometry?.index?.count) triangles += Math.floor(child.geometry.index.count / 3);
    else triangles += Math.floor((child.geometry?.attributes?.position?.count ?? 0) / 3);
  });
  return triangles;
}

function inspectLiveVisuals(application) {
  const pieceRenderer = application?.renderer?.pieceRenderer;
  if (!pieceRenderer) {
    return {
      preset: "NOT_READY",
      revision: PUBLIC_VISUAL_REVISION,
      premiumRevision: FORGEMCP_PREMIUM_REVISION,
      activePieces: 0,
      premiumPieces: 0,
      meshyPieces: 0,
      totalTriangles: 0,
    };
  }

  const active = [...pieceRenderer.pieces.values()];
  let premiumPieces = 0;
  let meshyPieces = 0;
  let totalTriangles = 0;
  const sources = new Set();

  for (const object of active) {
    let premium = false;
    let meshy = false;
    totalTriangles += countTriangles(object);
    object.traverse?.((child) => {
      if (child.userData?.forgePremiumRole) premium = true;
      if (child.name?.includes("meshy") || child.userData?.meshyModelState) meshy = true;
    });
    if (object.userData?.forgeVisualSource === "forgemcp-premium-procedural") premium = true;
    if (premium) {
      premiumPieces += 1;
      sources.add("forgemcp-premium-procedural");
    }
    if (meshy) {
      meshyPieces += 1;
      sources.add("compact-meshy-runtime");
    }
  }

  return {
    preset: pieceRenderer.factory?.__forgeVisualMode ?? PREMIUM_PRESET,
    revision: PUBLIC_VISUAL_REVISION,
    premiumRevision: FORGEMCP_PREMIUM_REVISION,
    activePieces: active.length,
    premiumPieces,
    meshyPieces,
    totalTriangles,
    sources: [...sources],
  };
}

function publishDiagnostics(application) {
  const diagnostics = inspectLiveVisuals(application);
  globalThis.__forgeMcpVisualDiagnostics = diagnostics;
  const badge = document.getElementById("forgemcp-visual-runtime-badge");
  if (badge) {
    badge.textContent = `FORGEMCP VISUAL: ${diagnostics.preset === PREMIUM_PRESET ? "PREMIUM" : diagnostics.preset} · ${diagnostics.premiumPieces}/${diagnostics.activePieces}`;
    badge.dataset.preset = diagnostics.preset;
    badge.dataset.premiumPieces = String(diagnostics.premiumPieces);
    badge.dataset.meshyPieces = String(diagnostics.meshyPieces);
    badge.dataset.revision = diagnostics.revision;
  }
  return diagnostics;
}

function ensureDiagnosticsBadge() {
  let badge = document.getElementById("forgemcp-visual-runtime-badge");
  if (badge) return badge;
  badge = document.createElement("div");
  badge.id = "forgemcp-visual-runtime-badge";
  badge.setAttribute("role", "status");
  badge.style.cssText = [
    "position:fixed",
    "left:10px",
    "bottom:10px",
    "z-index:10001",
    "padding:7px 10px",
    "border:1px solid rgba(113,214,170,.65)",
    "border-radius:999px",
    "background:rgba(7,20,18,.9)",
    "color:#bdf8dd",
    "font:700 10px/1.2 system-ui,sans-serif",
    "letter-spacing:.035em",
    "pointer-events:none",
  ].join(";");
  badge.textContent = "FORGEMCP VISUAL: STARTING";
  document.body.append(badge);
  return badge;
}

// Root cause fixed here: ChessRenderer constructs PieceGeometryFactory and renders
// the attract-mode pieces inside CubeChessApplication's constructor, BEFORE
// startGame() is ever called. PR #114 only configured premium in startGame(), so
// the public landing/attract scene stayed on the legacy Meshy path. Patch the
// factory prototype before main.js constructs the application so the very first
// rendered piece is premium. Keep the original real legacy create() bound on each
// factory instance for deterministic WebMCP rollback.
const legacyPrototypeCreate = PieceGeometryFactory.prototype.create;
PieceGeometryFactory.prototype.create = function createForgeMcpProductionPiece(type, color) {
  if (!this.__forgeOriginalCreate) this.__forgeOriginalCreate = legacyPrototypeCreate.bind(this);
  if (!this.__forgePremiumSet) this.__forgePremiumSet = new ForgeMcpPremiumPieceSet();
  if (!this.__forgeVisualMode) this.__forgeVisualMode = PREMIUM_PRESET;

  if (this.__forgeVisualMode === LEGACY_PRESET) {
    return this.__forgeOriginalCreate(type, color);
  }

  const object = this.__forgePremiumSet.create(type, color);
  object.userData = {
    ...object.userData,
    forgeVisualSource: "forgemcp-premium-procedural",
    forgeVisualPreset: PREMIUM_PRESET,
    forgeVisualRevision: PUBLIC_VISUAL_REVISION,
  };
  return object;
};

function configurePremiumDefault(application) {
  const factory = application?.renderer?.pieceRenderer?.factory;
  if (!factory || typeof factory.create !== "function") return false;
  if (!factory.__forgeOriginalCreate) factory.__forgeOriginalCreate = legacyPrototypeCreate.bind(factory);
  if (!factory.__forgePremiumSet) factory.__forgePremiumSet = new ForgeMcpPremiumPieceSet();

  factory.create = (type, color) => {
    const object = factory.__forgePremiumSet.create(type, color);
    object.userData = {
      ...object.userData,
      forgeVisualSource: "forgemcp-premium-procedural",
      forgeVisualPreset: PREMIUM_PRESET,
      forgeVisualRevision: PUBLIC_VISUAL_REVISION,
    };
    return object;
  };
  factory.__forgeVisualMode = PREMIUM_PRESET;
  factory.__forgeLegacyVisualMode = LEGACY_PRESET;
  return true;
}

const originalHandleStateChange = CubeChessApplication.prototype.handleStateChange;
CubeChessApplication.prototype.handleStateChange = function handleStateChangeWithForgeMcp(state) {
  globalThis.__forgeMcpCubeApplication = this;
  const result = originalHandleStateChange.call(this, state);
  queueMicrotask(() => publishDiagnostics(this));
  return result;
};

const originalStartGame = CubeChessApplication.prototype.startGame;
CubeChessApplication.prototype.startGame = function startGameWithPromotion(config) {
  globalThis.__forgeMcpCubeApplication = this;
  configurePremiumDefault(this);
  const result = originalStartGame.call(this, config);
  if (!this.pawnPromotion) this.pawnPromotion = installPawnPromotion(this);
  queueMicrotask(() => publishDiagnostics(this));
  return result;
};

ensureDiagnosticsBadge();

void import("../main.js")
  .then(async () => {
    const application = globalThis.__forgeMcpCubeApplication;
    if (application) publishDiagnostics(application);
    const registration = await registerVisualWebMcpTools();
    globalThis.__forgeMcpVisualToolRegistration = registration;
    if (registration.availability === "WEBMCP_AVAILABLE") {
      console.info("ForgeMCP visual WebMCP tools registered", registration);
    }
    console.info("ForgeMCP public visual diagnostics", globalThis.__forgeMcpVisualDiagnostics);
  })
  .catch((error) => {
    console.error("Failed to start Cube Chess 512", error);
  });
