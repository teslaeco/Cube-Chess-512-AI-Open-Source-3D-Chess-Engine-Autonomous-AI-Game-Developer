import * as THREE from "three";

export class SelectionController {
  constructor(canvas, camera, roots, getActiveLevel, onSelection) {
    this.canvas = canvas;
    this.camera = camera;
    this.roots = roots;
    this.getActiveLevel = getActiveLevel;
    this.onSelection = onSelection;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.handlePointer = this.handlePointer.bind(this);
    canvas.addEventListener("pointerup", this.handlePointer);
  }

  handlePointer(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const activeLevel = this.getActiveLevel();
    const candidates = this.raycaster
      .intersectObjects(this.roots, true)
      .map((candidate) => this.findMetadata(candidate.object))
      .filter(
        (metadata) =>
          metadata &&
          metadata.kind !== "grid" &&
          (metadata.kind === "piece"
            ? metadata.piece.position.z === activeLevel
            : metadata.square.z === activeLevel),
      );

    const selected =
      candidates.find((metadata) => metadata.kind === "piece") ??
      candidates.find((metadata) => metadata.kind === "square") ??
      null;
    this.onSelection(selected);
  }

  findMetadata(object) {
    for (let node = object; node; node = node.parent) {
      if (node.userData?.kind) return node.userData;
    }
    return null;
  }

  dispose() {
    this.canvas.removeEventListener("pointerup", this.handlePointer);
  }
}
