const TOOL_REVISION = "2026-08-31-real-visual-upgrade-v1";

function getApplication() {
  return globalThis.__forgeMcpCubeApplication ?? null;
}

function countGeometryTriangles(geometry) {
  if (!geometry) return 0;
  if (geometry.index?.count) return Math.floor(geometry.index.count / 3);
  const positionCount = geometry.attributes?.position?.count ?? 0;
  return Math.floor(positionCount / 3);
}

function inspectObject(object) {
  let triangles = 0;
  let meshes = 0;
  const sources = new Set();
  object?.traverse?.((child) => {
    if (!child.isMesh || child.userData?.decorative) return;
    meshes += 1;
    triangles += countGeometryTriangles(child.geometry);
    if (child.name?.includes("meshy")) sources.add("compact-meshy-runtime");
  });
  if (object?.userData?.forgeVisualSource) sources.add(object.userData.forgeVisualSource);
  if (object?.userData?.meshyModelState) sources.add(`meshy-${object.userData.meshyModelState}`);
  return { triangles, meshes, sources: [...sources] };
}

function snapshotPieceVisuals(application) {
  if (!application?.renderer?.pieceRenderer) {
    return {
      state: "NOT_READY",
      reason: "Cube Chess renderer is not initialized yet.",
      revision: TOOL_REVISION,
    };
  }

  const pieceRenderer = application.renderer.pieceRenderer;
  const factory = pieceRenderer.factory;
  const active = [...pieceRenderer.pieces.values()];
  const captured = [...pieceRenderer.captured.values()];
  const all = [...active, ...captured];
  const perObject = all.map(inspectObject);
  const totalTriangles = perObject.reduce((sum, item) => sum + item.triangles, 0);
  const totalMeshes = perObject.reduce((sum, item) => sum + item.meshes, 0);
  const sources = [...new Set(perObject.flatMap((item) => item.sources))];

  return {
    state: "PASS",
    revision: TOOL_REVISION,
    mode: factory.__forgeVisualMode ?? "compact-meshy-runtime",
    activePieces: active.length,
    capturedPieces: captured.length,
    renderedPieceObjects: all.length,
    totalTriangles,
    averageTrianglesPerPiece: all.length ? Math.round(totalTriangles / all.length) : 0,
    totalSourceMeshes: totalMeshes,
    sources,
    provenance: [
      "web/renderer/PieceGeometryFactory.js",
      "web/renderer/MeshyChessModelSet.js",
      "public/assets/meshy-chess-models/*.ccm.b64",
      "web/forgemcp/visualTools.js",
    ],
  };
}

function rememberOriginalFactory(factory) {
  if (!factory?.meshyModels) throw new Error("Meshy model provider is unavailable.");
  if (!factory.__forgeOriginalMeshyCreate) {
    factory.__forgeOriginalMeshyCreate = factory.meshyModels.create.bind(factory.meshyModels);
  }
}

function rebuildPieceObjects(application) {
  const pieceRenderer = application.renderer.pieceRenderer;

  for (const [id, object] of [...pieceRenderer.pieces.entries()]) {
    const piece = object.userData?.piece;
    if (!piece) continue;
    const replacement = pieceRenderer.replaceObjectForPiece(
      id,
      object,
      piece,
      pieceRenderer.boardGroup,
    );
    replacement.userData = { kind: "piece", piece };
    pieceRenderer.pieces.set(id, replacement);
  }

  for (const [id, object] of [...pieceRenderer.captured.entries()]) {
    const piece = object.userData?.piece;
    if (!piece) continue;
    const replacement = pieceRenderer.replaceObjectForPiece(
      id,
      object,
      piece,
      pieceRenderer.capturedGroup,
    );
    replacement.userData = { kind: "captured", piece };
    replacement.scale.setScalar(0.82);
    pieceRenderer.addCaptureAura(replacement, piece.color);
    pieceRenderer.captured.set(id, replacement);
  }

  pieceRenderer.setSelected(pieceRenderer.selectedPieceId);
  pieceRenderer.setLevelVisibility(application.presentation.snapshot().levels);
}

function applyPremiumProceduralMode(application) {
  const factory = application.renderer.pieceRenderer.factory;
  rememberOriginalFactory(factory);
  factory.meshyModels.create = (type, color, fallback) => {
    fallback.name = `${color}-${type}-forgemcp-premium-procedural`;
    fallback.userData.forgeVisualSource = "procedural-high-detail";
    fallback.userData.forgeVisualType = type;
    fallback.userData.forgeVisualColor = color;
    return fallback;
  };
  factory.__forgeVisualMode = "procedural-high-detail";
  rebuildPieceObjects(application);
}

function restoreCompactMeshyMode(application) {
  const factory = application.renderer.pieceRenderer.factory;
  rememberOriginalFactory(factory);
  factory.meshyModels.create = factory.__forgeOriginalMeshyCreate;
  factory.__forgeVisualMode = "compact-meshy-runtime";
  rebuildPieceObjects(application);
}

function structuredResult(state, data, verification = state === "PASS" ? "PASS" : "WARNING") {
  return {
    state,
    verification,
    data,
    timestamp: new Date().toISOString(),
    provenance: data?.provenance ?? ["web/forgemcp/visualTools.js"],
  };
}

async function inspectPieceVisuals() {
  const application = getApplication();
  if (!application) {
    return structuredResult("WARNING", {
      status: "NOT_READY",
      reason: "Start or display Cube Chess before inspecting piece visuals.",
      provenance: ["web/forgemcp/visualTools.js"],
    }, "INSUFFICIENT_DATA");
  }
  return structuredResult("PASS", snapshotPieceVisuals(application));
}

async function previewPieceVisualUpgrade() {
  const application = getApplication();
  if (!application) {
    return structuredResult("WARNING", {
      status: "NOT_READY",
      reason: "Cube Chess application instance is not available yet.",
      provenance: ["web/forgemcp/visualTools.js"],
    }, "INSUFFICIENT_DATA");
  }
  const before = snapshotPieceVisuals(application);
  return structuredResult("PASS", {
    status: "AWAITING_HUMAN_APPROVAL",
    before,
    proposedMode: "procedural-high-detail",
    action: "Replace compact runtime Meshy surfaces with the game's real procedural chess geometry for every currently rendered piece.",
    reversible: true,
    liveMutationPerformed: false,
    verificationPlan: [
      "rebuild every active and captured piece",
      "measure rendered triangles from Three.js BufferGeometry",
      "preserve positions, side, selection and level visibility",
      "allow rollback to compact Meshy runtime assets",
    ],
    provenance: before.provenance,
  }, "WARNING");
}

async function upgradePieceVisuals(input = {}) {
  if (input?.humanApproved !== true) {
    return structuredResult("FAIL", {
      error: "Human approval is required before mutating live game visuals.",
      requiredInput: { humanApproved: true },
      provenance: ["web/forgemcp/visualTools.js"],
    }, "FAIL");
  }
  const application = getApplication();
  if (!application) {
    return structuredResult("WARNING", {
      status: "NOT_READY",
      reason: "Cube Chess application instance is not available yet.",
      provenance: ["web/forgemcp/visualTools.js"],
    }, "INSUFFICIENT_DATA");
  }

  const before = snapshotPieceVisuals(application);
  applyPremiumProceduralMode(application);
  await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  const after = snapshotPieceVisuals(application);

  return structuredResult("PASS", {
    status: "APPLIED",
    before,
    after,
    changed: before.mode !== after.mode || before.totalTriangles !== after.totalTriangles,
    triangleDelta: (after.totalTriangles ?? 0) - (before.totalTriangles ?? 0),
    reversible: true,
    humanApproved: true,
    liveMutationPerformed: true,
    qa: {
      allRenderedPiecesPresent: after.renderedPieceObjects === before.renderedPieceObjects,
      activePieceCountPreserved: after.activePieces === before.activePieces,
      modeApplied: after.mode === "procedural-high-detail",
      result: after.renderedPieceObjects === before.renderedPieceObjects && after.mode === "procedural-high-detail" ? "PASS" : "FAIL",
    },
    provenance: after.provenance,
  });
}

async function rollbackPieceVisuals(input = {}) {
  if (input?.humanApproved !== true) {
    return structuredResult("FAIL", {
      error: "Human approval is required before rolling back live game visuals.",
      requiredInput: { humanApproved: true },
      provenance: ["web/forgemcp/visualTools.js"],
    }, "FAIL");
  }
  const application = getApplication();
  if (!application) {
    return structuredResult("WARNING", {
      status: "NOT_READY",
      reason: "Cube Chess application instance is not available yet.",
      provenance: ["web/forgemcp/visualTools.js"],
    }, "INSUFFICIENT_DATA");
  }

  const before = snapshotPieceVisuals(application);
  restoreCompactMeshyMode(application);
  await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  const after = snapshotPieceVisuals(application);
  return structuredResult("PASS", {
    status: "ROLLED_BACK",
    before,
    after,
    reversible: true,
    humanApproved: true,
    liveMutationPerformed: true,
    provenance: after.provenance,
  });
}

const INPUT_NONE = { type: "object", properties: {}, additionalProperties: false };
const INPUT_APPROVAL = {
  type: "object",
  properties: { humanApproved: { type: "boolean", const: true } },
  required: ["humanApproved"],
  additionalProperties: false,
};
const OUTPUT = { type: "object", additionalProperties: true };

export async function registerVisualWebMcpTools() {
  const modelContext = document?.modelContext;
  if (!modelContext || typeof modelContext.registerTool !== "function") {
    return { availability: "WEBMCP_UNAVAILABLE", registered: 0 };
  }

  const tools = [
    {
      name: "inspect_piece_visuals",
      description: "Inspect the real Cube Chess Three.js piece geometry currently rendered, including measured triangle counts and asset provenance.",
      inputSchema: INPUT_NONE,
      outputSchema: OUTPUT,
      execute: inspectPieceVisuals,
    },
    {
      name: "preview_piece_visual_upgrade",
      description: "Preview a reversible ForgeMCP visual upgrade for Cube Chess pieces without mutating the live game.",
      inputSchema: INPUT_NONE,
      outputSchema: OUTPUT,
      execute: previewPieceVisualUpgrade,
    },
    {
      name: "upgrade_piece_visuals",
      description: "After explicit human approval, rebuild every live Cube Chess piece with the higher-detail procedural geometry and return measured before/after QA.",
      inputSchema: INPUT_APPROVAL,
      outputSchema: OUTPUT,
      execute: upgradePieceVisuals,
    },
    {
      name: "rollback_piece_visuals",
      description: "After explicit human approval, restore the compact Meshy runtime piece pipeline and return measured before/after state.",
      inputSchema: INPUT_APPROVAL,
      outputSchema: OUTPUT,
      execute: rollbackPieceVisuals,
    },
  ];

  let registered = 0;
  for (const tool of tools) {
    await modelContext.registerTool(tool);
    registered += 1;
  }
  return { availability: "WEBMCP_AVAILABLE", registered, revision: TOOL_REVISION };
}
