import "./promotion.css";
import { CubeChessApplication } from "../app/CubeChessApplication.js";
import { registerVisualWebMcpTools } from "../forgemcp/visualTools.js";
import { OpenSourceStauntonPieceSet, OPEN_SOURCE_STAUNTON_REVISION } from "../renderer/ForgeMcpPremiumPieceSet.js";
import { PieceGeometryFactory } from "../renderer/PieceGeometryFactory.js";
import { installPawnPromotion } from "./PawnPromotion.js";

// Keep the old internal preset token for WebMCP backward compatibility.
// Public identity and actual geometry are OPEN SOURCE STAUNTON v6.
const OPEN_SOURCE_PRESET = "FORGEMCP_PREMIUM";
const LEGACY_PRESET = "LEGACY_COMPACT";
const PUBLIC_VISUAL_REVISION = "2026-08-31-public-opensource-staunton-v6";

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
      modelRevision: OPEN_SOURCE_STAUNTON_REVISION,
      activePieces: 0,
      openSourcePieces: 0,
      premiumPieces: 0,
      meshyPieces: 0,
      totalTriangles: 0,
    };
  }

  const active = [...pieceRenderer.pieces.values()];
  let openSourcePieces = 0;
  let meshyPieces = 0;
  let totalTriangles = 0;
  const sources = new Set();

  for (const object of active) {
    let openSource = object.userData?.forgeVisualSource === "open-source-staunton-v6";
    let meshy = false;
    totalTriangles += countTriangles(object);
    object.traverse?.((child) => {
      if (child.userData?.openSourceStauntonRole) openSource = true;
      if (child.name?.includes("meshy") || child.userData?.meshyModelState) meshy = true;
    });
    if (openSource) {
      openSourcePieces += 1;
      sources.add("open-source-staunton-v6");
    }
    if (meshy) {
      meshyPieces += 1;
      sources.add("compact-meshy-runtime");
    }
  }

  return {
    preset: pieceRenderer.factory?.__forgeVisualMode ?? OPEN_SOURCE_PRESET,
    revision: PUBLIC_VISUAL_REVISION,
    modelRevision: OPEN_SOURCE_STAUNTON_REVISION,
    activePieces: active.length,
    openSourcePieces,
    premiumPieces: openSourcePieces, // compatibility for existing CI evidence consumers
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
    const mode = diagnostics.preset === OPEN_SOURCE_PRESET ? "OPEN SOURCE STAUNTON" : diagnostics.preset;
    badge.textContent = `CUBE VISUAL: ${mode} · ${diagnostics.openSourcePieces}/${diagnostics.activePieces}`;
    badge.dataset.preset = diagnostics.preset;
    badge.dataset.openSourcePieces = String(diagnostics.openSourcePieces);
    badge.dataset.premiumPieces = String(diagnostics.openSourcePieces);
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
    "position:fixed", "left:10px", "bottom:10px", "z-index:10001", "padding:7px 10px",
    "border:1px solid rgba(164,173,182,.65)", "border-radius:999px", "background:rgba(8,12,16,.9)",
    "color:#e4e8ec", "font:700 10px/1.2 system-ui,sans-serif", "letter-spacing:.035em", "pointer-events:none",
  ].join(";");
  badge.textContent = "CUBE VISUAL: STARTING";
  document.body.append(badge);
  return badge;
}

// PieceGeometryFactory renders pieces during application construction, so install
// the open-source Staunton factory before main.js constructs CubeChessApplication.
// The legacy Meshy path stays available for WebMCP rollback and regression evidence.
const legacyPrototypeCreate = PieceGeometryFactory.prototype.create;
PieceGeometryFactory.prototype.create = function createOpenSourceProductionPiece(type, color) {
  if (!this.__forgeOriginalCreate) this.__forgeOriginalCreate = legacyPrototypeCreate.bind(this);
  if (!this.__forgePremiumSet) this.__forgePremiumSet = new OpenSourceStauntonPieceSet();
  if (!this.__forgeVisualMode) this.__forgeVisualMode = OPEN_SOURCE_PRESET;

  if (this.__forgeVisualMode === LEGACY_PRESET) return this.__forgeOriginalCreate(type, color);

  const object = this.__forgePremiumSet.create(type, color);
  object.userData = {
    ...object.userData,
    forgeVisualSource: "open-source-staunton-v6",
    forgeVisualPreset: OPEN_SOURCE_PRESET,
    forgeVisualRevision: PUBLIC_VISUAL_REVISION,
  };
  return object;
};

function configureOpenSourceDefault(application) {
  const factory = application?.renderer?.pieceRenderer?.factory;
  if (!factory || typeof factory.create !== "function") return false;
  if (!factory.__forgeOriginalCreate) factory.__forgeOriginalCreate = legacyPrototypeCreate.bind(factory);
  if (!factory.__forgePremiumSet) factory.__forgePremiumSet = new OpenSourceStauntonPieceSet();

  factory.create = (type, color) => {
    const object = factory.__forgePremiumSet.create(type, color);
    object.userData = {
      ...object.userData,
      forgeVisualSource: "open-source-staunton-v6",
      forgeVisualPreset: OPEN_SOURCE_PRESET,
      forgeVisualRevision: PUBLIC_VISUAL_REVISION,
    };
    return object;
  };
  factory.__forgeVisualMode = OPEN_SOURCE_PRESET;
  factory.__forgeLegacyVisualMode = LEGACY_PRESET;
  return true;
}

const originalHandleStateChange = CubeChessApplication.prototype.handleStateChange;
CubeChessApplication.prototype.handleStateChange = function handleStateChangeWithOpenSourceVisuals(state) {
  globalThis.__forgeMcpCubeApplication = this;
  const result = originalHandleStateChange.call(this, state);
  queueMicrotask(() => publishDiagnostics(this));
  return result;
};

const originalStartGame = CubeChessApplication.prototype.startGame;
CubeChessApplication.prototype.startGame = function startGameWithPromotion(config) {
  globalThis.__forgeMcpCubeApplication = this;
  configureOpenSourceDefault(this);
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
    if (registration.availability === "WEBMCP_AVAILABLE") console.info("ForgeMCP visual WebMCP tools registered", registration);
    console.info("Cube open-source visual diagnostics", globalThis.__forgeMcpVisualDiagnostics);
  })
  .catch((error) => {
    console.error("Failed to start Cube Chess 512", error);
  });
