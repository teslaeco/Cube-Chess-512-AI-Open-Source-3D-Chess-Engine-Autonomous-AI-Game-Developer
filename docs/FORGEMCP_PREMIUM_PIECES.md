# ForgeMCP Premium Piece Set — WebMCP Challenge Work

Date added: 2026-08-31

## PRE-CHALLENGE WORK

The following existed before the OpenAI WebMCP Challenge submission period and must not be presented as new challenge work:

- Cube Chess 512 deterministic 8×8×8 rules/game engine.
- Existing Three.js renderer, board, camera, legal move handling, save state and multiplayer foundations.
- Existing procedural chess-piece fallback geometry in `web/renderer/PieceGeometryFactory.js`.
- Existing Meshy-derived source provenance and compact runtime delivery pipeline.
- Existing compact `.ccm.b64` runtime assets under `public/assets/meshy-chess-models/`.

The compact runtime derivatives are intentionally much smaller than the supplied source GLB files. Repository provenance records approximately 834–898 runtime triangles per compact model while the supplied source GLBs were much larger. Merely uploading a larger GLB does not change the live game because the runtime loader explicitly resolves the compact `.ccm.b64` assets.

## NEW WEBMCP CHALLENGE WORK — ADDED AFTER AUGUST 25, 2026

This change adds a new `FORGEMCP_PREMIUM` visual preset and a new browser-native human-agent workflow that mutates the real running Cube Chess renderer after explicit approval.

### New premium geometry

`web/renderer/ForgeMcpPremiumPieceSet.js` constructs a new coherent six-piece set with Three.js geometry committed as code:

- Pawn — layered sculpted base, tapered body, collar, faceted head and accent cap.
- Rook — architectural tower body, upper ring, crown recess and eight modeled battlements.
- Knight — a true multi-part 3D horse form using a curved tube neck, faceted chest/head, muzzle, paired ears, mane ridge, cheek and eyes rather than a flat extruded silhouette.
- Bishop — tall body, faceted mitre, modeled diagonal cut and accent tip.
- Queen — elongated body, collar, crown ring, ten crown points, jewels and center orb.
- King — heavy body, crown base, orb and an actual 3D cross made from geometry.

White pieces use an ivory/ceramic-light-metal physical material family with a warm metallic accent. Black pieces use obsidian/gunmetal materials with brighter secondary surfaces and a copper-like accent so details remain readable on stacked transparent levels.

### Runtime preset and rollback

The existing piece factory remains the legacy path. ForgeMCP stores the original factory function and can temporarily replace it with the new premium set for the currently running game. The change rebuilds active and captured Three.js piece objects while preserving game state, piece identity, board coordinates, selection and level visibility. Rollback restores the previous legacy factory path.

### Browser-native WebMCP tools

The browser registers real tools through `document.modelContext.registerTool(...)`:

- `inspect_piece_visuals`
- `preview_piece_visual_upgrade`
- `upgrade_piece_visuals`
- `rollback_piece_visuals`

`upgrade_piece_visuals` requires:

```json
{
  "preset": "FORGEMCP_PREMIUM",
  "humanApproved": true
}
```

Without explicit approval, live mutation is rejected.

### Verification and provenance

The tool measures actual Three.js `BufferGeometry` triangle counts from live objects. It records before/after active and captured piece counts, coordinates, selected piece, level visibility, per-type triangle counts, material signatures, preset state and provenance. Deterministic QA blocks the upgrade if the six premium models do not have finite non-zero geometry or do not fit their configured cell envelope.

This is geometry/configuration/runtime verification. It is not a claim of photorealistic user-study validation or screenshot-based perceptual QA.

### Safety boundary

This visual workflow does not modify legal move rules, AI policy, check/mate logic, serialized game state or multiplayer authority. Mutation is approval-gated and reversible.

## Challenge evidence

Foundation PR: #112 (`forgemcp/real-visual-upgrade`).

Premium implementation branch: `forgemcp/premium-piece-set`.

The final PR created from this branch is the challenge-period evidence for the new premium set and its real WebMCP mutation path.
