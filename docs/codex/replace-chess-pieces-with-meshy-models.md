# Codex Task — Replace Procedural Chess Pieces with Owner-Provided Meshy Models

## Role

Act as Lead Game Architect and Lead Rendering Engineer for Cube Chess 512 AI. Treat this as a focused production asset-integration pull request. Preserve gameplay rules, multiplayer state, saves, selection metadata and animation behavior.

## Goal

Replace the currently displayed pawn, rook, knight, bishop, queen and king geometry with the six owner-provided Meshy GLB models while retaining the existing procedural pieces as a safe asynchronous fallback.

## Source assets

- `Meshy_AI_Steel_Pawn_0803204718_generate.glb` → pawn
- `Meshy_AI_Titanium_Rook_0803204411_generate.glb` → rook
- `Meshy_AI_Faceted_Knight_0803200730_generate.glb` → knight
- `Meshy_AI_Gunmetal_Bishop_0803204615_generate.glb` → bishop
- `Meshy_AI_Obsidian_King_0803204627_generate.glb` → queen, because its crown silhouette is queen-like and the separate steel model has the unambiguous king cross
- `Meshy_AI_Steel_King_0803204608_generate.glb` → king

## Required architecture

1. Do not ship the raw 224k–344k triangle assets.
2. Generate mobile-safe derivatives with roughly 2.7k–3.2k triangles per unique piece.
3. Quantize positions to unsigned 16-bit values and indices to unsigned 16-bit values in a versioned compact binary format.
4. Split each compact payload into four ordered static Base64 text assets so GitHub Pages, Vite, Tauri and the PWA can serve the same assets without Git LFS, then join them deterministically before decoding.
5. Decode each unique geometry only once and share it across all instances of that piece type.
6. Compute normals after decoding, preserve white/black production materials, shadows and readability outlines.
7. Normalize every imported model to the existing `pieceCellEnvelope` contract.
8. Keep procedural geometry visible until the asynchronous model is ready and keep it permanently if loading or validation fails.
9. Do not modify rules, state serialization, piece IDs, raycast metadata, move animation or multiplayer messages.

## Validation

- Add unit tests for compact format signature, bounds, counts, index safety and all six assets.
- Enforce no more than 1,600 vertices and 3,200 triangles per unique model.
- Run `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke:dist`.
- Manually verify desktop and phone layouts, white/black contrast, selection, captures, promotion, camera fit and PWA reload.

## Pull request requirements

Document the source-to-piece mapping, before/after polygon and download sizes, fallback behavior, browser compatibility and remaining licensing/provenance check. Keep the PR in draft until CI and manual visual checks are green.
