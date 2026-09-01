import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { OpenSourceStauntonPieceSet } from "./ForgeMcpPremiumPieceSet.js";
import { disposeOwnedPieceResources, PieceRenderer, requiresPieceObjectReplacement } from "./PieceRenderer.js";

describe("PieceRenderer promotion replacement", () => {
  const object = (type, color = "white") => ({
    userData: { piece: { id: "white-pawn-1", type, color } },
  });

  it("rebuilds the 3D object when a pawn promotes to a queen", () => {
    expect(
      requiresPieceObjectReplacement(object("pawn"), {
        id: "white-pawn-1",
        type: "queen",
        color: "white",
      }),
    ).toBe(true);
  });

  it.each(["rook", "bishop", "knight"])(
    "rebuilds the 3D object for %s underpromotion",
    (type) => {
      expect(
        requiresPieceObjectReplacement(object("pawn"), {
          id: "white-pawn-1",
          type,
          color: "white",
        }),
      ).toBe(true);
    },
  );

  it("rebuilds the pawn when undo restores a promoted piece", () => {
    expect(
      requiresPieceObjectReplacement(object("queen"), {
        id: "white-pawn-1",
        type: "pawn",
        color: "white",
      }),
    ).toBe(true);
  });

  it("keeps the current object when type and colour are unchanged", () => {
    expect(
      requiresPieceObjectReplacement(object("queen"), {
        id: "white-pawn-1",
        type: "queen",
        color: "white",
      }),
    ).toBe(false);
  });

  it("does not dispose shared template geometry when one piece is removed", () => {
    const set = new OpenSourceStauntonPieceSet();
    const first = set.create("pawn", "white");
    const second = set.create("pawn", "white");
    let firstMesh;
    let secondMesh;
    first.traverse((child) => { if (!firstMesh && child.isMesh) firstMesh = child; });
    second.traverse((child) => { if (!secondMesh && child.isMesh) secondMesh = child; });
    expect(firstMesh.geometry).toBe(secondMesh.geometry);
    const geometryDispose = vi.spyOn(firstMesh.geometry, "dispose");
    const materialDispose = vi.spyOn(firstMesh.material, "dispose");
    disposeOwnedPieceResources(first);
    expect(geometryDispose).not.toHaveBeenCalled();
    expect(materialDispose).toHaveBeenCalledOnce();
    geometryDispose.mockRestore();
    materialDispose.mockRestore();
  });

  it("restores the cyan texture glow after a selection highlight is removed", () => {
    const renderer = new PieceRenderer([], { create: vi.fn() });
    const material = new THREE.MeshPhysicalMaterial({ emissive: 0x62f4ff, emissiveIntensity: 1.05 });
    material.userData = {
      forgeBaseEmissiveHex: 0x62f4ff,
      forgeBaseEmissiveIntensity: 1.05,
    };
    const object = new THREE.Group();
    object.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));

    renderer.setBlueHighlight(object, true, 0.95);
    expect(material.emissive.getHex()).toBe(0x2f7dff);
    expect(material.emissiveIntensity).toBe(0.95);
    renderer.setBlueHighlight(object, false);
    expect(material.emissive.getHex()).toBe(0x62f4ff);
    expect(material.emissiveIntensity).toBe(1.05);
  });
});
