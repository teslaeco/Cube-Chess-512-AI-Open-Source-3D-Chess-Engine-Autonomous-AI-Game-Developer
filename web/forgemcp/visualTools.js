import {
  HIGH_DETAIL_CHESS_REVISION,
  HIGH_DETAIL_CHESS_SOURCE_ID,
} from "../renderer/HighDetailChessModelSet.js";
import { pieceCellEnvelope } from "../renderer/pieceScaleProfile.js";

const TOOL_REVISION = "2026-09-01-owner-uploaded-high-detail-verification-v4";
const PREMIUM_PRESET = "FORGEMCP_PREMIUM";
const LEGACY_PRESET = "LEGACY_COMPACT";
const PIECE_TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];

function getApplication() {
  return globalThis.__forgeMcpCubeApplication ?? null;
}

function countGeometryTriangles(geometry) {
  if (!geometry) return 0;
  if (geometry.index?.count) return Math.floor(geometry.index.count / 3);
  return Math.floor((geometry.attributes?.position?.count ?? 0) / 3);
}

function inspectObject(object) {
  let triangles = 0;
  let meshes = 0;
  const sources = new Set();
  const materialSignatures = new Set();
  object?.traverse?.((child) => {
    if (child.userData?.forgeVisualSource) sources.add(child.userData.forgeVisualSource);
    if (child.userData?.meshyModelState) sources.add(`meshy-${child.userData.meshyModelState}`);
    if (child.userData?.highDetailModelState) sources.add(`high-detail-${child.userData.highDetailModelState}`);
    if (!child.isMesh || child.userData?.decorative) return;
    meshes += 1;
    triangles += countGeometryTriangles(child.geometry);
    if (child.name?.includes("meshy")) sources.add("compact-meshy-runtime");
    const material = Array.isArray(child.material) ? child.material[0] : child.material;
    if (material?.color) materialSignatures.add(`${material.type}:${material.color.getHexString()}`);
  });
  return { triangles, meshes, sources: [...sources], materialSignatures: [...materialSignatures] };
}

function clonePieceCoordinates(pieceRenderer) {
  return [...pieceRenderer.pieces.entries()].map(([id, object]) => ({
    id,
    square: object.userData?.piece?.position ? { ...object.userData.piece.position } : null,
    world: { x: object.position.x, y: object.position.y, z: object.position.z },
  }));
}

function sameCoordinates(before, after) {
  if (before.length !== after.length) return false;
  const indexed = new Map(after.map((item) => [item.id, item]));
  return before.every((item) => {
    const next = indexed.get(item.id);
    return next && JSON.stringify(item.square) === JSON.stringify(next.square) &&
      item.world.x === next.world.x && item.world.y === next.world.y && item.world.z === next.world.z;
  });
}

function snapshotPieceVisuals(application) {
  if (!application?.renderer?.pieceRenderer) {
    return { state: "NOT_READY", reason: "Cube Chess renderer is not initialized yet.", revision: TOOL_REVISION };
  }
  const pieceRenderer = application.renderer.pieceRenderer;
  const factory = pieceRenderer.factory;
  const activeEntries = [...pieceRenderer.pieces.entries()];
  const capturedEntries = [...pieceRenderer.captured.entries()];
  const allEntries = [...activeEntries, ...capturedEntries];
  const inspected = allEntries.map(([id, object]) => ({ id, piece: object.userData?.piece, ...inspectObject(object) }));
  const totalTriangles = inspected.reduce((sum, item) => sum + item.triangles, 0);
  const sourceMeshes = inspected.reduce((sum, item) => sum + item.meshes, 0);
  const sources = [...new Set(inspected.flatMap((item) => item.sources))];
  const typeTriangles = Object.fromEntries(PIECE_TYPES.map((type) => {
    const sample = inspected.find((item) => item.piece?.type === type);
    return [type, sample?.triangles ?? null];
  }));
  const colorMaterials = {};
  for (const color of ["white", "black"]) {
    const sample = inspected.find((item) => item.piece?.color === color);
    colorMaterials[color] = sample?.materialSignatures ?? [];
  }
  return {
    state: "PASS",
    revision: TOOL_REVISION,
    premiumRevision: HIGH_DETAIL_CHESS_REVISION,
    preset: factory.__forgeVisualMode ?? LEGACY_PRESET,
    activePieces: activeEntries.length,
    capturedPieces: capturedEntries.length,
    renderedPieceObjects: allEntries.length,
    totalTriangles,
    averageTrianglesPerPiece: allEntries.length ? Math.round(totalTriangles / allEntries.length) : 0,
    totalSourceMeshes: sourceMeshes,
    typeTriangles,
    sources,
    selectedPieceId: pieceRenderer.selectedPieceId ?? null,
    levels: application.presentation.snapshot().levels.map((level) => ({ index: level.index, visible: level.visible })),
    coordinates: clonePieceCoordinates(pieceRenderer),
    colorMaterials,
    provenance: [
      "web/renderer/PieceGeometryFactory.js",
      "web/renderer/HighDetailChessModelSet.js",
      "public/assets/high-detail-chess-models/*.ccm.b64",
      "scripts/build-high-detail-chess-assets.mjs",
      "web/renderer/MeshyChessModelSet.js",
      "public/assets/meshy-chess-models/*.ccm.b64",
      "web/forgemcp/visualTools.js",
    ],
  };
}

function rememberOriginalFactory(factory) {
  if (!factory || typeof factory.create !== "function") throw new Error("Piece geometry factory is unavailable.");
  if (!factory.__forgeOriginalCreate) {
    const legacyCreate = typeof factory.createLegacy === "function" ? factory.createLegacy : factory.create;
    factory.__forgeOriginalCreate = legacyCreate.bind(factory);
  }
  if (!factory.__forgePremiumCreate) {
    const premiumCreate = typeof factory.createPremium === "function" ? factory.createPremium : factory.create;
    factory.__forgePremiumCreate = premiumCreate.bind(factory);
  }
}

function rebuildPieceObjects(application) {
  const pieceRenderer = application.renderer.pieceRenderer;
  for (const [id, object] of [...pieceRenderer.pieces.entries()]) {
    const piece = object.userData?.piece;
    if (!piece) continue;
    const replacement = pieceRenderer.replaceObjectForPiece(id, object, piece, pieceRenderer.boardGroup);
    replacement.userData = { ...replacement.userData, kind: "piece", piece };
    pieceRenderer.pieces.set(id, replacement);
  }
  for (const [id, object] of [...pieceRenderer.captured.entries()]) {
    const piece = object.userData?.piece;
    if (!piece) continue;
    const replacement = pieceRenderer.replaceObjectForPiece(id, object, piece, pieceRenderer.capturedGroup);
    replacement.userData = { ...replacement.userData, kind: "captured", piece };
    replacement.scale.setScalar(0.82);
    pieceRenderer.addCaptureAura(replacement, piece.color);
    pieceRenderer.captured.set(id, replacement);
  }
  pieceRenderer.setSelected(pieceRenderer.selectedPieceId);
  pieceRenderer.setLevelVisibility(application.presentation.snapshot().levels);
}

function applyPremiumMode(application) {
  const factory = application.renderer.pieceRenderer.factory;
  rememberOriginalFactory(factory);
  factory.create = factory.__forgePremiumCreate;
  factory.__forgeVisualMode = PREMIUM_PRESET;
  rebuildPieceObjects(application);
}

function restoreLegacyMode(application) {
  const factory = application.renderer.pieceRenderer.factory;
  rememberOriginalFactory(factory);
  factory.create = factory.__forgeOriginalCreate;
  factory.__forgeVisualMode = LEGACY_PRESET;
  rebuildPieceObjects(application);
}

function nextFrame() {
  if (typeof requestAnimationFrame === "function") return new Promise((resolve) => requestAnimationFrame(resolve));
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function refreshPublishedDiagnostics() {
  if (typeof globalThis.__forgeMcpPublishVisualDiagnostics === "function") {
    return globalThis.__forgeMcpPublishVisualDiagnostics();
  }
  return null;
}

function legacyModelStates(pieceRenderer) {
  const states = { loading: 0, ready: 0, fallback: 0, unknown: 0 };
  const objects = [...pieceRenderer.pieces.values(), ...pieceRenderer.captured.values()];
  for (const object of objects) {
    const state = object.userData?.meshyModelState;
    if (Object.hasOwn(states, state)) states[state] += 1;
    else states.unknown += 1;
  }
  return states;
}

async function waitForLegacyModels(pieceRenderer, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  let states = legacyModelStates(pieceRenderer);
  while (states.loading > 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    states = legacyModelStates(pieceRenderer);
  }
  return { ...states, timedOut: states.loading > 0 };
}

function highDetailModelStates(pieceRenderer) {
  const states = { loading: 0, ready: 0, fallback: 0, unknown: 0 };
  const objects = [...pieceRenderer.pieces.values(), ...pieceRenderer.captured.values()];
  for (const object of objects) {
    const state = object.userData?.highDetailModelState;
    if (Object.hasOwn(states, state)) states[state] += 1;
    else states.unknown += 1;
  }
  return states;
}

async function waitForHighDetailModels(pieceRenderer, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let states = highDetailModelStates(pieceRenderer);
  while (states.loading > 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    states = highDetailModelStates(pieceRenderer);
  }
  return { ...states, timedOut: states.loading > 0 };
}

function hasPremiumSource(snapshot) {
  return snapshot.sources.includes(HIGH_DETAIL_CHESS_SOURCE_ID) &&
    snapshot.sources.includes("high-detail-ready") &&
    !snapshot.sources.includes("high-detail-loading") &&
    !snapshot.sources.includes("high-detail-fallback");
}

function hasReadyLegacySource(snapshot) {
  return snapshot.sources.includes("compact-meshy-runtime") &&
    !snapshot.sources.includes("meshy-loading") &&
    !snapshot.sources.includes("meshy-fallback");
}

async function premiumGeometryQa(factory) {
  rememberOriginalFactory(factory);
  if (!factory.highDetailModels?.inspect) {
    return { checks: [], result: "FAIL", reason: "High-detail uploaded model set is unavailable." };
  }
  const stats = await Promise.all(
    PIECE_TYPES.map((type) => factory.highDetailModels.inspect(type, "white")),
  );
  const checks = stats.map((stat) => {
    const envelope = pieceCellEnvelope(stat.type);
    return {
      type: stat.type,
      triangles: stat.triangles,
      finiteBounds: stat.finite,
      highDetailTriangles: stat.triangles >= 70_000,
      fitsCellEnvelope: stat.bounds.y <= envelope.maxHeight + 1e-6 && stat.bounds.x <= envelope.maxFootprint + 1e-6 && stat.bounds.z <= envelope.maxFootprint + 1e-6,
      bounds: stat.bounds,
      envelope,
    };
  });
  return { checks, result: checks.every((item) => item.finiteBounds && item.highDetailTriangles && item.fitsCellEnvelope) ? "PASS" : "FAIL" };
}

function structuredResult(state, data, verification = state === "PASS" ? "PASS" : "WARNING") {
  return { state, verification, data, timestamp: new Date().toISOString(), provenance: data?.provenance ?? ["web/forgemcp/visualTools.js"] };
}

export async function inspectPieceVisuals() {
  const application = getApplication();
  if (!application) return structuredResult("WARNING", { status: "NOT_READY", reason: "Start or display Cube Chess before inspecting piece visuals.", provenance: ["web/forgemcp/visualTools.js"] }, "INSUFFICIENT_DATA");
  const geometryQa = await premiumGeometryQa(application.renderer.pieceRenderer.factory);
  const snapshot = snapshotPieceVisuals(application);
  return structuredResult("PASS", { ...snapshot, premiumGeometryQa: geometryQa });
}

export async function previewPieceVisualUpgrade(input = {}) {
  if (input?.preset !== undefined && input.preset !== PREMIUM_PRESET) {
    return structuredResult("FAIL", { error: `Unsupported visual preset: ${input.preset}`, allowed: [PREMIUM_PRESET], provenance: ["web/forgemcp/visualTools.js"] }, "FAIL");
  }
  const application = getApplication();
  if (!application) return structuredResult("WARNING", { status: "NOT_READY", reason: "Cube Chess application instance is not available yet.", provenance: ["web/forgemcp/visualTools.js"] }, "INSUFFICIENT_DATA");
  const before = snapshotPieceVisuals(application);
  const geometryQa = await premiumGeometryQa(application.renderer.pieceRenderer.factory);
  return structuredResult(geometryQa.result === "PASS" ? "PASS" : "FAIL", {
    status: "AWAITING_HUMAN_APPROVAL",
    before,
    proposedPreset: PREMIUM_PRESET,
    premiumGeometry: geometryQa,
    action: "Rebuild every active and captured piece from the owner-uploaded high-detail GLB derivatives.",
    reversible: true,
    liveMutationPerformed: false,
    provenance: before.provenance,
  }, geometryQa.result);
}

export async function upgradePieceVisuals(input = {}) {
  if (input?.preset !== PREMIUM_PRESET) return structuredResult("FAIL", { error: `preset must equal ${PREMIUM_PRESET}`, requiredInput: { preset: PREMIUM_PRESET, humanApproved: true }, provenance: ["web/forgemcp/visualTools.js"] }, "FAIL");
  if (input?.humanApproved !== true) return structuredResult("FAIL", { error: "Human approval is required before mutating live game visuals.", requiredInput: { preset: PREMIUM_PRESET, humanApproved: true }, provenance: ["web/forgemcp/visualTools.js"] }, "FAIL");
  const application = getApplication();
  if (!application) return structuredResult("WARNING", { status: "NOT_READY", reason: "Cube Chess application instance is not available yet.", provenance: ["web/forgemcp/visualTools.js"] }, "INSUFFICIENT_DATA");

  const pieceRenderer = application.renderer.pieceRenderer;
  const before = snapshotPieceVisuals(application);
  const premiumQa = await premiumGeometryQa(pieceRenderer.factory);
  if (premiumQa.result !== "PASS") return structuredResult("FAIL", { status: "QA_BLOCKED", premiumQa, provenance: before.provenance }, "FAIL");

  if (before.preset === PREMIUM_PRESET && hasPremiumSource(before)) {
    return structuredResult("PASS", {
      status: "ALREADY_APPLIED",
      presetBefore: before.preset,
      presetAfter: before.preset,
      before,
      after: before,
      premiumQa,
      reversible: true,
      humanApproved: true,
      liveMutationPerformed: false,
      provenance: before.provenance,
    });
  }

  applyPremiumMode(application);
  const highDetailModels = await waitForHighDetailModels(pieceRenderer);
  refreshPublishedDiagnostics();
  await nextFrame();
  const after = snapshotPieceVisuals(application);
  const coordinatesPreserved = sameCoordinates(before.coordinates, after.coordinates);
  const levelVisibilityPreserved = JSON.stringify(before.levels) === JSON.stringify(after.levels);
  const selectedPiecePreserved = before.selectedPieceId === after.selectedPieceId;
  const differentPlayerMaterials = JSON.stringify(after.colorMaterials.white) !== JSON.stringify(after.colorMaterials.black);
  const qa = {
    activePieceCountPreserved: after.activePieces === before.activePieces,
    capturedPieceCountPreserved: after.capturedPieces === before.capturedPieces,
    coordinatesPreserved,
    selectedPiecePreserved,
    levelVisibilityPreserved,
    allPremiumPieceTypesValid: premiumQa.result === "PASS",
    highDetailModelsReady: highDetailModels.loading === 0 &&
      highDetailModels.fallback === 0 &&
      highDetailModels.unknown === 0 &&
      highDetailModels.ready === after.renderedPieceObjects,
    triangleCountsMeasured: Number.isFinite(before.totalTriangles) && Number.isFinite(after.totalTriangles) && after.totalTriangles > 0,
    geometryChanged: after.totalTriangles !== before.totalTriangles,
    sourceChanged: JSON.stringify([...before.sources].sort()) !== JSON.stringify([...after.sources].sort()),
    premiumSourceVerified: hasPremiumSource(after),
    whiteBlackMaterialsDiffer: differentPlayerMaterials,
    presetApplied: after.preset === PREMIUM_PRESET,
  };
  qa.result = Object.values(qa).every((value) => value === true || value === "PASS") ? "PASS" : "FAIL";
  return structuredResult(qa.result === "PASS" ? "PASS" : "FAIL", {
    status: qa.result === "PASS" ? "APPLIED" : "APPLIED_WITH_QA_FAILURE",
    presetBefore: before.preset,
    presetAfter: after.preset,
    before,
    after,
    activePieces: after.activePieces,
    capturedPieces: after.capturedPieces,
    trianglesBefore: before.totalTriangles,
    trianglesAfter: after.totalTriangles,
    triangleDelta: after.totalTriangles - before.totalTriangles,
    pieceTypesInspected: PIECE_TYPES,
    perTypePremiumTriangles: after.typeTriangles,
    highDetailModels,
    qa,
    reversible: true,
    humanApproved: true,
    liveMutationPerformed: true,
    provenance: after.provenance,
  }, qa.result);
}

export async function rollbackPieceVisuals(input = {}) {
  if (input?.humanApproved !== true) return structuredResult("FAIL", { error: "Human approval is required before rolling back live game visuals.", requiredInput: { humanApproved: true }, provenance: ["web/forgemcp/visualTools.js"] }, "FAIL");
  const application = getApplication();
  if (!application) return structuredResult("WARNING", { status: "NOT_READY", reason: "Cube Chess application instance is not available yet.", provenance: ["web/forgemcp/visualTools.js"] }, "INSUFFICIENT_DATA");
  const before = snapshotPieceVisuals(application);
  if (before.preset === LEGACY_PRESET && hasReadyLegacySource(before)) {
    return structuredResult("PASS", {
      status: "ALREADY_ROLLED_BACK",
      presetBefore: before.preset,
      presetAfter: before.preset,
      before,
      after: before,
      reversible: true,
      humanApproved: true,
      liveMutationPerformed: false,
      provenance: before.provenance,
    });
  }
  restoreLegacyMode(application);
  const legacyModels = await waitForLegacyModels(application.renderer.pieceRenderer);
  refreshPublishedDiagnostics();
  await nextFrame();
  const after = snapshotPieceVisuals(application);
  const qa = {
    activePieceCountPreserved: after.activePieces === before.activePieces,
    capturedPieceCountPreserved: after.capturedPieces === before.capturedPieces,
    coordinatesPreserved: sameCoordinates(before.coordinates, after.coordinates),
    selectedPiecePreserved: before.selectedPieceId === after.selectedPieceId,
    levelVisibilityPreserved: JSON.stringify(before.levels) === JSON.stringify(after.levels),
    legacyPresetRestored: after.preset === LEGACY_PRESET,
    legacyModelsReady: hasReadyLegacySource(after) && legacyModels.loading === 0 && legacyModels.fallback === 0,
    geometryChanged: after.totalTriangles !== before.totalTriangles,
    sourceChanged: JSON.stringify([...before.sources].sort()) !== JSON.stringify([...after.sources].sort()),
  };
  qa.result = Object.values(qa).every((value) => value === true || value === "PASS") ? "PASS" : "FAIL";
  return structuredResult(qa.result === "PASS" ? "PASS" : "FAIL", {
    status: "ROLLED_BACK",
    presetBefore: before.preset,
    presetAfter: after.preset,
    before,
    after,
    legacyModels,
    trianglesBefore: before.totalTriangles,
    trianglesAfter: after.totalTriangles,
    triangleDelta: after.totalTriangles - before.totalTriangles,
    qa,
    reversible: true,
    humanApproved: true,
    liveMutationPerformed: true,
    provenance: after.provenance,
  }, qa.result);
}

const INPUT_NONE = { type: "object", properties: {}, additionalProperties: false };
const INPUT_PREVIEW = { type: "object", properties: { preset: { type: "string", enum: [PREMIUM_PRESET] } }, additionalProperties: false };
const INPUT_UPGRADE = {
  type: "object",
  properties: { preset: { type: "string", const: PREMIUM_PRESET }, humanApproved: { type: "boolean", const: true } },
  required: ["preset", "humanApproved"],
  additionalProperties: false,
};
const INPUT_APPROVAL = { type: "object", properties: { humanApproved: { type: "boolean", const: true } }, required: ["humanApproved"], additionalProperties: false };
const OUTPUT = { type: "object", additionalProperties: true };

export async function registerVisualWebMcpTools() {
  const modelContext = typeof document !== "undefined" ? document.modelContext : null;
  if (!modelContext || typeof modelContext.registerTool !== "function") return { availability: "WEBMCP_UNAVAILABLE", registered: 0 };
  const tools = [
    { name: "inspect_piece_visuals", description: "Inspect real Cube Chess Three.js piece geometry, measured triangle counts, premium geometry QA and provenance.", inputSchema: INPUT_NONE, outputSchema: OUTPUT, execute: inspectPieceVisuals },
    { name: "preview_piece_visual_upgrade", description: "Preview the new ForgeMCP Premium Piece Set and deterministic geometry QA without mutating the live game.", inputSchema: INPUT_PREVIEW, outputSchema: OUTPUT, execute: previewPieceVisualUpgrade },
    { name: "upgrade_piece_visuals", description: "After explicit human approval, rebuild every live Cube Chess piece with the new ForgeMCP Premium Piece Set and return measured before/after QA.", inputSchema: INPUT_UPGRADE, outputSchema: OUTPUT, execute: upgradePieceVisuals },
    { name: "rollback_piece_visuals", description: "After explicit human approval, restore the legacy compact Meshy runtime piece pipeline and return measured rollback QA.", inputSchema: INPUT_APPROVAL, outputSchema: OUTPUT, execute: rollbackPieceVisuals },
  ];
  let registered = 0;
  for (const tool of tools) { await modelContext.registerTool(tool); registered += 1; }
  return { availability: "WEBMCP_AVAILABLE", registered, revision: TOOL_REVISION, preset: PREMIUM_PRESET };
}

export const FORGEMCP_VISUAL_PRESETS = Object.freeze({ LEGACY: LEGACY_PRESET, PREMIUM: PREMIUM_PRESET });
