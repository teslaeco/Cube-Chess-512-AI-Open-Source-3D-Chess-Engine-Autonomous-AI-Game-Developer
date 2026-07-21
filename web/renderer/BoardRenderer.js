import * as THREE from "three";
import {
  CELL_RENDER_SIZE,
  boardPosition,
} from "./coordinates.js";
import { visibleLayerOpacity } from "./layerVisibility.js";

const LIGHT_CELL_COLOR = 0xd8c29d;
const DARK_CELL_COLOR = 0x52677b;
const EDGE_COLOR = 0x18202a;
const HIGHLIGHT_COLOR = 0x43d9ff;

export class BoardRenderer {
  constructor(squares) {
    this.group = new THREE.Group();
    this.group.name = "Cube Chess 512 board";
    this.squares = new Map();
    this.overlays = new Map();
    this.levelGroups = new Map();
    this.levelMaterials = new Map();
    this.levelEdgeMaterials = new Map();

    const cellGeometry = new THREE.BoxGeometry(
      CELL_RENDER_SIZE,
      CELL_RENDER_SIZE,
      CELL_RENDER_SIZE,
    );
    const edgeGeometry = new THREE.EdgesGeometry(cellGeometry);
    const overlayGeometry = new THREE.BoxGeometry(
      CELL_RENDER_SIZE * 0.88,
      CELL_RENDER_SIZE * 0.88,
      CELL_RENDER_SIZE * 0.88,
    );

    this.sharedResources = [cellGeometry, edgeGeometry, overlayGeometry];

    for (const square of squares) {
      this.ensureLevel(square.z, square.level);

      const level = this.levelGroups.get(square.z);
      const materials = this.levelMaterials.get(square.z);
      const edgeMaterial = this.levelEdgeMaterials.get(square.z);
      const position = boardPosition(square);

      const cell = new THREE.Mesh(
        cellGeometry,
        (square.x + square.y + square.z) % 2 === 0
          ? materials[0]
          : materials[1],
      );
      cell.position.set(position.x, position.y, position.z);
      cell.receiveShadow = true;
      cell.userData = { kind: "square", square };
      level.add(cell);
      this.squares.set(square.square3D, cell);

      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      edges.position.copy(cell.position);
      edges.userData = { kind: "square", square };
      level.add(edges);

      const overlay = new THREE.Mesh(
        overlayGeometry,
        new THREE.MeshBasicMaterial({
          color: HIGHLIGHT_COLOR,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      overlay.position.copy(cell.position);
      overlay.userData = { kind: "square", square };
      level.add(overlay);
      this.overlays.set(square.square3D, overlay);
      this.sharedResources.push(overlay.material);
    }
  }

  ensureLevel(levelIndex, levelName) {
    if (this.levelGroups.has(levelIndex)) {
      return;
    }

    const group = new THREE.Group();
    group.name = `Level ${levelName}`;
    this.group.add(group);
    this.levelGroups.set(levelIndex, group);

    const materials = [
      new THREE.MeshStandardMaterial({
        color: LIGHT_CELL_COLOR,
        roughness: 0.78,
        metalness: 0.04,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      }),
      new THREE.MeshStandardMaterial({
        color: DARK_CELL_COLOR,
        roughness: 0.8,
        metalness: 0.04,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      }),
    ];
    this.levelMaterials.set(levelIndex, materials);
    this.sharedResources.push(...materials);

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: EDGE_COLOR,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    this.levelEdgeMaterials.set(levelIndex, edgeMaterial);
    this.sharedResources.push(edgeMaterial);
  }

  setLevels(levels, activeLevel) {
    for (const level of levels) {
      const group = this.levelGroups.get(level.index);
      if (!group) {
        continue;
      }

      group.visible = level.visible;
      const opacity = visibleLayerOpacity(level.index, activeLevel);
      const isActive = level.index === activeLevel;

      for (const material of this.levelMaterials.get(level.index)) {
        material.opacity = opacity;
        material.depthWrite = isActive;
        material.depthTest = true;
      }

      const edgeMaterial = this.levelEdgeMaterials.get(level.index);
      edgeMaterial.opacity = isActive
        ? Math.min(1, opacity + 0.18)
        : Math.max(0.08, opacity * 0.72);
      edgeMaterial.depthWrite = false;
      edgeMaterial.depthTest = true;

      group.renderOrder = isActive ? 20 : level.index;
    }
  }

  setHighlighted(square3D) {
    this.overlays.forEach((overlay, key) => {
      overlay.material.opacity = key === square3D ? 0.42 : 0;
      overlay.visible = key === square3D;
    });
  }

  dispose() {
    this.sharedResources.forEach((resource) => resource.dispose());
    this.group.clear();
    this.squares.clear();
    this.overlays.clear();
    this.levelGroups.clear();
    this.levelMaterials.clear();
    this.levelEdgeMaterials.clear();
  }
}
