import { readFile } from "node:fs/promises";
import * as THREE from "three";
import {
  HIGH_DETAIL_CHESS_REVISION,
  HIGH_DETAIL_CHESS_SOURCE_ID,
  prepareHighDetailPiece,
} from "../web/renderer/HighDetailChessModelSet.js";
import { decodeBase64Bytes, parseCompactChessGeometry } from "../web/renderer/MeshyChessModelSet.js";
import { HIGH_DETAIL_CHESS_TEXTURE_STYLE } from "../web/renderer/HighDetailChessTextureSet.js";

const types = ["pawn", "rook", "knight", "bishop", "queen", "king"];
const material = new THREE.MeshPhysicalMaterial({ color: 0xffffff });
const measurements = [];

for (const type of types) {
  const asset = new URL(`../public/assets/high-detail-chess-models/${type}.ccm.b64`, import.meta.url);
  const geometry = parseCompactChessGeometry(decodeBase64Bytes(await readFile(asset, "utf8")));
  const object = prepareHighDetailPiece(geometry, material, type, "white");
  object.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  const surface = object.getObjectByProperty("isMesh", true);
  const textureMaps = {
    color: Boolean(surface.material.map),
    roughness: Boolean(surface.material.roughnessMap),
    metalness: Boolean(surface.material.metalnessMap),
    bump: Boolean(surface.material.bumpMap),
    emissive: Boolean(surface.material.emissiveMap),
  };
  if (!geometry.getAttribute("uv") || surface.material.userData.forgeTextureStyle !== HIGH_DETAIL_CHESS_TEXTURE_STYLE || !Object.values(textureMaps).every(Boolean)) {
    throw new Error(`${type} is missing the approved PBR texture stack`);
  }
  measurements.push({
    type,
    vertices: geometry.attributes.position.count,
    triangles: geometry.index.count / 3,
    width: size.x,
    height: size.y,
    depth: size.z,
    runtimePrimarySource: HIGH_DETAIL_CHESS_SOURCE_ID,
    textureStyle: surface.material.userData.forgeTextureStyle,
    textureMaps,
  });
}

console.log("FORGEMCP_PREMIUM_METRICS=" + JSON.stringify({
  preset: "FORGEMCP_PREMIUM",
  revision: HIGH_DETAIL_CHESS_REVISION,
  measuredAt: new Date().toISOString(),
  measurements,
}));
