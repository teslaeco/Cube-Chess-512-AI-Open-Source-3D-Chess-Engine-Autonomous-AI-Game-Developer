import * as THREE from "three";
import { CELL_SIZE, boardPosition } from "./coordinates.js";
import { visibleLayerOpacity } from "./layerVisibility.js";

const LIGHT_COLOR = 0xd9d9d9;
const DARK_COLOR = 0x222a34;
const GRID_COLOR = 0x111820;
const SELECTED_COLOR = 0x2f7dff;
const LEGAL_MOVE_COLOR = 0x145a32;
const CAPTURE_COLOR = 0xff6b6b;
const BOARD_THICKNESS = 0.045;

export class BoardRenderer {
  constructor(squares) {
    this.group = new THREE.Group();
    this.group.name = "Cube Chess 512 board";
    this.squares = new Map();
    this.overlays = new Map();
    this.levelGroups = new Map();
    this.levelMaterials = new Map();
    this.movePaths = new THREE.Group();
    this.movePaths.name = "Cross-level move paths";
    this.group.add(this.movePaths);
    this.resources = [];

    const squareGeometry = new THREE.BoxGeometry(
      CELL_SIZE * 0.96,
      BOARD_THICKNESS,
      CELL_SIZE * 0.96,
    );
    const overlayGeometry = new THREE.PlaneGeometry(
      CELL_SIZE * 0.82,
      CELL_SIZE * 0.82,
    );
    const wireGeometry = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE),
    );
    const wireMaterial = new THREE.LineBasicMaterial({
      color: GRID_COLOR,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    this.pathMaterial = new THREE.LineDashedMaterial({
      color: LEGAL_MOVE_COLOR,
      transparent: true,
      opacity: 0.9,
      dashSize: 0.2,
      gapSize: 0.12,
      depthWrite: false,
    });
    this.resources.push(
      squareGeometry,
      overlayGeometry,
      wireGeometry,
      wireMaterial,
      this.pathMaterial,
    );

    for (const square of squares) {
      this.ensureLevel(square.z, square.level);
      const group = this.levelGroups.get(square.z);
      const materials = this.levelMaterials.get(square.z);
      const position = boardPosition(square);

      const tile = new THREE.Mesh(
        squareGeometry,
        (square.x + square.y) % 2 === 0 ? materials[0] : materials[1],
      );
      tile.position.set(position.x, position.y, position.z);
      tile.receiveShadow = true;
      tile.userData = { kind: "square", square };
      group.add(tile);
      this.squares.set(square.square3D, tile);

      const wire = new THREE.LineSegments(wireGeometry, wireMaterial);
      wire.position.set(position.x, position.y + CELL_SIZE / 2, position.z);
      wire.userData = { kind: "grid", square };
      this.group.add(wire);

      const overlayMaterial = new THREE.MeshBasicMaterial({
        color: SELECTED_COLOR,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
      overlay.rotation.x = -Math.PI / 2;
      overlay.position.set(position.x, position.y + 0.04, position.z);
      overlay.userData = { kind: "square", square };
      group.add(overlay);
      this.overlays.set(square.square3D, overlay);
      this.resources.push(overlayMaterial);
    }
  }

  ensureLevel(index, name) {
    if (this.levelGroups.has(index)) return;
    const group = new THREE.Group();
    group.name = `Level ${name}`;
    this.group.add(group);
    this.levelGroups.set(index, group);

    const materials = [LIGHT_COLOR, DARK_COLOR].map(
      (color) =>
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.82,
          transparent: true,
          opacity: 0.15,
          depthWrite: false,
        }),
    );
    this.levelMaterials.set(index, materials);
    this.resources.push(...materials);
  }

  setLevels(levels, activeLevel) {
    for (const level of levels) {
      const group = this.levelGroups.get(level.index);
      group.visible = level.visible;
      const active = level.index === activeLevel;
      const opacity = active
        ? 0.62
        : Math.min(0.22, visibleLayerOpacity(level.index, activeLevel));
      for (const material of this.levelMaterials.get(level.index)) {
        material.opacity = opacity;
        material.depthWrite = false;
      }
      group.renderOrder = active ? 10 : level.index;
    }
  }

  setHighlights(selectedSquare, legalTargets = []) {
    const targets = new Map(legalTargets.map((target) => [target.square3D, target]));
    const selectedKey = selectedSquare?.square3D ?? selectedSquare;
    this.overlays.forEach((overlay, key) => {
      const target = targets.get(key);
      const selected = key === selectedKey;
      overlay.visible = selected || Boolean(target);
      overlay.material.opacity = selected ? 0.62 : target ? 0.56 : 0;
      overlay.material.color.setHex(
        selected
          ? SELECTED_COLOR
          : target?.kind === "capture"
            ? CAPTURE_COLOR
            : LEGAL_MOVE_COLOR,
      );
    });

    this.movePaths.children.forEach((line) => line.geometry.dispose());
    this.movePaths.clear();
    for (const target of legalTargets.filter((move) => move.to.z !== move.from.z)) {
      const from = boardPosition(target.from);
      const to = boardPosition(target.to);
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(from.x, from.y + 0.16, from.z),
        new THREE.Vector3(to.x, to.y + 0.16, to.z),
      ]);
      const line = new THREE.Line(geometry, this.pathMaterial);
      line.computeLineDistances();
      line.renderOrder = 20;
      line.userData = { kind: "grid" };
      this.movePaths.add(line);
    }
  }

  dispose() {
    this.movePaths.children.forEach((line) => line.geometry.dispose());
    this.resources.forEach((resource) => resource.dispose());
    this.group.clear();
    this.squares.clear();
    this.overlays.clear();
    this.levelGroups.clear();
    this.levelMaterials.clear();
    this.movePaths.clear();
  }
}
