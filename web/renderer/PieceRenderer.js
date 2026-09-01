import * as THREE from "three";
import { boardPosition } from "./coordinates.js";

const MOVE_DURATION = 0.58;
const BLUE_HIGHLIGHT = 0x2f7dff;

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

export function requiresPieceObjectReplacement(object, piece) {
  const renderedPiece = object?.userData?.piece;
  return Boolean(
    object &&
    renderedPiece &&
    (renderedPiece.type !== piece.type || renderedPiece.color !== piece.color),
  );
}

export function disposeOwnedPieceResources(object) {
  const geometries = new Set();
  const materials = new Set();
  object?.traverse?.((child) => {
    if (
      child.geometry &&
      !child.geometry.userData?.forgeSharedPieceGeometry &&
      !child.geometry.userData?.compactChessModel
    ) {
      geometries.add(child.geometry);
    }
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of childMaterials) {
      if (material && !material.userData?.forgeSharedPieceMaterial) materials.add(material);
    }
  });
  for (const geometry of geometries) geometry.dispose?.();
  for (const material of materials) material.dispose?.();
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
    this.selectedPieceId = null;
    this.sync(pieces, [], null);
  }

  createObject(piece, parent = this.boardGroup) {
    const object = this.factory.create(piece.type, piece.color);
    object.userData = { ...object.userData, kind: "piece", piece };
    parent.add(object);
    return object;
  }

  disposeObject(object) {
    object.removeFromParent();
    disposeOwnedPieceResources(object);
  }

  replaceObjectForPiece(id, object, piece, parent = this.boardGroup) {
    const position = object.position.clone();
    const scale = object.scale.clone();
    const wasSelected = id === this.selectedPieceId;
    this.animations.delete(id);
    this.disposeObject(object);
    const replacement = this.createObject(piece, parent);
    replacement.position.copy(position);
    replacement.scale.copy(scale);
    if (wasSelected) {
      replacement.scale.setScalar(1.1);
      this.setBlueHighlight(replacement, true, 0.95);
    }
    return replacement;
  }

  setBlueHighlight(object, enabled, intensity = 0.95) {
    object.traverse((child) => {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!material?.emissive) continue;
        const baseHex = material.userData?.forgeBaseEmissiveHex ?? 0x000000;
        const baseIntensity = material.userData?.forgeBaseEmissiveIntensity ?? 0;
        material.emissive.setHex(enabled ? BLUE_HIGHLIGHT : baseHex);
        material.emissiveIntensity = enabled ? intensity : baseIntensity;
      }
    });
  }

  addMoveAura(object) {
    if (object.getObjectByName("move-aura")) return;
    const aura = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.045, 10, 40),
      new THREE.MeshBasicMaterial({
        color: BLUE_HIGHLIGHT,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
      }),
    );
    aura.name = "move-aura";
    aura.rotation.x = Math.PI / 2;
    aura.position.y = 0.09;
    object.add(aura);
  }

  removeMoveAura(object) {
    const aura = object.getObjectByName("move-aura");
    if (!aura) return;
    aura.geometry.dispose();
    aura.material.dispose();
    aura.removeFromParent();
  }

  animateObject(id, object, target, piece, kind = "move") {
    if (kind === "move") {
      this.addMoveAura(object);
      this.setBlueHighlight(object, true, 1.15);
    }
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
        object.userData = { ...object.userData, kind: "captured", piece: capturedPiece };
        object.scale.setScalar(0.82);
        this.removeMoveAura(object);
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

      if (requiresPieceObjectReplacement(object, piece)) {
        object = this.replaceObjectForPiece(piece.id, object, piece);
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
      object.userData = { ...object.userData, kind: "piece", piece };
    }

    for (const [id, object] of this.captured) {
      const capturedPiece = nextCaptured.get(id);
      if (capturedPiece) {
        let currentObject = object;
        if (requiresPieceObjectReplacement(currentObject, capturedPiece)) {
          currentObject = this.replaceObjectForPiece(
            id,
            currentObject,
            capturedPiece,
            this.capturedGroup,
          );
          currentObject.scale.setScalar(0.82);
          this.addCaptureAura(currentObject, capturedPiece.color);
          this.captured.set(id, currentObject);
        }
        currentObject.userData = { ...currentObject.userData, kind: "captured", piece: capturedPiece };
        if (!this.animations.has(id)) {
          currentObject.position.copy(capturedPosition(capturedPiece));
        }
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
      object.userData = { ...object.userData, kind: "captured", piece: capturedPiece };
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
      const moveAura = animation.object.getObjectByName("move-aura");
      if (moveAura) {
        moveAura.rotation.z += deltaSeconds * 2.4;
        moveAura.material.opacity = 0.62 + Math.sin(progress * Math.PI) * 0.3;
      }
      if (animation.piece.type === "knight" && animation.kind === "move") {
        animation.object.position.y += Math.sin(Math.PI * progress) * 0.9;
      }
      if (raw >= 1) {
        animation.object.position.copy(animation.to);
        this.animations.delete(id);
        if (animation.kind === "move") {
          this.removeMoveAura(animation.object);
          const remainsSelected = id === this.selectedPieceId;
          this.setBlueHighlight(animation.object, remainsSelected, 0.95);
          animation.object.scale.setScalar(remainsSelected ? 1.1 : 1);
        }
      }
    }
    if (!this.animations.size) this.onAnimationState(false);
  }

  setSelected(pieceId) {
    this.selectedPieceId = pieceId ?? null;
    this.pieces.forEach((object, id) => {
      const selected = id === this.selectedPieceId;
      const moving = this.animations.has(id);
      object.scale.setScalar(selected ? 1.1 : 1);
      this.setBlueHighlight(object, selected || moving, moving ? 1.15 : 0.95);
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
    disposeOwnedPieceResources(this.group);
    this.group.clear();
    this.pieces.clear();
    this.captured.clear();
  }
}
