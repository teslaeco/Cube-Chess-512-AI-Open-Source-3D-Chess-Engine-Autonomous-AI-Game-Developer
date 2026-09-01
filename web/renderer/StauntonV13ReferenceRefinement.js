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
    if (!inset && (role?.includes("slit") || role?.includes("recess") || role?.includes("nostril"))) inset = child.material;
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

function enlargeTextureLanguage(group) {
  const touched = new Set();
  group.traverse((child) => {
    if (!child.isMesh) return;
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      if (!material || touched.has(material.uuid)) continue;
      touched.add(material.uuid);
      if (material.map?.repeat) {
        material.map.repeat.set(0.82, 0.82);
        material.map.needsUpdate = true;
      }
      if (material.roughnessMap?.repeat) {
        material.roughnessMap.repeat.set(1.0, 1.0);
        material.roughnessMap.needsUpdate = true;
      }
      if (material.isMeshPhysicalMaterial) {
        material.clearcoat = Math.max(material.clearcoat ?? 0, 0.68);
        material.clearcoatRoughness = Math.min(material.clearcoatRoughness ?? 0.2, 0.18);
      }
    }
  });
}

function refineKnight(group) {
  const { body, trim, inset } = materialsOf(group);
  removeRoles(group, new Set([
    "knight-sculpt", "knight-jaw", "knight-cheek", "knight-eye", "knight-nostril", "knight-ear",
    "knight-mane", "knight-mane-trim", "knight-muzzle-shell", "knight-brow", "knight-mouth",
    "knight-chest-volume", "knight-upper-neck-volume", "knight-skull-volume", "knight-nose-volume",
    "knight-nose-bridge", "knight-cheek-refine", "knight-lip-refine", "knight-brow-trim",
    "knight-mane-ridge-detail",
  ]));

  // Build one smooth horse body from chest through S-neck into the skull.
  const bodySections = [
    { x: -0.14, y: 0.92, rx: 0.19, rz: 0.17 },
    { x: -0.18, y: 1.05, rx: 0.20, rz: 0.175 },
    { x: -0.18, y: 1.18, rx: 0.19, rz: 0.165 },
    { x: -0.16, y: 1.31, rx: 0.175, rz: 0.155 },
    { x: -0.12, y: 1.43, rx: 0.158, rz: 0.145 },
    { x: -0.06, y: 1.54, rx: 0.145, rz: 0.136 },
    { x: 0.02, y: 1.62, rx: 0.138, rz: 0.130 },
    { x: 0.11, y: 1.68, rx: 0.145, rz: 0.126 },
    { x: 0.20, y: 1.69, rx: 0.155, rz: 0.123 },
    { x: 0.29, y: 1.66, rx: 0.148, rz: 0.116 },
    { x: 0.35, y: 1.61, rx: 0.132, rz: 0.108 },
  ];
  group.add(mark(new THREE.Mesh(loft(bodySections, 40), body), "knight-sculpt"));

  // A separate short muzzle prevents the beak-like profile seen in the previous closeup.
  const muzzleSections = [
    { x: 0.30, y: 1.61, rx: 0.122, rz: 0.104 },
    { x: 0.39, y: 1.56, rx: 0.112, rz: 0.094 },
    { x: 0.47, y: 1.51, rx: 0.096, rz: 0.084 },
    { x: 0.535, y: 1.48, rx: 0.070, rz: 0.070 },
    { x: 0.575, y: 1.47, rx: 0.042, rz: 0.055 },
  ];
  group.add(mark(new THREE.Mesh(loft(muzzleSections, 32), body), "knight-muzzle-refined"));

  const jawSections = [
    { x: 0.31, y: 1.56, rx: 0.098, rz: 0.090 },
    { x: 0.40, y: 1.51, rx: 0.094, rz: 0.082 },
    { x: 0.49, y: 1.47, rx: 0.073, rz: 0.070 },
    { x: 0.55, y: 1.455, rx: 0.040, rz: 0.050 },
  ];
  group.add(mark(new THREE.Mesh(loft(jawSections, 28), body), "knight-jaw"));

  // Rounded cheek planes and correctly sized eyes.
  for (const side of [-1, 1]) {
    const cheek = mark(new THREE.Mesh(new THREE.SphereGeometry(0.074, 20, 14), body), "knight-cheek");
    cheek.position.set(0.235, 1.63, side * 0.090);
    cheek.scale.set(1.18, 0.78, 0.55);
    group.add(cheek);

    const eye = mark(new THREE.Mesh(new THREE.SphereGeometry(0.020, 16, 10), inset), "knight-eye");
    eye.position.set(0.292, 1.655, side * 0.118);
    group.add(eye);
  }

  const nostril = mark(new THREE.Mesh(new THREE.SphereGeometry(0.017, 14, 8), inset), "knight-nostril");
  nostril.position.set(0.535, 1.49, 0.058);
  nostril.scale.set(1.0, 0.62, 0.42);
  group.add(nostril);

  // Short, slightly backward ears replace the oversized twin spikes.
  const earGeo = new THREE.ConeGeometry(0.036, 0.16, 8, 1);
  for (const side of [-1, 1]) {
    const ear = mark(new THREE.Mesh(earGeo, body), "knight-ear");
    ear.position.set(0.095, 1.80, side * 0.066);
    ear.rotation.z = 0.10;
    ear.rotation.x = side * 0.10;
    ear.scale.z = 0.72;
    group.add(ear);
  }

  // One continuous mane tube plus carved ridges creates the reference's horse-mane language
  // without returning to the old cyan slab.
  const maneCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.205, 1.00, 0),
    new THREE.Vector3(-0.215, 1.13, 0),
    new THREE.Vector3(-0.198, 1.27, 0),
    new THREE.Vector3(-0.168, 1.40, 0),
    new THREE.Vector3(-0.125, 1.52, 0),
    new THREE.Vector3(-0.075, 1.63, 0),
    new THREE.Vector3(-0.020, 1.72, 0),
    new THREE.Vector3(0.035, 1.77, 0),
  ]);
  const mane = mark(new THREE.Mesh(new THREE.TubeGeometry(maneCurve, 36, 0.024, 7, false), body), "knight-mane");
  mane.scale.z = 0.72;
  group.add(mane);

  const crest = mark(new THREE.Mesh(new THREE.TubeGeometry(maneCurve, 36, 0.007, 5, false), trim), "knight-mane-trim");
  crest.position.z = 0.018;
  group.add(crest);

  const ridgeGeo = new THREE.ConeGeometry(0.030, 0.095, 5, 1);
  const ridges = [
    [-0.198, 1.12, -0.10],
    [-0.184, 1.25, -0.05],
    [-0.154, 1.38, 0.00],
    [-0.118, 1.50, 0.05],
    [-0.075, 1.61, 0.10],
    [-0.030, 1.70, 0.14],
  ];
  for (const [x, y, rz] of ridges) {
    const ridge = mark(new THREE.Mesh(ridgeGeo, body), "knight-mane-ridge-detail");
    ridge.position.set(x, y, 0);
    ridge.rotation.z = rz;
    ridge.scale.z = 0.72;
    group.add(ridge);
  }

  const mouth = mark(new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.009, 0.014), inset), "knight-mouth");
  mouth.position.set(0.505, 1.455, 0.058);
  mouth.rotation.z = -0.10;
  group.add(mouth);

  const brow = mark(new THREE.Mesh(new THREE.TorusGeometry(0.050, 0.007, 6, 18, Math.PI * 0.78), trim), "knight-brow-trim");
  brow.position.set(0.278, 1.67, 0.105);
  brow.rotation.z = -0.36;
  group.add(brow);
}

function refineBishop(group) {
  const { body, trim, inset } = materialsOf(group);
  removeRoles(group, new Set(["bishop-mitre-left", "bishop-mitre-right", "bishop-slit", "bishop-gem"]));

  const lobeGeo = new THREE.SphereGeometry(0.145, 28, 20);
  const left = mark(new THREE.Mesh(lobeGeo, body), "bishop-mitre-left");
  left.position.set(-0.047, 1.58, 0);
  left.scale.set(0.78, 1.62, 0.88);
  left.rotation.z = -0.16;
  group.add(left);

  const right = mark(new THREE.Mesh(lobeGeo, body), "bishop-mitre-right");
  right.position.set(0.047, 1.58, 0);
  right.scale.set(0.78, 1.62, 0.88);
  right.rotation.z = 0.16;
  group.add(right);

  const tip = mark(new THREE.Mesh(new THREE.ConeGeometry(0.072, 0.20, 24, 2), body), "bishop-mitre-tip");
  tip.position.set(0, 1.815, 0);
  group.add(tip);

  const slit = mark(new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.31, 0.16, 1, 7, 1), inset), "bishop-slit");
  slit.position.set(0.012, 1.63, 0.104);
  slit.rotation.z = -0.60;
  group.add(slit);

  const gem = mark(new THREE.Mesh(new THREE.OctahedronGeometry(0.040, 1), trim), "bishop-gem");
  gem.position.set(0, 1.61, 0.145);
  gem.scale.set(0.72, 1.30, 0.55);
  group.add(gem);
}

function refineRook(group) {
  const { body, trim } = materialsOf(group);
  const buttressGeo = new THREE.BoxGeometry(0.052, 0.21, 0.035, 2, 4, 1);
  for (let i = 0; i < 8; i += 1) {
    const a = i * Math.PI / 4;
    const buttress = mark(new THREE.Mesh(buttressGeo, body), "rook-crown-buttress");
    buttress.position.set(Math.cos(a) * 0.267, 1.27, Math.sin(a) * 0.267);
    buttress.rotation.y = -a;
    group.add(buttress);
  }
  const jewelBand = mark(new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.010, 10, 56), trim), "rook-jewel-band");
  jewelBand.position.y = 1.23;
  jewelBand.rotation.x = Math.PI / 2;
  group.add(jewelBand);
}

function refineQueen(group) {
  const { body, trim } = materialsOf(group);
  removeRoles(group, new Set(["queen-crown-point", "queen-gem", "queen-center-gem"]));

  const bowl = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.255, 0.12, 32, 2), body), "queen-crown-bowl");
  bowl.position.y = 1.48;
  group.add(bowl);

  const prongGeo = new THREE.ConeGeometry(0.060, 0.30, 12, 2);
  const gemGeo = new THREE.OctahedronGeometry(0.038, 1);
  for (let i = 0; i < 8; i += 1) {
    const a = i * Math.PI / 4;
    const prong = mark(new THREE.Mesh(prongGeo, body), "queen-crown-point");
    prong.position.set(Math.cos(a) * 0.205, 1.61, Math.sin(a) * 0.205);
    prong.rotation.z = Math.sin(a) * 0.18;
    prong.rotation.x = -Math.cos(a) * 0.18;
    group.add(prong);

    const gem = mark(new THREE.Mesh(gemGeo, trim), "queen-gem");
    gem.position.set(Math.cos(a) * 0.222, 1.79, Math.sin(a) * 0.222);
    gem.scale.set(0.82, 1.25, 0.82);
    group.add(gem);
  }

  const center = mark(new THREE.Mesh(new THREE.OctahedronGeometry(0.060, 1), trim), "queen-center-gem");
  center.position.set(0, 1.57, 0.225);
  center.scale.set(0.78, 1.30, 0.62);
  group.add(center);
}

function refineKing(group) {
  const { body, trim } = materialsOf(group);
  const cap = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.215, 0.11, 28, 2), body), "king-crown-cap-refine");
  cap.position.y = 1.57;
  group.add(cap);

  const vertical = mark(new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.26, 0.024), trim), "king-cross-trim-v");
  vertical.position.set(0, 1.93, 0.040);
  group.add(vertical);
  const horizontal = mark(new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.032, 0.024), trim), "king-cross-trim-h");
  horizontal.position.set(0, 1.97, 0.040);
  group.add(horizontal);

  const jewel = mark(new THREE.Mesh(new THREE.OctahedronGeometry(0.040, 1), trim), "king-crown-gem-refine");
  jewel.position.set(0, 1.56, 0.18);
  jewel.scale.set(0.76, 1.28, 0.58);
  group.add(jewel);
}

export function refineReferenceStyleV13(group, type) {
  enlargeTextureLanguage(group);
  if (type === "knight") refineKnight(group);
  if (type === "bishop") refineBishop(group);
  if (type === "rook") refineRook(group);
  if (type === "queen") refineQueen(group);
  if (type === "king") refineKing(group);
  return group;
}
