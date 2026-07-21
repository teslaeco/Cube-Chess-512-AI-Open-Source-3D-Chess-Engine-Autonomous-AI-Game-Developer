import * as THREE from "three";

export class SceneController {
  constructor(container) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x101822);
    this.scene.fog = new THREE.Fog(0x101822, 16, 38);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = Number(
      localStorage.getItem("cubeChessBrightness") ?? 1,
    );
    this.renderer.domElement.className = "game-canvas";
    container.append(this.renderer.domElement);

    this.ambient = new THREE.AmbientLight(0xffffff, 1.05);
    this.hemisphere = new THREE.HemisphereLight(0xeaf2ff, 0x263243, 1.7);
    this.keyLight = new THREE.DirectionalLight(0xfff4dc, 2.7);
    this.keyLight.position.set(8, 14, 7);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.fillLight = new THREE.DirectionalLight(0xbfdcff, 1.15);
    this.fillLight.position.set(-9, 8, -6);
    this.scene.add(
      this.ambient,
      this.hemisphere,
      this.keyLight,
      this.fillLight,
    );

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(13, 64),
      new THREE.MeshStandardMaterial({ color: 0x162233, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.14;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.disposables = [ground];
  }

  setBrightness(value) {
    const brightness = Math.min(1.5, Math.max(0.5, Number(value)));
    this.renderer.toneMappingExposure = brightness;
    localStorage.setItem("cubeChessBrightness", String(brightness));
  }

  resize(width, height) {
    this.renderer.setSize(width, height, false);
  }

  render(camera) {
    this.renderer.render(this.scene, camera);
  }

  dispose() {
    this.disposables.forEach((object) =>
      object.traverse?.((child) => {
        child.geometry?.dispose();
        child.material?.dispose();
      }),
    );
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
