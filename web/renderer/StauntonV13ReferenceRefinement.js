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

  // Verified closeups showed a thin seahorse-like neck. Add compact overlapping
  // anatomical masses so the silhouette reads as a real chess knight at a glance.
  const chest = mark(new THREE.Mesh(new THREE.SphereGeometry(0.145, 22, 16), body), "knight-chest-volume");
  chest.position.set(-0.135, 1.155, 0);
  chest.scale.set(0.92, 1.42, 0.96);
  group.add(chest);

  const upperNeck = mark(new THREE.Mesh(new THREE.SphereGeometry(0.126, 22, 16), body), "knight-upper-neck-volume");
  upperNeck.position.set(-0.045, 1.42, 0);
  upperNeck.scale.set(0.86, 1.45, 0.92);
  upperNeck.rotation.z = -0.18;
  group.add(upperNeck);

  const skull = mark(new THREE.Mesh(new THREE.SphereGeometry(0.125, 24, 18), body), "knight-skull-volume");
  skull.position.set(0.255, 1.625, 0);
  skull.scale.set(1.12, 0.82, 0.92);
  group.add(skull);

  const nose = mark(new THREE.Mesh(new THREE.SphereGeometry(0.090, 22, 16), body), "knight-nose-volume");
  nose.position.set(0.505, 1.465, 0);
  nose.scale.set(1.38, 0.66, 0.78);
  nose.rotation.z = -0.13;
  group.add(nose);

  const noseBridge = mark(new THREE.Mesh(new THREE.CapsuleGeometry(0.047, 0.15, 5, 10), body), "knight-nose-bridge");
  noseBridge.position.set(0.395, 1.535, 0);
  noseBridge.rotation.z = -0.93;
  group.add(noseBridge);

  // Give the rear mane carved ridges like the supplied reference instead of a
  // single plastic fin. These sit on top of the existing continuous mane curve.
  const ridgeGeo = new THREE.ConeGeometry(0.034, 0.115, 5, 1);
  const ridges = [
    [-0.208, 1.11, -0.10],
    [-0.192, 1.26, -0.05],
    [-0.152, 1.41, 0.02],
    [-0.105, 1.55, 0.08],
    [-0.055, 1.68, 0.14],
  ];
  for (const [x, y, rz] of ridges) {
    const ridge = mark(new THREE.Mesh(ridgeGeo, body), "knight-mane-ridge-detail");
    ridge.position.set(x, y, 0);
    ridge.rotation.z = rz;
    ridge.scale.z = 0.78;
    group.add(ridge);
  }

  // Small cheek and jaw accents give the head readable facial planes.
  for (const side of [-1, 1]) {
    const cheek = mark(new THREE.Mesh(new THREE.SphereGeometry(0.052, 18, 12), body), "knight-cheek-refine");
    cheek.position.set(0.285, 1.59, side * 0.092);
    cheek.scale.set(1.15, 0.82, 0.50);
    group.add(cheek);
  }
  const lip = mark(new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.010, 0.014), inset), "knight-lip-refine");
  lip.position.set(0.522, 1.425, 0.067);
  lip.rotation.z = -0.12;
  group.add(lip);

  const browTrim = mark(new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.008, 6, 20, Math.PI * 0.8), trim), "knight-brow-trim");
  browTrim.position.set(0.275, 1.645, 0.102);
  browTrim.rotation.z = -0.42;
  group.add(browTrim);
}

function refineBishop(group) {
  const { body, trim, inset } = materialsOf(group);
  removeRoles(group, new Set(["bishop-mitre-left", "bishop-mitre-right", "bishop-slit", "bishop-gem"]));

  // Rebuild the head as two rounded teardrop lobes. The previous closeup read
  // like two square prongs; these overlapping ellipsoids restore the classical mitre.
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
  // Add restrained buttresses beneath the battlements, matching the reference
  // tower language without changing the required eight crenellations.
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
