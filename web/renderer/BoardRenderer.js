import * as THREE from "three";
import { SQUARE_SIZE, boardPosition } from "./coordinates.js";

export class BoardRenderer {
  constructor(squares) {
    this.group = new THREE.Group(); this.group.name = "Level A";
    this.squares = new Map(); this.overlays = new Map();
    const geometry = new THREE.BoxGeometry(SQUARE_SIZE, 0.18, SQUARE_SIZE);
    const light = new THREE.MeshStandardMaterial({ color: 0xd8c29d, roughness: 0.78 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x52677b, roughness: 0.8 });
    this.sharedResources = [geometry, light, dark];
    for (const square of squares) {
      const mesh = new THREE.Mesh(geometry, (square.x + square.y) % 2 === 0 ? light : dark);
      const position = boardPosition(square); mesh.position.set(position.x, -0.09, position.z);
      mesh.receiveShadow = true; mesh.userData = { kind: "square", square }; this.group.add(mesh); this.squares.set(square.square3D, mesh);
      const overlay = new THREE.Mesh(new THREE.PlaneGeometry(SQUARE_SIZE * 0.9, SQUARE_SIZE * 0.9), new THREE.MeshBasicMaterial({ color: 0x43d9ff, transparent: true, opacity: 0, depthWrite: false }));
      overlay.rotation.x = -Math.PI / 2; overlay.position.set(position.x, 0.012, position.z); this.group.add(overlay); this.overlays.set(square.square3D, overlay);
    }
  }
  setHighlighted(square3D) { this.overlays.forEach((overlay, key) => { overlay.material.opacity = key === square3D ? 0.42 : 0; }); }
  dispose() {
    this.group.traverse((child) => {
      if (child.userData.kind !== "square") { child.geometry?.dispose(); child.material?.dispose(); }
    });
    this.sharedResources.forEach((resource) => resource.dispose());
    this.group.clear();
  }
}
