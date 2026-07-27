import * as THREE from "three";

// Kept as a compatibility export for existing tests and documentation. The
// remote model is deliberately no longer loaded because it replaced the
// in-game Staunton knight with the old cartoon-like mesh after page startup.
const MODEL_URL =
  "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@2bac6f8c57bf471df0d2a1e8a8ec023c7801dddf/Models/ABeautifulGame/glTF-Binary/ABeautifulGame.glb";
const MAX_HEIGHT = 0.78;
const MAX_FOOTPRINT = 0.68;

export function fitObjectInsideCell(model, {
  maxHeight = MAX_HEIGHT,
  maxFootprint = MAX_FOOTPRINT,
} = {}) {
  model.position.set(0, 0, 0);
  model.scale.setScalar(1);
  model.updateMatrixWorld(true);

  let bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("The knight geometry has invalid bounds");
  }

  const scale = Math.min(
    maxHeight / size.y,
    maxFootprint / size.x,
    maxFootprint / size.z,
  );
  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);

  bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= bounds.min.y;
  model.updateMatrixWorld(true);
  return model;
}

export class ExternalKnightModel {
  constructor(_materials) {
    // The constructor remains for API compatibility with PieceGeometryFactory.
  }

  create(color, stauntonKnight) {
    stauntonKnight.name = `${color}-knight-staunton`;
    stauntonKnight.userData.externalModelState = "disabled";
    return stauntonKnight;
  }
}

export { MODEL_URL as EXTERNAL_KNIGHT_MODEL_URL };
