import "./promotion.css";
import { CubeChessApplication } from "../app/CubeChessApplication.js";
import { registerVisualWebMcpTools } from "../forgemcp/visualTools.js";
import {
  HIGH_DETAIL_CHESS_REVISION,
  HIGH_DETAIL_CHESS_SOURCE_ID,
} from "../renderer/HighDetailChessModelSet.js";
import { HIGH_DETAIL_CHESS_TEXTURE_STYLE } from "../renderer/HighDetailChessTextureSet.js";
import {
  CRAYON_CATHEDRAL_SOURCE_ID,
} from "../renderer/CrayonCathedralPieceSet.js";
import { CRAYON_CATHEDRAL_TEXTURE_STYLE } from "../renderer/CrayonCathedralTextureSet.js";
import {
  CRAYON_CATHEDRAL_PRESET,
  FORGEMCP_PREMIUM_PRESET,
} from "../state/pieceVisualPresets.js";
import { installPawnPromotion } from "./PawnPromotion.js";

// Keep the old internal preset token for WebMCP backward compatibility.
// The token remains stable for existing WebMCP clients; the runtime geometry is
// now derived from the repository owner's uploaded high-detail GLB figures.
const OPEN_SOURCE_PRESET = FORGEMCP_PREMIUM_PRESET;
const PUBLIC_VISUAL_REVISION = HIGH_DETAIL_CHESS_REVISION;

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
      modelRevision: HIGH_DETAIL_CHESS_REVISION,
      activePieces: 0,
      openSourcePieces: 0,
      premiumPieces: 0,
      texturedPieces: 0,
      crayonCathedralPieces: 0,
      meshyPieces: 0,
      totalTriangles: 0,
    };
  }

  const active = [...pieceRenderer.pieces.values()];
  let openSourcePieces = 0;
  let meshyPieces = 0;
  let texturedPieces = 0;
  let crayonCathedralPieces = 0;
  let totalTriangles = 0;
  const sources = new Set();

  for (const object of active) {
    let openSource = object.userData?.forgeVisualSource === HIGH_DETAIL_CHESS_SOURCE_ID &&
      object.userData?.highDetailModelState === "ready";
    let meshy = false;
    let textured = false;
    let crayonCathedral = object.userData?.forgeVisualSource === CRAYON_CATHEDRAL_SOURCE_ID &&
      object.userData?.crayonCathedralModelState === "ready";
    totalTriangles += countTriangles(object);
    object.traverse?.((child) => {
      if (child.userData?.ownerUploadedChessMesh) openSource = true;
      if (child.name?.includes("meshy") || child.userData?.meshyModelState) meshy = true;
      if (!child.isMesh || child.userData?.decorative) return;
      const material = Array.isArray(child.material) ? child.material[0] : child.material;
      if (child.userData?.forgeVisualSource === CRAYON_CATHEDRAL_SOURCE_ID) crayonCathedral = true;
      if (
        material?.userData?.forgeTextureStyle === HIGH_DETAIL_CHESS_TEXTURE_STYLE &&
        material.map && material.roughnessMap && material.metalnessMap && material.bumpMap && material.emissiveMap
      ) {
        textured = true;
      }
      if (material?.userData?.forgeTextureStyle === CRAYON_CATHEDRAL_TEXTURE_STYLE) {
        crayonCathedral = true;
      }
    });
    if (openSource) {
      openSourcePieces += 1;
      sources.add(HIGH_DETAIL_CHESS_SOURCE_ID);
    }
    if (meshy) {
      meshyPieces += 1;
      sources.add("compact-meshy-runtime");
    }
    if (textured) texturedPieces += 1;
    if (crayonCathedral) {
      crayonCathedralPieces += 1;
      sources.add(CRAYON_CATHEDRAL_SOURCE_ID);
    }
  }

  return {
    preset: pieceRenderer.factory?.__forgeVisualMode ?? OPEN_SOURCE_PRESET,
    revision: PUBLIC_VISUAL_REVISION,
    modelRevision: HIGH_DETAIL_CHESS_REVISION,
    activePieces: active.length,
    openSourcePieces,
    premiumPieces: openSourcePieces, // compatibility for existing CI evidence consumers
    texturedPieces,
    crayonCathedralPieces,
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
    const mode = diagnostics.preset === OPEN_SOURCE_PRESET
      ? "TEXTURED HIGH DETAIL"
      : diagnostics.preset === CRAYON_CATHEDRAL_PRESET
        ? "CRAYON CATHEDRAL"
        : diagnostics.preset;
    const verifiedPieces = diagnostics.preset === OPEN_SOURCE_PRESET
      ? diagnostics.texturedPieces
      : diagnostics.preset === CRAYON_CATHEDRAL_PRESET
        ? diagnostics.crayonCathedralPieces
        : diagnostics.openSourcePieces;
    badge.textContent = `CUBE VISUAL: ${mode} · ${verifiedPieces}/${diagnostics.activePieces}`;
    badge.dataset.preset = diagnostics.preset;
    badge.dataset.openSourcePieces = String(diagnostics.openSourcePieces);
    badge.dataset.premiumPieces = String(diagnostics.openSourcePieces);
    badge.dataset.meshyPieces = String(diagnostics.meshyPieces);
    badge.dataset.texturedPieces = String(diagnostics.texturedPieces);
    badge.dataset.crayonCathedralPieces = String(diagnostics.crayonCathedralPieces);
    badge.dataset.revision = diagnostics.revision;
  }
  return diagnostics;
}

function exposeDiagnosticsPublisher(application) {
  globalThis.__forgeMcpPublishVisualDiagnostics = () => publishDiagnostics(application);
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

const originalHandleStateChange = CubeChessApplication.prototype.handleStateChange;
CubeChessApplication.prototype.handleStateChange = function handleStateChangeWithOpenSourceVisuals(state) {
  globalThis.__forgeMcpCubeApplication = this;
  exposeDiagnosticsPublisher(this);
  const result = originalHandleStateChange.call(this, state);
  queueMicrotask(() => publishDiagnostics(this));
  return result;
};

const originalStartGame = CubeChessApplication.prototype.startGame;
CubeChessApplication.prototype.startGame = function startGameWithPromotion(config) {
  globalThis.__forgeMcpCubeApplication = this;
  exposeDiagnosticsPublisher(this);
  const result = originalStartGame.call(this, config);
  if (!this.pawnPromotion) this.pawnPromotion = installPawnPromotion(this);
  queueMicrotask(() => publishDiagnostics(this));
  setTimeout(() => publishDiagnostics(this), 2_500);
  return result;
};

ensureDiagnosticsBadge();

void import("../main.js")
  .then(async () => {
    const application = globalThis.__forgeMcpCubeApplication;
    if (application) {
      exposeDiagnosticsPublisher(application);
      publishDiagnostics(application);
    }
    const registration = await registerVisualWebMcpTools();
    globalThis.__forgeMcpVisualToolRegistration = registration;
    if (registration.availability === "WEBMCP_AVAILABLE") console.info("ForgeMCP visual WebMCP tools registered", registration);
    console.info("Cube high-detail visual diagnostics", globalThis.__forgeMcpVisualDiagnostics);
  })
  .catch((error) => {
    console.error("Failed to start Cube Chess 512", error);
  });
