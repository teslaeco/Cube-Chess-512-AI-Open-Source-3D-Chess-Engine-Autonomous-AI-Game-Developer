# Screenshot-driven Cube Chess menu and About follow-up

Owner request: open the actual game from WORLDIFACT, add confirmed return to the main menu without reloading, and replace About with chess-focused information and upcoming updates.

## Implemented

This branch builds on WORLDIFACT's existing exact foundation `705d7b0fe5fff03a5d7975fe094804af1eef44ea`. The preceding difference from main `e134964e9c8b7edc43c26b508973f6fb658af90d` is the reviewed English online-opponent fallback. No V1 release/tag or develop/v2 work is overwritten.

Exit to menu is available in the game header and paused menu. Cancel leaves the match and connection untouched. Confirmation cancels match-scoped AI/autosave work, disconnects that online match, clears transient panels and queued input/animations, and opens a fresh menu/demo using the existing renderer and document. Identity, visual settings and saved games are preserved. Session revisions stop late AI/storage callbacks from modifying a new match.

The guest-entry MutationObserver now disconnects before writing readiness attributes, preventing its previous self-triggering update loop. About is chess-first English/Polish copy: 8×8×8, 512 squares, Terraforming Planet's work and upcoming browser/Android/iOS improvements, without claiming an app-store release.

## Evidence and remaining gate

At `1cadf504cc4928903dd7186ec1ce033f50eb262e`, the original Pages workflow's test/build job passed; publication was skipped for the PR. Browser run [38694910568](https://github.com/teslaeco/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/actions/runs/38694910568) completed with 2/6 passed: mobile About and direct guest entry; four interaction tests timed out. It is not a green browser result.

The follow-up browser fixture now tests the actual production build rather than development/HMR, with an explicit Chromium SwiftShader backend on the GPU-less runner. Video capture is disabled to avoid competing software rendering; assertions, actual game geometry, timeouts, zero retries, native confirmation, saved-game retention and no-reload checks are retained. The production diagnostics application reference is used instead of a DEV-only global. No mock renderer or provider calls are used. Final browser results remain pending until the new run completes.

No merge, Pages publication, paid provider call or billing change. Physical Android/iOS, real sign-in and live multiplayer are not certified by local guest tests.
