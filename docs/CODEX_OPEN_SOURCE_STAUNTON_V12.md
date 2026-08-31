# Codex task — Open Source Staunton v12

Work on the normal FREE public Cube Chess 512 renderer.

Do not create a premium tier. Do not render uploaded FBX/GLB assets. Use the supplied references only to understand chess anatomy, silhouette, proportions and material language.

Goal: six recognisable, high-quality, browser-efficient Staunton-inspired pieces plus twelve compact role-specific color textures (six piece roles x two sides).

## Required runtime architecture

- The normal `PieceGeometryFactory` must use the new generated v12 set directly.
- Existing Meshy/imported assets remain rollback/provenance only.
- Existing browser-native `document.modelContext.registerTool(...)` visual tools must continue to mutate the same live renderer.
- Preserve rules engine, AI state, move history, selection, captures, visible levels, human approval and rollback.

## Geometry

All six roles must be modeled in code with reusable Three.js geometry and must remain inside `pieceCellEnvelope(type)`.

### Pawn
Smooth layered base, tapered neck, collar, true round/faceted head, restrained accent.

### Rook
Architectural tapered tower, recessed crown, eight actual modeled battlements, readable top cavity.

### Knight — highest priority
No flat silhouette, no cone/pencil mane, no disconnected spikes.
Create a volumetric horse using continuous lofted sections:
- chest and S-neck
- skull and brow
- cheeks
- muzzle and nose
- lower jaw
- two ears
- two eyes
- nostril
- one continuous mane surface following the rear neck toward the poll
The silhouette must read as a chess knight from side and 3/4 views.

### Bishop
Two volumetric mitre lobes and a real diagonal slit/gap/recess; not a black rectangle painted over a ball.

### Queen
Elegant body with eight modeled crown points and restrained gems; clearly distinct from king.

### King
Tallest/heaviest body, orb, and a real extruded 3D cross.

## Textures/materials

Generate twelve deterministic 128x128 compact color maps: one for each piece role and side. Share compact roughness maps per side. Use physical PBR materials:
- black: obsidian/gunmetal, subtle teal accent
- white: ivory/marble/ceramic, restrained warm-gold accent
- clearcoat, roughness variation and environment response
No 4K maps and no giant runtime FBX payloads.

## Performance/QA

- <30,000 actually measured triangles per piece
- shared templates/materials/textures where safe
- finite non-zero bounds
- strict cell/level fit
- classical height hierarchy King > Queen > Bishop > Knight > Rook > Pawn
- 12 unique role/side color texture instances
- knight anatomy roles present
- exactly one continuous knight mane
- bishop left/right mitre and slit present
- rook has eight battlements
- queen has eight crown points
- king has one real cross

Do not raise QA limits just to get green checks. Fix geometry/runtime instead.

Run required unit tests, geometry QA, production build, Chromium real-canvas tests and WebMCP live verification. Do not merge until required checks are green.
