# ForgeMCP Premium v5 — reference-inspired, performance-first 3D strategy

## Visual references supplied for this iteration

Two Meshy FBX packages were reviewed as **visual references**, not copied into the runtime:

- Neon Crystal Knight package: ~179 MB ZIP; FBX ~134 MB; albedo ~26.7 MB; normal map ~19.5 MB; metallic/roughness ~1.5 MB each.
- Cosmic Bishop package: ~184.8 MB ZIP; FBX ~137.7 MB; albedo ~28.1 MB; normal map ~20.6 MB; metallic/roughness ~1.4 MB each.

These references establish the desired visual language: layered crowns, crystalline/faceted surfaces, strong readable silhouettes, emissive accents, modeled anatomy and ornament. They are far too large to ship directly per piece in a browser game.

**Important:** scaling a model from 12 cm to 1.2 cm in world units does not meaningfully reduce file size or GPU cost. Runtime cost is driven mainly by vertex/triangle count, texture resolution/format, material count, draw calls, overdraw and shader complexity.

## v5 approach

ForgeMCP Premium v5 therefore keeps the useful visual ideas while rebuilding and serving them as compact browser-native geometry:

1. Preserve silhouette first: knight head/neck/mane/cheek/eye anatomy; bishop crystalline mitre and cut; strong rook battlements; queen crown; king cross.
2. Spend triangles on silhouette-changing geometry. Small surface detail comes from faceting, PBR response, emissive accents and compact procedural textures instead of dense micro-geometry.
3. Reuse immutable geometry/material resources across all 32 live pieces. Do not duplicate GPU buffers per piece.
4. Keep a strict board envelope: no piece may cross into the next 8×8×8 level or overflow its square footprint.
5. Report measured triangles, drawables and shared-resource counts through ForgeMCP WebMCP inspection tools.

## Browser asset path for future authored models

If externally authored models are added later, the required production path is:

`FBX/high-poly source -> retopology/decimation -> baked normal/AO -> glTF/GLB -> EXT_meshopt or Draco geometry compression -> KTX2/Basis texture compression -> LODs -> runtime QA`

Three.js `GLTFLoader` supports Draco, KTX2 and Meshopt decoders. Source FBX packages should remain outside the public runtime bundle until license/redistribution terms are explicitly verified.

## WebMCP role

WebMCP does not generate meshes. ForgeMCP uses `document.modelContext.registerTool(...)` to expose the real in-page renderer functions so an agent can inspect, preview, apply and roll back visual upgrades. Mutating the live game still requires human approval and returns measured QA/provenance.
