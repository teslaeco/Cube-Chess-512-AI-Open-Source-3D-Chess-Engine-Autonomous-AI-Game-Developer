# Crayon Cathedral chess collection — WebMCP Challenge work

Date added: 2026-09-01

## Challenge-period addition

Cube Chess 512, its 8×8×8 rules engine, the Three.js board and the existing
ForgeMCP Premium pieces predate this change. This contribution adds a second,
meaningfully different runtime collection during the WebMCP Challenge period:
`CRAYON_CATHEDRAL`.

The player chooses the 3D collection before choosing local play, computer play
or the AI tutorial. Changing the radio card previews the real replacement in
the live board. Starting a game, loading a save and internal/online game starts
retain the selected collection. The existing Premium collection remains
available and unchanged.

## Original procedural models

`CrayonCathedralPieceSet` builds six distinct Three.js silhouettes from actual
lathed, extruded and polyhedral geometry. Owner-provided reference renders
informed the visual direction—Gothic windows, stained glass and colored crayon
finials—but no reference pixels, external mesh or generated image is shipped as
a model or texture.

| Piece | Measured triangles | Fitted height | Fitted footprint | Draw batches |
| --- | ---: | ---: | ---: | ---: |
| Pawn | 50,348 | 0.66 | 0.583 | 7 |
| Rook | 110,992 | 0.81 | 0.705 | 17 |
| Knight | 172,612 | 0.84 | 0.686 × 0.615 | 19 |
| Bishop | 54,544 | 0.87 | 0.667 | 8 |
| Queen | 111,356 | 0.92 | 0.696 | 15 |
| King | 100,192 | 0.96 | 0.705 | 12 |

Every type contains both modeled window geometry and modeled crayon geometry.
The knight uses an original, continuous classical Staunton profile with a
vertical S-neck, high poll, sloped equine forehead, closed modeled jaw, blunt
muzzle and tucked throat. The hard-faceted beveled bust and ears contain
181,080 vertices in their consolidated batch. Almond eyes, glass pupils,
nostrils, brow, mouth and an embossed bridle remain real raised geometry.
Eight complete crayons on each side of the rear neck form the mane: every red,
orange, yellow, green, blue, violet, magenta and teal crayon keeps its modeled
shaft, twin wrapper bands and sharpened tip. The complete figure remains
centered and inside one field so the mobile camera cannot make it spill across
adjacent fields. The bishop uses a pointed
Gothic mitre instead of the pawn's lantern orb. Rook, queen and king use
different window galleries and different crayon crowns or cross structures.

The figures are fitted after every detail is added. Even the selected 1.1×
scale remains inside the 1.19-wide rendered field and below the next
1.25-spaced level.

## Stained-glass PBR materials

`CrayonCathedralTextureSet` deterministically generates a complete 256×256
five-map PBR stack for every type and side:

- base color;
- roughness;
- metalness;
- bump;
- emissive.

The cool side uses teal, blue, violet and green stained glass. The warm side
uses red, orange, magenta, purple and yellow. Body, frame, lead, glass and
colored-crayon materials all use the complete stack. Textures are cached and
shared, while each live piece receives independent materials so selection glow
cannot recolor another piece.

## Browser and mobile performance

Repeated windows, rings and crayon parts remain full polygonal geometry, but
are merged by material and role into 7–19 draw batches per type. Immutable
geometry is shared across every instance and across both player palettes; only
materials differ. This avoids duplicating GPU buffers for 32 pieces while
preserving the measured triangle counts above.

On coarse-pointer and narrow screens the turn-based renderer yields briefly
between frames, targeting roughly 25–30 fps and keeping controls responsive.
Desktop retains native `requestAnimationFrame` cadence. Exact frame rate and
initial preparation time still depend on browser, GPU and device; the high-poly
collection is therefore an explicit player choice rather than a replacement
for every visual mode.

## Real WebMCP path

The existing browser-native tools registered with
`document.modelContext.registerTool(...)` now accept both player collections:

- `inspect_piece_visuals` inspects both geometry pipelines and reports the live
  source, maps, bounds, roles and triangle counts;
- `preview_piece_visual_upgrade` validates either proposal without mutation;
- `upgrade_piece_visuals` applies either `FORGEMCP_PREMIUM` or
  `CRAYON_CATHEDRAL` only with `humanApproved: true`;
- `rollback_piece_visuals` retains the historical compact rollback path.

Example approved mutation:

```json
{
  "preset": "CRAYON_CATHEDRAL",
  "humanApproved": true
}
```

The mutation rebuilds active and captured objects while checking that piece
IDs, coordinates, selection, level visibility and counts remain unchanged.
Crayon Cathedral QA additionally rejects any type below 45,000 triangles,
outside its cell envelope, missing window/crayon roles or missing any PBR map.

## Reproducible verification

```bash
npm test
npm run build
npm run smoke:dist
npx playwright test e2e/game.spec.js --project=chromium-desktop --grep "chooses Crayon Cathedral"
npx playwright test e2e/game.spec.js --project=mobile-chrome --grep "chooses Crayon Cathedral"
npm run capture:crayon
```

The capture command starts a local Vite server when necessary, selects the real
collection, checks all live objects and writes menu, board, twelve close-up
screenshots and machine-readable `evidence.json`. It fails on console errors,
wrong provenance, incomplete texture stacks, missing modeled roles or triangle
counts below the declared threshold.

Validation performed on 2026-09-01 for this change:

- Vitest: 51 files and 285 tests passed;
- production TypeScript/Vite build passed;
- production PWA smoke test passed;
- targeted real-browser selection/game tests passed on desktop Chromium and a
  mobile Chrome profile;
- desktop/mobile capture reported 32/32 ready objects and no console errors.

These are repository QA results, not a jury decision and not evidence of AI
training or neural-network improvement.

## Main implementation files

- `web/renderer/CrayonCathedralPieceSet.js`
- `web/renderer/CrayonCathedralTextureSet.js`
- `web/state/pieceVisualPresets.js`
- `web/ui/GameHud.js`
- `web/forgemcp/visualTools.js`
- `scripts/capture-crayon-cathedral.mjs`

The implementation uses the repository's pinned Three.js dependency under its
applicable license and introduces no third-party model or image asset.
