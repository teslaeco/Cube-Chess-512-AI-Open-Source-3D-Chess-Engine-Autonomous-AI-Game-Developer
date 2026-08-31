# Codex task — Open-source reference-guided generated chess geometry v9

## Goal
Build a NEW, normal public open-source chess-piece renderer for every player. The project's uploaded chess models are design references only. They must not be loaded, copied, or used as the final runtime pieces.

## Reference policy
- Reference location: `public/assets/original-chess-models/`
- Purpose: study recognisable proportions, silhouettes and chess-role anatomy.
- Runtime source: newly generated Three.js geometry in `web/renderer/ForgeMcpPremiumPieceSet.js` and its procedural base.
- Never claim this is model training unless an actual ML training job exists.
- Correct description: reference-guided procedural / agentic 3D generation.

## Required geometry
1. Rebuild/extend all six roles: pawn, rook, knight, bishop, queen and king.
2. Preserve clear Staunton-like role recognition while adding richer multi-faceted spatial geometry.
3. Use indexed BufferGeometry, loft/ring cages, lathed surfaces, polyhedral details and shared geometry/materials.
4. Knight: smooth volumetric neck/head/muzzle/cheeks/ears; mane must follow backward along the crest. No forward-pointing cone pencils.
5. Bishop: real split mitre and diagonal cut plus modeled ribs/facets.
6. Rook: real battlements and architectural buttress/facet treatment.
7. Queen: clear crown points plus modeled crown facets.
8. King: unmistakable 3D cross with polyhedral core/details.
9. Pawn: recognisable classical pawn with extra faceted detail but no over-decoration.

## 8x8x8 fit
- Every generated piece must remain completely inside one board cell and below the next level.
- Refit the finished object after all added geometry, not before.
- Keep the existing conservative public safe envelopes and the <30,000 measured triangle ceiling.
- Do not raise QA limits merely to make CI green.

## WebMCP
The existing browser-native `document.modelContext.registerTool(...)` visual tools must continue to mutate the real live renderer. Runtime provenance must report `open-source-reference-guided-generated-v9`, not the uploaded FBX.

## Acceptance
- no uploaded FBX/GLB used as final runtime geometry
- all six roles contain newly generated modeled detail
- knight mane orientation fixed
- strict cell/level fit PASS
- measured geometry finite and <30k triangles per piece
- live game state, rules, AI, selection, captures and level visibility preserved
- typecheck, unit tests, build and browser/WebMCP verification all PASS before merge
