import * as THREE from "three";

function mesh(geometry, material, y, scale = 1) { const item = new THREE.Mesh(geometry, material); item.position.y = y; item.scale.setScalar(scale); item.castShadow = true; item.receiveShadow = true; return item; }
export class PieceGeometryFactory {
  constructor() { this.materials = { white: new THREE.MeshStandardMaterial({ color: 0xf7eee0, metalness: 0.16, roughness: 0.31, opacity: 1, transparent: false }), black: new THREE.MeshStandardMaterial({ color: 0x1d2732, metalness: 0.35, roughness: 0.27, opacity: 1, transparent: false }) }; }
  create(type, color) {
    const group = new THREE.Group(); const material = this.materials[color];
    group.add(mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.16, 32), material, 0.08));
    group.add(mesh(new THREE.CylinderGeometry(0.29, 0.36, 0.14, 32), material, 0.21));
    if (type === "pawn") { group.add(mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.43, 24), material, 0.48)); group.add(mesh(new THREE.SphereGeometry(0.24, 24, 16), material, 0.83)); }
    if (type === "rook") { group.add(mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.55, 24), material, 0.55)); group.add(mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.22, 24), material, 0.9)); group.add(mesh(new THREE.BoxGeometry(0.52, 0.13, 0.52), material, 1.05)); }
    if (type === "knight") { group.add(mesh(new THREE.CylinderGeometry(0.23, 0.3, 0.42, 24), material, 0.49)); const head = mesh(new THREE.ConeGeometry(0.28, 0.68, 4), material, 0.94); head.rotation.z = -0.35; group.add(head); }
    if (type === "bishop") { group.add(mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.54, 24), material, 0.55)); group.add(mesh(new THREE.SphereGeometry(0.29, 24, 16), material, 0.98)); const cut = mesh(new THREE.BoxGeometry(0.08, 0.42, 0.36), material, 1.0); cut.rotation.z = 0.6; group.add(cut); }
    if (type === "queen") { group.add(mesh(new THREE.CylinderGeometry(0.2, 0.32, 0.63, 24), material, 0.59)); group.add(mesh(new THREE.TorusGeometry(0.24, 0.07, 12, 24), material, 1.0)); group.add(mesh(new THREE.SphereGeometry(0.18, 20, 14), material, 1.2)); }
    if (type === "king") { group.add(mesh(new THREE.CylinderGeometry(0.2, 0.32, 0.7, 24), material, 0.63)); group.add(mesh(new THREE.SphereGeometry(0.2, 20, 14), material, 1.12)); group.add(mesh(new THREE.BoxGeometry(0.1, 0.42, 0.1), material, 1.37)); group.add(mesh(new THREE.BoxGeometry(0.36, 0.1, 0.1), material, 1.5)); }
    return group;
  }
}
