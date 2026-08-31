# Codex task — Open-source original chess models v9

## Goal
Use the project owner's already-uploaded original chess model as the normal public renderer for every player. This is not a premium/paywalled visual tier.

## Source of truth
- Runtime source asset: `public/assets/original-chess-models/chess.fbx`
- Runtime loader: `web/renderer/OriginalChessModelSet.js`
- WebMCP compatibility entry: `web/renderer/ForgeMcpPremiumPieceSet.js`
- Procedural v8 remains only as an immediate loading/error fallback.

## Required behavior
1. Prefer all six named FBX piece types: pawn, rook, knight, bishop, queen, king.
2. Center every imported piece on its square and rest it on Y=0.
3. Enforce strict per-type 8x8x8 cell/level envelopes before rendering.
4. Expose actual runtime provenance (`original-uploaded-chess-fbx`) so WebMCP inspection can distinguish the real FBX from fallback.
5. Keep the same free/open-source visual source for every player; the historical `ForgeMcpPremiumPieceSet` class name is compatibility-only.
6. Preserve deterministic rules, AI, moves, saves, selection, captures and WebMCP human-approval/rollback behavior.
7. Keep the procedural fallback under 30,000 measured triangles per piece.
8. Do not merge until typecheck, unit tests, production build and browser verification pass.

## Visual correction
If the procedural knight fallback is visible while the FBX loads, its mane fins must point backward/down the horse's crest, not forward like pencils. The real uploaded FBX is the preferred final visible source.
