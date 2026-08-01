import * as THREE from "three";

export const POINTER_DRAG_THRESHOLD = 7;

export function isClickGesture(start, end, threshold = POINTER_DRAG_THRESHOLD) {
  if (!start || !end || start.pointerId !== end.pointerId) return false;
  return Math.hypot(end.clientX - start.clientX, end.clientY - start.clientY) <= threshold;
}

export function selectNearestMetadata(intersections, activeLevel, findMetadata) {
  const seen = new Set();
  for (const intersection of intersections) {
    const metadata = findMetadata(intersection.object);
    if (!metadata || metadata.kind === "grid" || metadata.kind === "captured") continue;

    const key = metadata.kind === "piece"
      ? `piece:${metadata.piece?.id ?? "unknown"}`
      : `square:${metadata.square?.square3D ?? "unknown"}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const level = metadata.kind === "piece"
      ? metadata.piece?.position?.z
      : metadata.square?.z;
    if (level === activeLevel) return metadata;
  }
  return null;
}

export class SelectionController {
  constructor(
    canvas,
    camera,
    roots,
    getActiveLevel,
    onSelection,
    canSelect = () => true,
  ) {
    this.canvas = canvas;
    this.camera = camera;
    this.roots = roots;
    this.getActiveLevel = getActiveLevel;
    this.onSelection = onSelection;
    this.canSelect = canSelect;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pointerStart = null;
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerCancel = this.handlePointerCancel.bind(this);
    canvas.addEventListener("pointerdown", this.handlePointerDown);
    canvas.addEventListener("pointerup", this.handlePointerUp);
    canvas.addEventListener("pointercancel", this.handlePointerCancel);
  }

  handlePointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    this.pointerStart = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    };
  }

  handlePointerUp(event) {
    const end = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    const start = this.pointerStart;
    this.pointerStart = null;
    if (!this.canSelect() || !isClickGesture(start, end)) return;

    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const selected = selectNearestMetadata(
      this.raycaster.intersectObjects(this.roots, true),
      this.getActiveLevel(),
      (object) => this.findMetadata(object),
    );
    this.onSelection(selected);
  }

  handlePointerCancel() {
    this.pointerStart = null;
  }

  findMetadata(object) {
    for (let node = object; node; node = node.parent) {
      if (node.userData?.kind) return node.userData;
    }
    return null;
  }

  dispose() {
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointercancel", this.handlePointerCancel);
  }
}