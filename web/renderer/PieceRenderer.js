import * as THREE from "three";
import { boardPosition } from "./coordinates.js";

const MOVE_DURATION = 0.58;

function capturedPosition(piece) {
  const index = Number(piece.captureIndex) || 0;
  const side = piece.color === "white" ? -1 : 1;
  return new THREE.Vector3(
    side * 6.1,
    0.28 + Math.floor(index / 8) * 1.05,
    (index % 8 - 3.5) * 0.82,
  );
}

function worldPosition(square) {
  const position = boardPosition(square);
  return new THREE.Vector3(position.x, position.y, position.z);
}

function easeInOut(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

export class PieceRenderer {
  constructor(pieces, factory, onAnimationState = () => {}) {
    this.group = new THREE.Group();
    this.group.name = "Pieces and capture zones";
    this.boardGroup = new THREE.Group();
    this.boardGroup.name = "Active pieces";
    this.capturedGroup = new THREE.Group();
    this.capturedGroup.name = "Captured pieces";
    this.group.add(this.boardGroup, this.capturedGroup);
    this.pieces = new Map();
    this.captured = new Map();
    this.animations = new Map();
    this.factory = factory;
    this.onAnimationState = onAnimationState;
    this.lastMoveSequence = null;
    this.sync(pieces, [], null);
  }

  createObject(piece, parent = this.boardGroup) {
    const object = this.factory.create(piece.type, piece.color);
    object.userData = { kind: "piece", piece };
    parent.add(object);
    return object;
  }

  disposeObject(object) {
    object.removeFromParent();
    object.traverse((child) => {
      child.geometry?.dispose();
      if (child.material && !Array.isArray(child.material)) {
        child.material.dispose?.();
      }
    });
  }

  animateObject(id, object, target, piece, kind = "move") {
    this.animations.set(id, {
      object,
      piece,
      kind,
      from: object.position.clone(),
      to: target.clone(),
      elapsed: 0,
      duration: kind === "capture" ? MOVE_DURATION * 1.2 : MOVE_DURATION,
    });
  }

  sync(pieces, capturedPieces = [], lastMove = null) {
    const wasAnimating = this.animations.size > 0;
    const nextIds = new Set(pieces.map((piece) => piece.id));
    const nextCaptured = new Map(capturedPieces.map((piece) => [piece.id, piece]));

    for (const [id, object] of this.pieces) {
      if (nextIds.has(id)) continue;
      this.pieces.delete(id);
      const capturedPiece = nextCaptured.get(id);
      if (capturedPiece) {
        this.boardGroup.remove(object);
        this.capturedGroup.add(object);
        object.userData = { kind: "captured", piece: capturedPiece };
        object.scale.setScalar(0.82);
        this.addCaptureAura(object, capturedPiece.color);
        this.captured.set(id, object);
        this.animateObject(
          id,
          object,
          capturedPosition(capturedPiece),
          capturedPiece,
          "capture",
        );
      } else {
        this.animations.delete(id);
        this.disposeObject(object);
      }
    }

    for (const piece of pieces) {
      let object = this.pieces.get(piece.id);
      const restored = this.captured.get(piece.id);
      if (!object && restored) {
        this.captured.delete(piece.id);
        restored.removeFromParent();
        this.removeCaptureAura(restored);
        restored.scale.setScalar(1);
        this.boardGroup.add(restored);
        object = restored;
      }
      const existed = Boolean(object);
      if (!object) object = this.createObject(piece);
      this.pieces.set(piece.id, object);
      const target = worldPosition(piece.position);
      const shouldAnimate =
        existed &&
        lastMove?.pieceId === piece.id &&
        lastMove.sequence !== this.lastMoveSequence &&
        !object.position.equals(target);
      if (shouldAnimate) {
        this.animateObject(piece.id, object, target, piece, "move");
      } else if (!this.animations.has(piece.id)) {
        object.position.copy(target);
      }
      object.userData = { kind: "piece", piece };
    }

    for (const [id, object] of this.captured) {
      const capturedPiece = nextCaptured.get(id);
      if (capturedPiece) {
        object.userData = { kind: "captured", piece: capturedPiece };
        if (!this.animations.has(id)) object.position.copy(capturedPosition(capturedPiece));
      } else if (!nextIds.has(id)) {
        this.captured.delete(id);
        this.animations.delete(id);
        this.disposeObject(object);
      }
    }

    for (const capturedPiece of capturedPieces) {
      if (this.captured.has(capturedPiece.id) || this.pieces.has(capturedPiece.id)) {
        continue;
      }
      const object = this.createObject(capturedPiece, this.capturedGroup);
      object.userData = { kind: "captured", piece: capturedPiece };
      object.scale.setScalar(0.82);
      object.position.copy(capturedPosition(capturedPiece));
      this.addCaptureAura(object, capturedPiece.color);
      this.captured.set(capturedPiece.id, object);
    }

    if (lastMove?.sequence != null) this.lastMoveSequence = lastMove.sequence;
    if (!wasAnimating && this.animations.size > 0) this.onAnimationState(true);
  }

  addCaptureAura(object, color) {
    if (object.getObjectByName("capture-aura")) return;
    const aura = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.035, 8, 32),
      new THREE.MeshBasicMaterial({
        color: color === "white" ? 0x8deaff : 0xff8e8e,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      }),
    );
    aura.name = "capture-aura";
    aura.rotation.x = Math.PI / 2;
    aura.position.y = 0.08;
    object.add(aura);
  }

  removeCaptureAura(object) {
    const aura = object.getObjectByName("capture-aura");
    if (!aura) return;
    aura.geometry.dispose();
    aura.material.dispose();
    aura.removeFromParent();
  }

  update(deltaSeconds) {
    if (!this.animations.size) return;
    for (const [id, animation] of this.animations) {
      animation.elapsed += deltaSeconds;
      const raw = Math.min(1, animation.elapsed / animation.duration);
      const progress = easeInOut(raw);
      animation.object.position.lerpVectors(animation.from, animation.to, progress);
      if (animation.piece.type === "knight" && animation.kind === "move") {
        animation.object.position.y += Math.sin(Math.PI * progress) * 0.9;
      }
      if (raw >= 1) {
        animation.object.position.copy(animation.to);
        this.animations.delete(id);
      }
    }
    if (!this.animations.size) this.onAnimationState(false);
  }

  setSelected(pieceId) {
    this.pieces.forEach((object, id) => {
      const selected = id === pieceId;
      object.scale.setScalar(selected ? 1.1 : 1);
      object.traverse((child) => {
        if (!child.material?.emissive) return;
        child.material.emissive.setHex(selected ? 0x0c6b80 : 0x000000);
        child.material.emissiveIntensity = selected ? 0.85 : 0;
      });
    });
  }

  setLevelVisibility(levels) {
    const visible = new Map(
      levels.map((level) => [level.index, level.visible]),
    );
    this.pieces.forEach((object) => {
      object.visible = visible.get(object.userData.piece.position.z) ?? false;
    });
  }

  dispose() {
    this.animations.clear();
    this.group.traverse((child) => {
      child.geometry?.dispose();
      if (child.material && !Array.isArray(child.material)) {
        child.material.dispose?.();
      }
    });
    this.group.clear();
    this.pieces.clear();
    this.captured.clear();
  }
}
