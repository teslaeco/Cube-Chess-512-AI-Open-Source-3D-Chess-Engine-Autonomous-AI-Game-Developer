import * as THREE from "three";

export class SceneController {
  constructor(container) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x101822);
    this.scene.fog = new THREE.Fog(0x101822, 13, 32);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = "game-canvas";
    container.append(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xdbeafe, 0x172030, 2.2));
    const light = new THREE.DirectionalLight(0xfff4dc, 3.4);
    light.position.set(7, 12, 5); light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048); light.shadow.camera.near = 1; light.shadow.camera.far = 32;
    light.shadow.camera.left = -8; light.shadow.camera.right = 8; light.shadow.camera.top = 8; light.shadow.camera.bottom = -8;
    this.scene.add(light);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(13, 64), new THREE.MeshStandardMaterial({ color: 0x162233, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.14; ground.receiveShadow = true; this.scene.add(ground);
    this.disposables = [ground];
  }
  resize(width, height) { this.renderer.setSize(width, height, false); }
  render(camera) { this.renderer.render(this.scene, camera); }
  dispose() {
    this.disposables.forEach((object) => object.traverse?.((child) => { child.geometry?.dispose(); child.material?.dispose(); }));
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
