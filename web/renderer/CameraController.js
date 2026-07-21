import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class CameraController {
  constructor(canvas) {
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 7; this.controls.maxDistance = 32;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.reset();
  }
  reset() { this.cubeView(); }
  cubeView() { this.camera.position.set(13, 16, 14); this.controls.target.set(0, 8.4, 0); this.controls.update(); }
  activeLayerView(levelIndex) { this.camera.position.set(8.8, 10.5 + levelIndex * 2.4, 9.5); this.controls.target.set(0, levelIndex * 2.4, 0); this.controls.update(); }
  resize(width, height) { this.camera.aspect = width / Math.max(height, 1); this.camera.updateProjectionMatrix(); }
  update() { this.controls.update(); }
  dispose() { this.controls.dispose(); }
}
