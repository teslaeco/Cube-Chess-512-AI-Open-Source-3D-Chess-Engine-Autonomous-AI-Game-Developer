import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceDirectory = path.resolve(
  process.env.HIGH_DETAIL_CHESS_SOURCE_DIR ?? "../project_sources/meshy-originals",
);
const outputDirectory = path.resolve(
  process.env.HIGH_DETAIL_CHESS_OUTPUT_DIR ?? "public/assets/high-detail-chess-models",
);

const SOURCES = Object.freeze({
  pawn: { includes: "Steel_Pawn", grid: 128 },
  rook: { includes: "Titanium_Rook", grid: 144 },
  knight: { includes: "Faceted_Knight", grid: 160 },
  bishop: { includes: "Gunmetal_Bishop", grid: 144 },
  queen: { includes: "Obsidian_King", grid: 144 },
  king: { includes: "Steel_King", grid: 144 },
});

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BINARY_CHUNK = 0x004e4942;
const CCM_HEADER_BYTES = 36;

function parseGlb(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== GLB_MAGIC || view.getUint32(4, true) !== 2) {
    throw new Error("Expected a binary glTF 2.0 source");
  }
  if (view.getUint32(8, true) !== bytes.byteLength) {
    throw new Error("GLB declared length does not match the file length");
  }

  let json;
  let binary;
  for (let offset = 12; offset < bytes.byteLength;) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    const end = start + length;
    if (end > bytes.byteLength) throw new Error("GLB chunk exceeds the source file");
    if (type === JSON_CHUNK) {
      json = JSON.parse(new TextDecoder().decode(bytes.subarray(start, end)).replace(/\u0000+$/u, ""));
    } else if (type === BINARY_CHUNK) {
      binary = bytes.subarray(start, end);
    }
    offset = end;
  }
  if (!json || !binary) throw new Error("GLB must contain JSON and binary chunks");

  const primitive = json.meshes?.[0]?.primitives?.[0];
  const positionAccessor = json.accessors?.[primitive?.attributes?.POSITION];
  const indexAccessor = json.accessors?.[primitive?.indices];
  if (!primitive || (primitive.mode ?? 4) !== 4) throw new Error("Only triangle primitives are supported");
  if (positionAccessor?.componentType !== 5126 || positionAccessor?.type !== "VEC3") {
    throw new Error("Expected FLOAT VEC3 positions");
  }
  if (![5123, 5125].includes(indexAccessor?.componentType) || indexAccessor?.type !== "SCALAR") {
    throw new Error("Expected unsigned triangle indices");
  }

  function accessorByteOffset(accessor) {
    const bufferView = json.bufferViews?.[accessor.bufferView];
    if (!bufferView || bufferView.buffer !== 0) throw new Error("Expected one embedded GLB buffer");
    return (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  }

  const positionOffset = accessorByteOffset(positionAccessor);
  const positionView = new Float32Array(
    binary.buffer,
    binary.byteOffset + positionOffset,
    positionAccessor.count * 3,
  );
  const indexOffset = accessorByteOffset(indexAccessor);
  const IndexArray = indexAccessor.componentType === 5125 ? Uint32Array : Uint16Array;
  const indexView = new IndexArray(
    binary.buffer,
    binary.byteOffset + indexOffset,
    indexAccessor.count,
  );
  if (indexView.length % 3 !== 0) throw new Error("Triangle index count is not divisible by three");
  return { positions: positionView, indices: indexView };
}

function boundsOf(positions) {
  const minimum = [Infinity, Infinity, Infinity];
  const maximum = [-Infinity, -Infinity, -Infinity];
  for (let offset = 0; offset < positions.length; offset += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = positions[offset + axis];
      if (!Number.isFinite(value)) throw new Error("Source contains a non-finite position");
      minimum[axis] = Math.min(minimum[axis], value);
      maximum[axis] = Math.max(maximum[axis], value);
    }
  }
  if (minimum.some((value, axis) => maximum[axis] <= value)) throw new Error("Source bounds are empty");
  return { minimum, maximum };
}

function clusterGeometry(source, resolution) {
  const { minimum, maximum } = boundsOf(source.positions);
  const range = minimum.map((value, axis) => maximum[axis] - value);
  const sourceVertexCount = source.positions.length / 3;
  const sourceToCluster = new Uint32Array(sourceVertexCount);
  const clusterByCell = new Map();
  const clusters = [];

  for (let vertex = 0; vertex < sourceVertexCount; vertex += 1) {
    const offset = vertex * 3;
    const cell = [0, 1, 2].map((axis) => Math.min(
      resolution - 1,
      Math.max(0, Math.round(((source.positions[offset + axis] - minimum[axis]) / range[axis]) * (resolution - 1))),
    ));
    const key = cell[0] + resolution * (cell[1] + resolution * cell[2]);
    let cluster = clusterByCell.get(key);
    if (cluster === undefined) {
      cluster = clusters.length;
      clusterByCell.set(key, cluster);
      clusters.push({ x: 0, y: 0, z: 0, count: 0 });
    }
    const aggregate = clusters[cluster];
    aggregate.x += source.positions[offset];
    aggregate.y += source.positions[offset + 1];
    aggregate.z += source.positions[offset + 2];
    aggregate.count += 1;
    sourceToCluster[vertex] = cluster;
  }

  const candidatePositions = new Float32Array(clusters.length * 3);
  clusters.forEach((cluster, index) => {
    const offset = index * 3;
    candidatePositions[offset] = cluster.x / cluster.count;
    candidatePositions[offset + 1] = cluster.y / cluster.count;
    candidatePositions[offset + 2] = cluster.z / cluster.count;
  });

  const candidateIndices = [];
  const uniqueTriangles = new Set();
  for (let offset = 0; offset < source.indices.length; offset += 3) {
    const a = sourceToCluster[source.indices[offset]];
    const b = sourceToCluster[source.indices[offset + 1]];
    const c = sourceToCluster[source.indices[offset + 2]];
    if (a === b || b === c || c === a) continue;
    const sorted = [a, b, c].sort((left, right) => left - right);
    const key = `${sorted[0]}:${sorted[1]}:${sorted[2]}`;
    if (uniqueTriangles.has(key)) continue;
    uniqueTriangles.add(key);
    candidateIndices.push(a, b, c);
  }

  const compactIndexByCandidate = new Int32Array(clusters.length).fill(-1);
  let vertexCount = 0;
  for (const index of candidateIndices) {
    if (compactIndexByCandidate[index] === -1) compactIndexByCandidate[index] = vertexCount++;
  }
  if (vertexCount > 65_535) {
    throw new Error(`Grid ${resolution} retained ${vertexCount} vertices; CCM1 permits at most 65,535`);
  }

  const positions = new Float32Array(vertexCount * 3);
  for (let candidate = 0; candidate < compactIndexByCandidate.length; candidate += 1) {
    const compact = compactIndexByCandidate[candidate];
    if (compact === -1) continue;
    positions.set(candidatePositions.subarray(candidate * 3, candidate * 3 + 3), compact * 3);
  }
  const indices = new Uint16Array(candidateIndices.length);
  for (let index = 0; index < candidateIndices.length; index += 1) {
    indices[index] = compactIndexByCandidate[candidateIndices[index]];
  }
  return { positions, indices };
}

function encodeCcm(geometry) {
  const { minimum, maximum } = boundsOf(geometry.positions);
  const range = minimum.map((value, axis) => maximum[axis] - value);
  const vertexCount = geometry.positions.length / 3;
  const bytes = new Uint8Array(
    CCM_HEADER_BYTES + vertexCount * 3 * Uint16Array.BYTES_PER_ELEMENT + geometry.indices.byteLength,
  );
  const view = new DataView(bytes.buffer);
  for (const [index, value] of [..."CCM1"].entries()) view.setUint8(index, value.charCodeAt(0));
  view.setUint32(4, vertexCount, true);
  view.setUint32(8, geometry.indices.length, true);
  minimum.forEach((value, axis) => view.setFloat32(12 + axis * 4, value, true));
  maximum.forEach((value, axis) => view.setFloat32(24 + axis * 4, value, true));

  let offset = CCM_HEADER_BYTES;
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = geometry.positions[vertex * 3 + axis];
      const quantized = Math.round(((value - minimum[axis]) / range[axis]) * 65_535);
      view.setUint16(offset, Math.min(65_535, Math.max(0, quantized)), true);
      offset += 2;
    }
  }
  for (const index of geometry.indices) {
    view.setUint16(offset, index, true);
    offset += 2;
  }
  return bytes;
}

function wrapBase64(bytes) {
  return Buffer.from(bytes).toString("base64").replace(/.{1,120}/gu, "$&\n");
}

const available = await readdir(sourceDirectory);
await mkdir(outputDirectory, { recursive: true });
const report = [];

for (const [type, config] of Object.entries(SOURCES)) {
  const filename = available.find((name) => name.includes(config.includes) && name.endsWith(".glb"));
  if (!filename) throw new Error(`Missing ${type} source containing ${config.includes}`);
  const sourceBytes = await readFile(path.join(sourceDirectory, filename));
  const parsed = parseGlb(sourceBytes);
  const compact = clusterGeometry(parsed, config.grid);
  const encoded = encodeCcm(compact);
  const outputPath = path.join(outputDirectory, `${type}.ccm.b64`);
  await writeFile(outputPath, wrapBase64(encoded));
  report.push({
    type,
    source: filename,
    grid: config.grid,
    sourceVertices: parsed.positions.length / 3,
    sourceTriangles: parsed.indices.length / 3,
    runtimeVertices: compact.positions.length / 3,
    runtimeTriangles: compact.indices.length / 3,
    binaryBytes: encoded.byteLength,
  });
}

await writeFile(path.join(outputDirectory, "build-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
