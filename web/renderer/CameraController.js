import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CELL_SIZE, boardPosition } from "./coordinates.js";

const DEFAULT_DIRECTION = new THREE.Vector3(1, 0.82, 1).normalize();

export class CameraController {
  constructor(canvas) {
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 180);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;
    this.controls.enableRotate = true;
    this.controls.rotateSpeed = 0.82;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 0.9;
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.72;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 3.5;
    this.controls.maxDistance = 72;
    this.controls.minPolarAngle = 0.04;
    this.controls.maxPolarAngle = Math.PI - 0.04;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
    this.controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    this.controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
    this.controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    this.controls.touches.ONE = THREE.TOUCH.ROTATE;
    this.controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    canvas.style.touchAction = "none";
    canvas.style.userSelect = "none";

    this.desiredTarget = null;
    this.desiredPosition = null;
    this.boardObject = null;
    this.userInteracting = false;

    this.handleInteractionStart = () => {
      this.userInteracting = true;
      this.cancelAutomaticMove();
    };
    this.handleInteractionEnd = () => {
      this.userInteracting = false;
    };
    this.controls.addEventListener("start", this.handleInteractionStart);
    this.controls.addEventListener("end", this.handleInteractionEnd);

    this.camera.position.set(18, 18, 18);
    this.controls.target.set(0, CELL_SIZE * 3.5, 0);
    this.controls.update();
  }

  cancelAutomaticMove() {
    this.desiredPosition = null;
    this.desiredTarget = null;
  }

  setBoardObject(boardObject) {
    this.boardObject = boardObject;
    this.fitBoard(true);
  }

  reset() {
    this.fitBoard(false);
  }

  cubeView() {
    this.fitBoard(false);
  }

  fitBoard(immediate = false) {
    if (!this.boardObject) return;
    const box = new THREE.Box3().setFromObject(this.boardObject);
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect);
    const limitingFov = Math.max(0.2, Math.min(verticalFov, horizontalFov));
    const distance = Math.min(
      this.controls.maxDistance * 0.92,
      Math.max(this.controls.minDistance, (sphere.radius / Math.sin(limitingFov / 2)) * 1.16),
    );
    const target = sphere.center.clone();
    const position = target.clone().addScaledVector(DEFAULT_DIRECTION, distance);
    this.moveTo(position, target, immediate);
  }

  activeLayerView(levelIndex) {
    const target = new THREE.Vector3(0, levelIndex * CELL_SIZE, 0);
    const distance = Math.min(18, this.controls.maxDistance);
    const position = target
      .clone()
      .add(new THREE.Vector3(0.4, 1.65, 0.5).normalize().multiplyScalar(distance));
    this.moveTo(position, target, false);
  }

  followLevel(levelIndex) {
    if (this.userInteracting) return;
    const currentOffset = this.camera.position.clone().sub(this.controls.target);
    const target = new THREE.Vector3(0, levelIndex * CELL_SIZE, 0);
    this.moveTo(target.clone().add(currentOffset), target, false);
  }

  followSquare(square) {
    if (!square || this.userInteracting) return;
    const world = boardPosition(square);
    const target = new THREE.Vector3(world.x, world.y, world.z);
    const offset = this.camera.position.clone().sub(this.controls.target);
    this.moveTo(target.clone().add(offset), target, false);
  }

  moveTo(position, target, immediate) {
    if (immediate) {
      this.camera.position.copy(position);
      this.controls.target.copy(target);
      this.cancelAutomaticMove();
      this.controls.update();
      return;
    }
    if (this.userInteracting) return;
    this.desiredPosition = position;
    this.desiredTarget = target;
  }

  resize(width, height) {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  update() {
    if (!this.userInteracting && this.desiredPosition && this.desiredTarget) {
      this.camera.position.lerp(this.desiredPosition, 0.075);
      this.controls.target.lerp(this.desiredTarget, 0.09);
      if (
        this.camera.position.distanceToSquared(this.desiredPosition) < 0.002 &&
        this.controls.target.distanceToSquared(this.desiredTarget) < 0.002
      ) {
        this.camera.position.copy(this.desiredPosition);
        this.controls.target.copy(this.desiredTarget);
        this.cancelAutomaticMove();
      }
    }
    this.controls.update();
  }

  dispose() {
    this.controls.removeEventListener("start", this.handleInteractionStart);
    this.controls.removeEventListener("end", this.handleInteractionEnd);
    this.controls.dispose();
  }
}
