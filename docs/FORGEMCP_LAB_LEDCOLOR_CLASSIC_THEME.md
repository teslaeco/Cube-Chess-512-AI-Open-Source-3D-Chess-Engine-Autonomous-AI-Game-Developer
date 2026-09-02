# Lab LEDColor and Classic Black & White — WebMCP Challenge work

Date added: 2026-09-02

## Challenge-period addition

Cube Chess 512, its 8×8×8 rules engine, the Three.js board, the high-detail
piece assets and the two earlier visual collections predate this change. This
contribution renames the first collection in the player interface from
ForgeMCP Premium to **Lab LEDColor**, makes its appearance configurable and
adds a third player-selectable theme: `CLASSIC_BLACK_WHITE`.

The historical `FORGEMCP_PREMIUM` identifier remains internal so preferences,
versioned saves and WebMCP integrations created before the rename continue to
load. This is a compatibility identifier, not a paid-access claim.

## Three real visual themes

The New Game screen now previews and starts all three board-and-piece themes:

| Player-facing theme | Piece geometry | Board and material treatment |
| --- | --- | --- |
| Lab LEDColor | Existing owner-provided high-detail models | Configurable square, piece-tint, LED and key-light colors, plus light intensity |
| Crayon Cathedral | Existing original procedural collection | Stained-glass five-map PBR materials and cathedral/crayon geometry |
| Classic Black & White | Same high-detail models used by Lab LEDColor | Fixed ivory/near-black PBR pieces and board, stronger key/fill/rim separation, soft shadows and clearcoat highlights |

Classic Black & White deliberately has no color controls: its fixed monochrome
palette is part of the theme. Selecting Lab LEDColor reveals a separate,
collapsible configuration tab immediately after the theme cards. Every change
previews on the live 3D scene before the game starts.

## Lab LEDColor controls and persistence

The Lab LEDColor tab provides:

- light- and dark-square colors;
- white- and black-piece tints;
- figure/board LED color;
- main-light color;
- light intensity from 0.50× to 1.50×;
- one-action reset to defaults.

Inputs are normalized before use. Colors must be six-digit hexadecimal values
and light intensity is clamped and rounded to supported steps. The normalized
settings are stored locally and included in the existing versioned game-save
payload. Older saves without the new object receive defaults.

## Runtime and WebMCP truth

Theme selection uses the production `ChessRenderer` path. It rebuilds active
and captured pieces only when geometry or piece-material inputs change; board
and lighting-only adjustments update in place. Piece IDs, positions, game
rules, AI settings and the 512-square board model are not changed.

The existing WebMCP preview and approval-gated upgrade tools accept all three
player-selectable presets. Their diagnostics distinguish Lab LEDColor PBR,
Crayon Cathedral PBR and Classic Black & White PBR materials while retaining
the historical preset identifier for compatibility.

## Reproducible verification

```bash
npm test
npm run build
npm run smoke:dist
npx playwright test e2e/game.spec.js --project=chromium-desktop --grep "third Classic|configures Lab LEDColor"
npx playwright test e2e/game.spec.js --project=mobile-chrome --grep "third Classic|configures Lab LEDColor"
```

The browser tests select each real UI card, wait for all 32 high-detail pieces,
inspect runtime material and lighting metadata, start a game and verify local
preference persistence. These are repository QA checks, not a jury decision or
evidence of AI-training improvement.

## Main implementation files

- `web/state/labLedColorSettings.js`
- `web/renderer/VisualThemeMaterials.js`
- `web/renderer/visualThemes.js`
- `web/renderer/PieceGeometryFactory.js`
- `web/renderer/BoardRenderer.js`
- `web/renderer/SceneController.js`
- `web/renderer/ChessRenderer.js`
- `web/ui/GameHud.js`
- `web/forgemcp/visualTools.js`

No third-party model, image or texture asset is introduced by this change.
