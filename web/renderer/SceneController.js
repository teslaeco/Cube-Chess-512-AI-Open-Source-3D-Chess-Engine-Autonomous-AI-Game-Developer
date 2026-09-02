import * as THREE from "three";
import { visualThemeForPreset } from "./visualThemes.js";

export class SceneController {
  constructor(container) {
    const interactionTestMode = new URLSearchParams(location.search).has("e2e");
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x101822);
    // Distance must never change board brightness. Fog is an explicit,
    // persisted opt-in graphics setting instead of a default effect.
    this.scene.fog = null;
    this.renderer = new THREE.WebGLRenderer({
      antialias: !interactionTestMode,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(
      interactionTestMode ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    this.renderer.shadowMap.enabled = !interactionTestMode;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = Number(
      localStorage.getItem("cubeChessBrightness") ?? 1,
    );
    this.renderer.domElement.className = "game-canvas";
    this.renderer.domElement.setAttribute("aria-label", "Interaktywna plansza szachowa 3D 8 na 8 na 8");
    container.append(this.renderer.domElement);

    this.ambient = new THREE.AmbientLight(0xffffff, 1.05);
    this.hemisphere = new THREE.HemisphereLight(0xeaf2ff, 0x263243, 1.7);
    this.keyLight = new THREE.DirectionalLight(0xfff4dc, 2.7);
    this.keyLight.position.set(8, 14, 7);
    this.keyLight.castShadow = !interactionTestMode;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.left = -12;
    this.keyLight.shadow.camera.right = 12;
    this.keyLight.shadow.camera.top = 16;
    this.keyLight.shadow.camera.bottom = -8;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 45;
    this.keyLight.shadow.bias = -0.00018;
    this.keyLight.shadow.normalBias = 0.018;
    this.keyLight.shadow.radius = 3;
    this.fillLight = new THREE.DirectionalLight(0xbfdcff, 1.15);
    this.fillLight.position.set(-9, 8, -6);
    this.rimLight = new THREE.DirectionalLight(0x62f4ff, 0.55);
    this.rimLight.position.set(-2, 11, 12);
    this.scene.add(
      this.ambient,
      this.hemisphere,
      this.keyLight,
      this.fillLight,
      this.rimLight,
    );

    this.groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x162233,
      roughness: 0.95,
    });
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(13, 64),
      this.groundMaterial,
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.14;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.disposables = [ground];
    this.setVisualTheme();
  }

  setBrightness(value) {
    const brightness = Math.min(1.5, Math.max(0.5, Number(value)));
    this.renderer.toneMappingExposure = brightness;
    localStorage.setItem("cubeChessBrightness", String(brightness));
  }

  setFog(enabled) {
    this.scene.fog = enabled ? new THREE.Fog(0x101822, 24, 68) : null;
    localStorage.setItem("cubeChessFog", enabled ? "1" : "0");
  }

  setVisualTheme(preset, labLedColorSettings) {
    const theme = visualThemeForPreset(preset, labLedColorSettings);
    this.scene.background.set(theme.backgroundColor);
    this.groundMaterial.color.set(theme.groundColor);
    this.ambient.intensity = theme.ambientIntensity;
    this.hemisphere.color.set(theme.hemisphereSkyColor);
    this.hemisphere.groundColor.set(theme.hemisphereGroundColor);
    this.hemisphere.intensity = theme.hemisphereIntensity;
    this.keyLight.color.set(theme.keyLightColor);
    this.keyLight.intensity = theme.keyLightIntensity;
    this.fillLight.color.set(theme.fillLightColor);
    this.fillLight.intensity = theme.fillLightIntensity;
    this.rimLight.color.set(theme.rimLightColor);
    this.rimLight.intensity = theme.rimLightIntensity;
    this.scene.userData.visualTheme = theme.name;
    return { ...theme };
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
