import * as THREE from "three";
import { afterEach, describe, expect, it } from "vitest";
import {
  FORGEMCP_VISUAL_PRESETS,
  registerVisualWebMcpTools,
  rollbackPieceVisuals,
  upgradePieceVisuals,
} from "./visualTools.js";
import { HIGH_DETAIL_CHESS_SOURCE_ID } from "../renderer/HighDetailChessModelSet.js";
import { HIGH_DETAIL_CHESS_TEXTURE_STYLE } from "../renderer/HighDetailChessTextureSet.js";
import { CRAYON_CATHEDRAL_SOURCE_ID } from "../renderer/CrayonCathedralPieceSet.js";
import { CRAYON_CATHEDRAL_TEXTURE_STYLE } from "../renderer/CrayonCathedralTextureSet.js";
import {
  CLASSIC_BLACK_WHITE_MATERIAL_STYLE,
  LAB_LED_COLOR_MATERIAL_STYLE,
} from "../renderer/VisualThemeMaterials.js";
import { pieceCellEnvelope } from "../renderer/pieceScaleProfile.js";

function legacyPiece(type, color, id, position) {
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(0.25, 0.5, 0.25);
  const material = new THREE.MeshStandardMaterial({ color: color === "white" ? 0xffffff : 0x222222 });
  const surface = new THREE.Mesh(geometry, material);
  surface.name = `${color}-${type}-meshy-surface`;
  group.add(surface);
  group.userData = { kind: "piece", piece: { id, type, color, position } };
  return group;
}

function premiumPiece(type, color, id, position) {
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(0.35, 48, 24);
  const material = new THREE.MeshStandardMaterial({ color: color === "white" ? 0xf4eee0 : 0x1a2837 });
  const texture = new THREE.Texture();
  material.map = texture;
  material.roughnessMap = texture;
  material.metalnessMap = texture;
  material.bumpMap = texture;
  material.emissiveMap = texture;
  material.userData.forgeTextureStyle = LAB_LED_COLOR_MATERIAL_STYLE;
  const surface = new THREE.Mesh(geometry, material);
  surface.name = `${color}-${type}-uploaded-high-detail-surface`;
  surface.userData.forgeVisualSource = HIGH_DETAIL_CHESS_SOURCE_ID;
  group.add(surface);
  group.userData = {
    kind: "piece",
    piece: { id, type, color, position },
    highDetailModelState: "ready",
    forgeVisualSource: HIGH_DETAIL_CHESS_SOURCE_ID,
  };
  return group;
}

function classicBlackWhitePiece(type, color, id, position) {
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(0.35, 48, 24);
  const material = new THREE.MeshPhysicalMaterial({
    color: color === "white" ? 0xf5f2e9 : 0x08090b,
    roughness: color === "white" ? 0.3 : 0.2,
  });
  material.roughnessMap = new THREE.Texture();
  material.bumpMap = new THREE.Texture();
  material.userData.forgeTextureStyle = CLASSIC_BLACK_WHITE_MATERIAL_STYLE;
  const surface = new THREE.Mesh(geometry, material);
  surface.name = `${color}-${type}-classic-black-white-surface`;
  surface.userData.forgeVisualSource = HIGH_DETAIL_CHESS_SOURCE_ID;
  group.add(surface);
  group.userData = {
    kind: "piece",
    piece: { id, type, color, position },
    highDetailModelState: "ready",
    forgeVisualSource: HIGH_DETAIL_CHESS_SOURCE_ID,
  };
  return group;
}

function crayonCathedralPiece(type, color, id, position) {
  const group = new THREE.Group();
  const geometry = new THREE.IcosahedronGeometry(0.36, 4);
  const material = new THREE.MeshStandardMaterial({ color: color === "white" ? 0x37d9ca : 0xef5f3b });
  const texture = new THREE.Texture();
  material.map = texture;
  material.roughnessMap = texture;
  material.metalnessMap = texture;
  material.bumpMap = texture;
  material.emissiveMap = texture;
  material.userData.forgeTextureStyle = CRAYON_CATHEDRAL_TEXTURE_STYLE;
  const surface = new THREE.Mesh(geometry, material);
  surface.name = `${color}-${type}-crayon-cathedral-surface`;
  surface.userData.forgeVisualSource = CRAYON_CATHEDRAL_SOURCE_ID;
  group.add(surface);
  group.userData = {
    kind: "piece",
    piece: { id, type, color, position },
    crayonCathedralModelState: "ready",
    forgeVisualSource: CRAYON_CATHEDRAL_SOURCE_ID,
  };
  return group;
}

function fakeApplication() {
  const levels = Array.from({ length: 8 }, (_, index) => ({ index, visible: index !== 6 }));
  const boardGroup = new THREE.Group();
  const capturedGroup = new THREE.Group();
  const pieces = new Map();
  const captured = new Map();
  const whitePawn = legacyPiece("pawn", "white", "wp1", { x: 1, y: 2, z: 0 });
  const blackKnight = legacyPiece("knight", "black", "bn1", { x: 4, y: 3, z: 2 });
  const capturedRook = legacyPiece("rook", "white", "wr1", { x: 7, y: 7, z: 1 });
  whitePawn.position.set(1, 0.3, 2);
  blackKnight.position.set(4, 2.3, 3);
  capturedRook.position.set(-6.1, 0.28, 0);
  boardGroup.add(whitePawn, blackKnight);
  capturedGroup.add(capturedRook);
  pieces.set("wp1", whitePawn);
  pieces.set("bn1", blackKnight);
  captured.set("wr1", capturedRook);

  const factory = {
    create(type, color) {
      return legacyPiece(type, color, `new-${type}`, { x: 0, y: 0, z: 0 });
    },
    createLegacy(type, color) {
      return legacyPiece(type, color, `legacy-${type}`, { x: 0, y: 0, z: 0 });
    },
    createPremium(type, color) {
      return premiumPiece(type, color, `premium-${type}`, { x: 0, y: 0, z: 0 });
    },
    createCrayonCathedral(type, color) {
      return crayonCathedralPiece(type, color, `crayon-${type}`, { x: 0, y: 0, z: 0 });
    },
    createClassicBlackWhite(type, color) {
      return classicBlackWhitePiece(type, color, `classic-${type}`, { x: 0, y: 0, z: 0 });
    },
    highDetailModels: {
      async inspect(type) {
        const envelope = pieceCellEnvelope(type);
        return {
          type,
          triangles: 80_000,
          vertices: 40_000,
          bounds: { x: envelope.maxFootprint, y: envelope.maxHeight, z: envelope.maxFootprint },
          finite: true,
          textureStyle: HIGH_DETAIL_CHESS_TEXTURE_STYLE,
          hasUv: true,
          textureMaps: { color: true, roughness: true, metalness: true, bump: true, emissive: true },
        };
      },
    },
    crayonCathedralModels: {
      inspect(type) {
        const envelope = pieceCellEnvelope(type);
        return {
          type,
          triangles: 50_000,
          bounds: { x: envelope.maxFootprint, y: envelope.maxHeight, z: envelope.maxFootprint },
          finite: true,
          textureStyle: CRAYON_CATHEDRAL_TEXTURE_STYLE,
          resources: {
            roles: ["window-glass-detail", "crayon-detail"],
            meshes: 2,
            fullyTexturedMeshes: 2,
          },
        };
      },
    },
  };

  const pieceRenderer = {
    factory,
    pieces,
    captured,
    boardGroup,
    capturedGroup,
    selectedPieceId: "bn1",
    replaceObjectForPiece(id, object, piece, parent) {
      const position = object.position.clone();
      const scale = object.scale.clone();
      object.removeFromParent();
      const replacement = this.factory.create(piece.type, piece.color);
      replacement.userData = {
        ...replacement.userData,
        kind: parent === capturedGroup ? "captured" : "piece",
        piece,
      };
      replacement.position.copy(position);
      replacement.scale.copy(scale);
      parent.add(replacement);
      return replacement;
    },
    addCaptureAura() {},
    setSelected(id) { this.selectedPieceId = id; },
    setLevelVisibility(nextLevels) { this.lastLevels = nextLevels.map((level) => ({ ...level })); },
  };

  return {
    renderer: { pieceRenderer },
    presentation: { snapshot: () => ({ levels: levels.map((level) => ({ ...level })) }) },
  };
}

afterEach(() => {
  delete globalThis.__forgeMcpCubeApplication;
  delete globalThis.document;
});

describe("ForgeMCP premium visual WebMCP tools", () => {
  it("rejects mutation without explicit human approval", async () => {
    globalThis.__forgeMcpCubeApplication = fakeApplication();
    const result = await upgradePieceVisuals({ preset: FORGEMCP_VISUAL_PRESETS.PREMIUM });
    expect(result.state).toBe("FAIL");
    expect(result.verification).toBe("FAIL");
  });

  it("rejects an unsupported preset", async () => {
    globalThis.__forgeMcpCubeApplication = fakeApplication();
    const result = await upgradePieceVisuals({ preset: "FAKE_PRESET", humanApproved: true });
    expect(result.state).toBe("FAIL");
  });

  it("rebuilds active and captured objects while preserving identity, coordinates, selection and levels", async () => {
    const app = fakeApplication();
    globalThis.__forgeMcpCubeApplication = app;
    const beforePositions = new Map([...app.renderer.pieceRenderer.pieces].map(([id, object]) => [id, object.position.clone()]));
    const result = await upgradePieceVisuals({ preset: FORGEMCP_VISUAL_PRESETS.PREMIUM, humanApproved: true });

    expect(result.state).toBe("PASS");
    expect(result.data.presetAfter).toBe(FORGEMCP_VISUAL_PRESETS.PREMIUM);
    expect(result.data.activePieces).toBe(2);
    expect(result.data.capturedPieces).toBe(1);
    expect(result.data.qa.activePieceCountPreserved).toBe(true);
    expect(result.data.qa.capturedPieceCountPreserved).toBe(true);
    expect(result.data.qa.coordinatesPreserved).toBe(true);
    expect(result.data.qa.selectedPiecePreserved).toBe(true);
    expect(result.data.qa.levelVisibilityPreserved).toBe(true);
    expect(result.data.qa.premiumSourceVerified).toBe(true);
    expect(result.data.trianglesAfter).toBeGreaterThan(result.data.trianglesBefore);
    for (const [id, object] of app.renderer.pieceRenderer.pieces) expect(object.position.equals(beforePositions.get(id))).toBe(true);
  });

  it("rolls back to the legacy factory after a premium upgrade", async () => {
    const app = fakeApplication();
    globalThis.__forgeMcpCubeApplication = app;
    const upgraded = await upgradePieceVisuals({ preset: FORGEMCP_VISUAL_PRESETS.PREMIUM, humanApproved: true });
    expect(upgraded.state).toBe("PASS");
    const rolledBack = await rollbackPieceVisuals({ humanApproved: true });
    expect(rolledBack.state).toBe("PASS");
    expect(rolledBack.data.presetAfter).toBe(FORGEMCP_VISUAL_PRESETS.LEGACY);
    expect(rolledBack.data.qa.legacyPresetRestored).toBe(true);
    expect(rolledBack.data.qa.geometryChanged).toBe(true);
    expect(rolledBack.data.qa.sourceChanged).toBe(true);
    expect(rolledBack.data.qa.legacyModelsReady).toBe(true);
  });

  it("keeps the internal legacy rollback outside the player-theme API", async () => {
    const app = fakeApplication();
    globalThis.__forgeMcpCubeApplication = app;
    const upgraded = await upgradePieceVisuals({
      preset: FORGEMCP_VISUAL_PRESETS.PREMIUM,
      humanApproved: true,
    });
    expect(upgraded.state).toBe("PASS");
    app.renderer.setPieceVisualPreset = () => {
      throw new Error("The player-theme API must not receive LEGACY_COMPACT");
    };

    const rolledBack = await rollbackPieceVisuals({ humanApproved: true });

    expect(rolledBack.state).toBe("PASS");
    expect(rolledBack.data.presetAfter).toBe(FORGEMCP_VISUAL_PRESETS.LEGACY);
  });

  it("applies the Crayon Cathedral preset through the same approval-gated WebMCP path", async () => {
    const app = fakeApplication();
    globalThis.__forgeMcpCubeApplication = app;
    const result = await upgradePieceVisuals({
      preset: FORGEMCP_VISUAL_PRESETS.CRAYON_CATHEDRAL,
      humanApproved: true,
    });

    expect(result.state).toBe("PASS");
    expect(result.data.presetAfter).toBe(FORGEMCP_VISUAL_PRESETS.CRAYON_CATHEDRAL);
    expect(result.data.qa.targetSourceVerified).toBe(true);
    expect(result.data.qa.crayonCathedralSourceVerified).toBe(true);
    expect(result.data.qa.targetTexturesVerified).toBe(true);
    expect(result.data.modelStates).toEqual({ ready: 3, unknown: 0 });
  });

  it("applies Classic Black & White with high-detail source and classic materials", async () => {
    const app = fakeApplication();
    globalThis.__forgeMcpCubeApplication = app;
    const result = await upgradePieceVisuals({
      preset: FORGEMCP_VISUAL_PRESETS.CLASSIC_BLACK_WHITE,
      humanApproved: true,
    });

    expect(result.state).toBe("PASS");
    expect(result.data.presetAfter).toBe(
      FORGEMCP_VISUAL_PRESETS.CLASSIC_BLACK_WHITE,
    );
    expect(result.data.qa.targetSourceVerified).toBe(true);
    expect(result.data.qa.classicBlackWhiteSourceVerified).toBe(true);
    expect(result.data.qa.targetTexturesVerified).toBe(true);
    expect(result.data.modelStates).toEqual({
      loading: 0,
      ready: 3,
      fallback: 0,
      unknown: 0,
      timedOut: false,
    });
  });

  it("reports an already-applied premium source without claiming a live mutation", async () => {
    const app = fakeApplication();
    globalThis.__forgeMcpCubeApplication = app;
    const applied = await upgradePieceVisuals({ preset: FORGEMCP_VISUAL_PRESETS.PREMIUM, humanApproved: true });
    expect(applied.state).toBe("PASS");
    const repeated = await upgradePieceVisuals({ preset: FORGEMCP_VISUAL_PRESETS.PREMIUM, humanApproved: true });
    expect(repeated.state).toBe("PASS");
    expect(repeated.data.status).toBe("ALREADY_APPLIED");
    expect(repeated.data.liveMutationPerformed).toBe(false);
  });

  it("registers four real browser-native tools through document.modelContext.registerTool", async () => {
    const tools = [];
    globalThis.document = { modelContext: { registerTool: async (tool) => tools.push(tool) } };
    const registration = await registerVisualWebMcpTools();
    expect(registration.availability).toBe("WEBMCP_AVAILABLE");
    expect(registration.registered).toBe(4);
    expect(tools.map((tool) => tool.name)).toEqual([
      "inspect_piece_visuals",
      "preview_piece_visual_upgrade",
      "upgrade_piece_visuals",
      "rollback_piece_visuals",
    ]);
    expect(typeof tools.find((tool) => tool.name === "upgrade_piece_visuals").execute).toBe("function");
    expect(tools.find((tool) => tool.name === "upgrade_piece_visuals").inputSchema.properties.preset.enum).toEqual([
      FORGEMCP_VISUAL_PRESETS.PREMIUM,
      FORGEMCP_VISUAL_PRESETS.CRAYON_CATHEDRAL,
      FORGEMCP_VISUAL_PRESETS.CLASSIC_BLACK_WHITE,
    ]);
  });
});
