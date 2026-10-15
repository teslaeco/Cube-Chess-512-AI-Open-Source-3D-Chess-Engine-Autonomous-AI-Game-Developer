# Premium compact HUD — October 15, 2026

## Owner-supplied evidence
Android screenshots show the profile chip obscuring the Exit to menu button, an unnecessarily tall/wide layer selector and stats panel, and the camera toolbar overlapping WORLDIFACT/Shop links at the bottom. A reference mockup suggests restrained green/blue neon LED lighting. This revision implements layout in the existing game rather than presenting the mockup as a screenshot or replacing the board's 3D content.

## Changes
- Move the existing account dropdown into the game header's actual CSS grid, not an independent fixed layer. Preserve its original identity, menu actions and sign-out handlers.
- Responsive header: brand, current turn/level, action controls and account have assigned grid areas; on narrow viewports they form two short, aligned rows. Exit to menu remains explicit and keeps its existing destructive confirmation and no-reload behavior.
- Compress stats, 8-level selector and camera toolbar on touch screens. Preserve all eight levels and eight camera/edit actions; the bottom control strip scrolls horizontally if necessary. Keep a clear gap above the separate WORLDIFACT/Shop links.
- Glass panels use subtle blue/green LED borders, compact labels, real focus indicators, high-contrast and reduced-motion support.
- Do not edit chess rules, piece geometry, account state, provider/API behavior, game saves or payment settings.

## Verification requirements
- Existing unit and desktop/mobile gameplay regression suite must remain green.
- Added production-build desktop + mobile Chromium checks require the real game, a visible Exit to menu button, a compact header/status/layer dock, no intersecting account/exit boxes, no document overflow or bottom control collision, and a cancelled exit without navigation.
- The test makes a synthetic guest label visible on the existing profile component *solely to validate geometry*; it does not authenticate, create an account, or claim a successful sign-in.
- Physical Android, iOS, and signed-in account visual acceptance remain UNKNOWN until performed.

## Release gates
Do not merge and publish if any test fails or skips. The separate WORLDIFACT consumer must advance its immutable Chess foundation pin to the tested revision and pass its own full verification, foundation build, Worker dry-run and safe preserving publication checks before claiming LIVE.
