# Codex task — Open Source Staunton v11

Work on the normal FREE public Cube Chess 512 renderer. Do not create a paid/premium tier and do not use uploaded FBX/GLB as runtime pieces.

Use the supplied reference renders and repository source models only as design references for recognizable Staunton anatomy, proportions, silhouette and material language.

## Visual target
Create NEW original browser-native geometry for pawn, rook, knight, bishop, queen and king. The set must read like real chess first and futuristic ForgeMCP second.

- Pawn: layered classical base, tapered stem, collar, faceted spherical head.
- Rook: architectural tapered tower, recessed crown, eight real battlements.
- Knight: true horse anatomy with continuous chest/S-neck/head/muzzle/jaw, two ears, eyes, nostril and ONE continuous mane following the rear neck. No cones, pencils or detached spikes.
- Bishop: classical body plus two smooth mitre lobes and a real diagonal slit/gap.
- Queen: elegant body, eight-point modeled crown, gems; unmistakably queen.
- King: tallest/heaviest body, modeled crown/orb and real 3D cross.

## Materials
Texture is part of the model quality. Use small deterministic procedural PBR maps generated in code, not giant assets:
- black: obsidian/gunmetal with subtle veins and teal metal accents;
- white: ivory/marble/ceramic with subtle veins and warm gold accents;
- physical clearcoat, roughness variation and readable highlights.
Keep maps compact (128x128 base color, 64x64 roughness or equivalent) and reusable.

## Runtime architecture
The normal `PieceGeometryFactory` must use this v11 set directly for every player. Legacy Meshy remains available only for historical rollback/provenance compatibility, never as the default visual path.

## Geometry/performance gates
- every finished piece must fit `pieceCellEnvelope(type)` after ALL details are present;
- preserve chess height hierarchy;
- <30,000 actually measured triangles per piece;
- reuse templates/materials/textures;
- no 4K textures or giant FBX runtime payloads;
- no fake triangle counts.

## WebMCP
Existing `document.modelContext.registerTool(...)` visual tools must operate on the same free public renderer. Historical `ForgeMcpPremiumPieceSet` naming is compatibility-only.

## QA
Add deterministic tests for fit, triangle ceiling, knight anatomy, bishop slit, rook battlements, queen crown, king cross, procedural texture maps, provenance and free public source.

Run all repository checks. Do not merge until required CI/browser checks are green.

## AI follow-up
Do not claim neural-network training. Existing easy/medium/hard profiles remain engine difficulty profiles. After visual v11 is accepted, use real baseline-vs-candidate self-play, legal-game logs, side swaps and PASS/WARNING/FAIL evaluation before tuning/promoting any AI candidate.
