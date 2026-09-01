import * as THREE from "three";

function roleOf(child) {
  return child?.userData?.openSourceStauntonRole ?? child?.userData?.forgePremiumRole ?? null;
}

function mark(object, role) {
  object.castShadow = true;
  object.receiveShadow = true;
  object.userData.openSourceStauntonRole = role;
  object.userData.forgePremiumRole = role;
  return object;
}

function removeRoles(group, roles) {
  const doomed = [];
  group.traverse((child) => {
    if (child !== group && roles.has(roleOf(child))) doomed.push(child);
  });
  for (const child of doomed) child.parent?.remove(child);
}

function materialsOf(group) {
  let body = null;
  let trim = null;
  let inset = null;
  group.traverse((child) => {
    if (!child.isMesh) return;
    const role = roleOf(child);
    if (!body && (role === "base" || role?.endsWith("-stem") || role === "knight-sculpt")) body = child.material;
    if (!trim && (role === "base-trim" || role?.includes("gem") || role === "collar-trim")) trim = child.material;
    if (!inset && (role?.includes("slit") || role?.includes("nostril") || role?.includes("recess"))) inset = child.material;
  });
  return { body, trim: trim ?? body, inset: inset ?? body };
}

function loft(sections, radial = 36) {
  const positions = [];
  const indices = [];
  const uvs = [];
  for (let s = 0; s < sections.length; s += 1) {
    const section = sections[s];
    for (let i = 0; i < radial; i += 1) {
      const a = (i / radial) * Math.PI * 2;
      positions.push(
        (section.x ?? 0) + Math.cos(a) * section.rx,
        section.y,
        (section.z ?? 0) + Math.sin(a) * section.rz,
      );
      uvs.push(i / radial, s / Math.max(1, sections.length - 1));
    }
  }
  for (let s = 0; s < sections.length - 1; s += 1) {
    for (let i = 0; i < radial; i += 1) {
      const n = (i + 1) % radial;
      const a = s * radial + i;
      const b = s * radial + n;
      const c = (s + 1) * radial + n;
      const d = (s + 1) * radial + i;
      indices.push(a, b, d, b, c, d);
    }
  }
  const cap = (sectionIndex, reverse) => {
    const section = sections[sectionIndex];
    const center = positions.length / 3;
    positions.push(section.x ?? 0, section.y, section.z ?? 0);
    uvs.push(0.5, sectionIndex === 0 ? 0 : 1);
    const start = sectionIndex * radial;
    for (let i = 0; i < radial; i += 1) {
      const n = (i + 1) % radial;
      if (reverse) indices.push(center, start + n, start + i);
      else indices.push(center, start + i, start + n);
    }
  };
  cap(0, true);
  cap(sections.length - 1, false);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function fixKnight(group) {
  const { body, trim, inset } = materialsOf(group);
  removeRoles(group, new Set([
    "knight-sculpt", "knight-muzzle-refined", "knight-jaw", "knight-cheek", "knight-eye",
    "knight-nostril", "knight-ear", "knight-mane", "knight-mane-trim", "knight-mouth",
    "knight-brow-trim", "knight-mane-ridge-detail",
  ]));

  // Shorter, fuller Staunton horse: broad chest, curved neck and a compact skull.
  // The previous closeup read as a dragon because the muzzle projected too far and
  // the neck was too thin/vertical. These sections deliberately move mass forward.
  const neck = [
    { x: -0.10, y: 0.92, rx: 0.205, rz: 0.180 },
    { x: -0.13, y: 1.04, rx: 0.215, rz: 0.184 },
    { x: -0.13, y: 1.16, rx: 0.205, rz: 0.178 },
    { x: -0.10, y: 1.28, rx: 0.192, rz: 0.170 },
    { x: -0.04, y: 1.39, rx: 0.178, rz: 0.158 },
    { x: 0.04, y: 1.48, rx: 0.170, rz: 0.150 },
    { x: 0.13, y: 1.55, rx: 0.176, rz: 0.146 },
    { x: 0.21, y: 1.58, rx: 0.184, rz: 0.142 },
    { x: 0.27, y: 1.57, rx: 0.172, rz: 0.136 },
  ];
  group.add(mark(new THREE.Mesh(loft(neck, 40), body), "knight-sculpt"));

  // Compact forehead/skull mass gives a recognisable horse head before the muzzle begins.
  const skull = mark(new THREE.Mesh(new THREE.SphereGeometry(0.145, 30, 22), body), "knight-skull-volume");
  skull.position.set(0.245, 1.575, 0);
  skull.scale.set(1.15, 0.90, 0.92);
  group.add(skull);

  // Broad, blunt muzzle rather than a long pointed beak.
  const muzzle = [
    { x: 0.27, y: 1.53, rx: 0.128, rz: 0.118 },
    { x: 0.34, y: 1.49, rx: 0.128, rz: 0.112 },
    { x: 0.405, y: 1.46, rx: 0.118, rz: 0.106 },
    { x: 0.455, y: 1.445, rx: 0.100, rz: 0.098 },
    { x: 0.485, y: 1.445, rx: 0.082, rz: 0.090 },
  ];
  group.add(mark(new THREE.Mesh(loft(muzzle, 34), body), "knight-muzzle-refined"));

  const jaw = mark(new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 16), body), "knight-jaw");
  jaw.position.set(0.390, 1.405, 0);
  jaw.scale.set(1.25, 0.48, 0.90);
  group.add(jaw);

  for (const side of [-1, 1]) {
    const cheek = mark(new THREE.Mesh(new THREE.SphereGeometry(0.076, 20, 14), body), "knight-cheek");
    cheek.position.set(0.245, 1.56, side * 0.092);
    cheek.scale.set(1.10, 0.82, 0.58);
    group.add(cheek);

    const eye = mark(new THREE.Mesh(new THREE.SphereGeometry(0.019, 14, 10), inset), "knight-eye");
    eye.position.set(0.300, 1.595, side * 0.125);
    group.add(eye);
  }

  for (const side of [-1, 1]) {
    const nostril = mark(new THREE.Mesh(new THREE.SphereGeometry(0.016, 14, 8), inset), "knight-nostril");
    nostril.position.set(0.455, 1.465, side * 0.070);
    nostril.scale.set(0.9, 0.58, 0.48);
    group.add(nostril);
  }

  // Small rounded ears, set apart and leaning slightly backwards.
  const earGeo = new THREE.ConeGeometry(0.032, 0.105, 10, 2);
  for (const side of [-1, 1]) {
    const ear = mark(new THREE.Mesh(earGeo, body), "knight-ear");
    ear.position.set(0.115, 1.725, side * 0.066);
    ear.rotation.z = 0.18;
    ear.rotation.x = side * 0.08;
    group.add(ear);
  }

  // A thicker dark mane establishes the rear silhouette; cyan is only a thin accent.
  const maneCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.195, 1.00, 0),
    new THREE.Vector3(-0.205, 1.13, 0),
    new THREE.Vector3(-0.185, 1.27, 0),
    new THREE.Vector3(-0.145, 1.40, 0),
    new THREE.Vector3(-0.095, 1.51, 0),
    new THREE.Vector3(-0.035, 1.61, 0),
    new THREE.Vector3(0.035, 1.68, 0),
    new THREE.Vector3(0.095, 1.71, 0),
  ]);
  const mane = mark(new THREE.Mesh(new THREE.TubeGeometry(maneCurve, 40, 0.038, 8, false), body), "knight-mane");
  mane.scale.z = 0.78;
  group.add(mane);
  const crest = mark(new THREE.Mesh(new THREE.TubeGeometry(maneCurve, 40, 0.007, 5, false), trim), "knight-mane-trim");
  crest.position.z = 0.026;
  group.add(crest);

  const mouth = mark(new THREE.Mesh(new THREE.BoxGeometry(0.120, 0.010, 0.015), inset), "knight-mouth");
  mouth.position.set(0.430, 1.410, 0.080);
  mouth.rotation.z = -0.05;
  group.add(mouth);
}

function fixBishop(group) {
  const { body, trim, inset } = materialsOf(group);
  removeRoles(group, new Set([
    "bishop-mitre-left", "bishop-mitre-right", "bishop-mitre-tip", "bishop-slit", "bishop-gem",
  ]));

  // Lower overlapping lobes remove the visible gap above the collar and read as one mitre.
  const lobeGeo = new THREE.SphereGeometry(0.148, 28, 20);
  const left = mark(new THREE.Mesh(lobeGeo, body), "bishop-mitre-left");
  left.position.set(-0.038, 1.45, 0);
  left.scale.set(0.82, 1.50, 0.94);
  left.rotation.z = -0.12;
  group.add(left);

  const right = mark(new THREE.Mesh(lobeGeo, body), "bishop-mitre-right");
  right.position.set(0.038, 1.45, 0);
  right.scale.set(0.82, 1.50, 0.94);
  right.rotation.z = 0.12;
  group.add(right);

  const shoulder = mark(new THREE.Mesh(new THREE.SphereGeometry(0.138, 24, 16), body), "bishop-mitre-shoulder");
  shoulder.position.set(0, 1.33, 0);
  shoulder.scale.set(1.0, 0.70, 0.94);
  group.add(shoulder);

  const tip = mark(new THREE.Mesh(new THREE.ConeGeometry(0.060, 0.135, 22, 2), body), "bishop-mitre-tip");
  tip.position.set(0, 1.665, 0);
  group.add(tip);

  const slit = mark(new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.265, 0.175, 1, 7, 1), inset), "bishop-slit");
  slit.position.set(0.008, 1.49, 0.112);
  slit.rotation.z = -0.58;
  group.add(slit);

  const gem = mark(new THREE.Mesh(new THREE.OctahedronGeometry(0.034, 1), trim), "bishop-gem");
  gem.position.set(-0.010, 1.39, 0.150);
  gem.scale.set(0.70, 1.15, 0.52);
  group.add(gem);
}

export function applyAnatomyFixV13(group, type) {
  if (type === "knight") fixKnight(group);
  if (type === "bishop") fixBishop(group);
  return group;
}
