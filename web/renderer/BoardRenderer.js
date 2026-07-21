import * as THREE from "three";
import { SQUARE_SIZE, boardPosition } from "./coordinates.js";
import { visibleLayerOpacity } from "./layerVisibility.js";

export class BoardRenderer {
  constructor(squares) {
    this.group = new THREE.Group(); this.group.name = "Cube board";
    this.squares = new Map(); this.overlays = new Map(); this.levelGroups = new Map(); this.levelMaterials = new Map();
    const geometry = new THREE.BoxGeometry(SQUARE_SIZE, 0.18, SQUARE_SIZE);
    this.sharedResources = [geometry];
    for (const square of squares) {
      if (!this.levelGroups.has(square.z)) { const level = new THREE.Group(); level.name = `Level ${square.level}`; this.group.add(level); this.levelGroups.set(square.z, level); const materials = [new THREE.MeshStandardMaterial({ color: 0xd8c29d, roughness: 0.78, transparent: true }), new THREE.MeshStandardMaterial({ color: 0x52677b, roughness: 0.8, transparent: true })]; this.levelMaterials.set(square.z, materials); this.sharedResources.push(...materials); }
      const level = this.levelGroups.get(square.z); const materials = this.levelMaterials.get(square.z);
      const mesh = new THREE.Mesh(geometry, (square.x + square.y) % 2 === 0 ? materials[0] : materials[1]);
      const position = boardPosition(square); mesh.position.set(position.x, position.y - 0.09, position.z);
      mesh.receiveShadow = true; mesh.userData = { kind: "square", square }; level.add(mesh); this.squares.set(square.square3D, mesh);
      const overlay = new THREE.Mesh(new THREE.PlaneGeometry(SQUARE_SIZE * 0.9, SQUARE_SIZE * 0.9), new THREE.MeshBasicMaterial({ color: 0x43d9ff, transparent: true, opacity: 0, depthWrite: false }));
      overlay.rotation.x = -Math.PI / 2; overlay.position.set(position.x, position.y + 0.012, position.z); level.add(overlay); this.overlays.set(square.square3D, overlay);
    }
  }
  setLevels(levels, activeLevel) { for (const level of levels) { const group = this.levelGroups.get(level.index); group.visible = level.visible; const opacity = visibleLayerOpacity(level.index, activeLevel); for (const material of this.levelMaterials.get(level.index)) { material.opacity = opacity; material.depthWrite = opacity >= 0.5; material.depthTest = true; } group.renderOrder = level.index; } }
  setHighlighted(square3D) { this.overlays.forEach((overlay, key) => { overlay.material.opacity = key === square3D ? 0.42 : 0; }); }
  dispose() {
    this.group.traverse((child) => {
      if (child.userData.kind !== "square") { child.geometry?.dispose(); child.material?.dispose(); }
    });
    this.sharedResources.forEach((resource) => resource.dispose());
    this.group.clear();
  }
}
