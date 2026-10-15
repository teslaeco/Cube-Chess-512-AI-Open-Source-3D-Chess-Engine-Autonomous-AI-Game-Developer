# 15 October 2026 — One menu exit and guarded external navigation

## Scope and actual UI behavior

The owner reported two adjacent menu controls in the premium mobile header and missing warnings on browser refresh or an address-bar navigation. This patch addresses the existing Cube Chess application directly; it does not replace the 3D board.

- While a real match is active, the premium header exposes exactly one **Exit to menu** button. The old direct **Menu** button is disabled/hidden, not removed from the demo/start screen. A second Exit control is no longer inserted in the menu footer.
- The existing in-document Exit confirmation and game-save handling are unchanged: Cancel preserves the current game; Confirm ends the active session, retains saved games and identity, and opens the menu without a document reload.
- A `beforeunload` listener requests the browser's native warning when a local, computer, tutorial, online or completed match is open, including a paused match. The demo/initial screen and an intentionally exited match do not request that warning.
- Browser implementations decide whether to show that native prompt and supply its text. Current browsers **do not allow application-defined strings** in the warning. Mobile app termination, process kills and unactivated pages may skip prompts. This patch does not claim guaranteed delivery or automatic saving.
- The listener is removed when the application is disposed. Studio, billing, account/auth backend, chess move legality, 3D models and saves are unchanged.

## Test and release gates

Unit tests verify demo versus active/paused/finished match decisions, event prevention and listener lifecycle. Production-build desktop/Pixel Chromium E2E tests verify exactly one visible menu exit, native reload prompt cancellation preserving the ongoing match, Cancel retaining unload protection, and Confirm returning to menu without unload protection. Existing browser/menu/premium layout and original build suites must stay green.

This is a source PR. Do not claim LIVE without passing checks, a merged Chess revision, an independently green WORLDIFACT foundation build with that exact Chess revision pinned, and a preserving Cloudflare deployment receipt. Physical Android and signed-in profile acceptance remain unverified.
