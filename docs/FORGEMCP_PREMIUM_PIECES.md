# ForgeMCP high-detail chess pieces — WebMCP Challenge work

Date updated: 2026-09-01

## Pre-challenge work

Cube Chess 512 already had its 8×8×8 rules engine, Three.js board, camera controls, saves, multiplayer foundations, procedural piece fallbacks, and six owner-supplied Meshy GLB sources. The earlier browser derivatives under `public/assets/meshy-chess-models/` retained only 834–898 triangles per figure and remain available as the explicit `LEGACY_COMPACT` rollback preset.

## Current owner-uploaded model pipeline

The public `FORGEMCP_PREMIUM` preset now renders geometry derived from the owner's actual six GLBs instead of the procedural v14 approximation:

| Piece | Runtime triangles | Runtime vertices | Readable height |
| --- | ---: | ---: | ---: |
| Pawn | 78,941 | 39,304 | 0.62 |
| Rook | 106,798 | 53,276 | 0.76 |
| Knight | 112,072 | 55,406 | 0.79 |
| Bishop | 90,134 | 44,818 | 0.82 |
| Queen | 91,668 | 45,546 | 0.86 |
| King | 77,848 | 38,451 | 0.90 |

`scripts/build-high-detail-chess-assets.mjs` clusters the source surfaces on a fine grid, averages positions inside each occupied cell, removes degenerate and duplicate triangles, then writes versioned `CCM1` assets under `public/assets/high-detail-chess-models/`. This preserves the supplied classical silhouettes and 77k–112k triangles per type without shipping the 29 MB raw GLBs.

`HighDetailChessModelSet` validates and decodes each unique geometry once. Board instances share immutable geometry but clone white/black materials so selection highlighting stays local to one piece. The procedural v14 object is visible only while the asynchronous uploaded model is loading or if validation fails; a fallback is never reported as a successful premium load.

## Scale and camera correction

The rejected 0.23–0.45 height profile made every figure too small. The new 0.62–0.90 profile still leaves clearance below the next 1.25-spaced level, including the selected-piece 1.1× scale. Horizontal fitting uses the available 0.58–0.70 footprint so the figures remain readable on full-board views.

The gameplay camera is fitted only after the real canvas aspect is known. Starting, loading, resetting, or beginning a new game opens an active-layer gameplay composition; the explicit “Fit entire board” action retains the full-cube view. Portrait framing uses a near-axis, steeper camera to keep the board inside the narrow viewport. Inactive levels and cell wires remain visible but much fainter so they do not obscure the pieces.

## Browser-native WebMCP tools

The page registers real tools through `document.modelContext.registerTool(...)`:

- `inspect_piece_visuals`
- `preview_piece_visual_upgrade`
- `upgrade_piece_visuals`
- `rollback_piece_visuals`

Mutation remains approval-gated:

```json
{
  "preset": "FORGEMCP_PREMIUM",
  "humanApproved": true
}
```

The upgrade waits until every live active and captured holder reports `highDetailModelState: "ready"`. QA measures live triangle counts, source identity, material separation, coordinates, piece counts, selection and level visibility. It fails on loading timeouts, fallbacks, wrong provenance, fewer than 70,000 triangles for any type, invalid bounds, or a no-op transition. Rollback independently waits for all compact models and verifies the reverse mutation.

The Chromium evidence job performs `LEGACY_COMPACT → FORGEMCP_PREMIUM → LEGACY_COMPACT`, captures board screenshots and twelve white/black close-ups, and rejects browser console errors. This visual workflow does not modify movement rules, AI policy, serialized game state, or multiplayer authority.

## Provenance

The repository owner supplied the source models. Keep proof of generation and confirm that the applicable Meshy account/license permits redistribution before commercial store distribution.
