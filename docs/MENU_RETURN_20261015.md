# Screenshot-driven Cube Chess menu and About follow-up

Owner request: open the actual game from WORLDIFACT, provide a confirmed return to the main menu without reloading, and replace About with chess-focused product information and upcoming-update wording.

This branch builds on `705d7b0fe5fff03a5d7975fe094804af1eef44ea`, the exact foundation currently used by WORLDIFACT. Its only preceding difference from main `e134964e9c8b7edc43c26b508973f6fb658af90d` is the reviewed English online-opponent fallback. No V1 release/tag or develop/v2 work is overwritten.

An explicit Exit to menu control is available in the game header and paused menu. Cancel leaves the match and connection untouched. Confirmation cancels match-scoped AI/autosave work, disconnects that online match, clears transient panels and queued input/animations, and opens a fresh menu/demo using the existing renderer. Identity, visual settings and previously saved games are not deleted. AI/storage completions are guarded by a session revision so an exited game cannot modify a new one.

About now describes the 8×8×8 / 512-square chess game, Terraforming Planet's chess/AI/3D work and planned browser/Android/iOS improvements. English and Polish are supplied; other languages fall back to this English copy. Upcoming updates are not represented as an already published store release.

Verification is pending at branch creation. Added unit regressions cover cancellation, confirmation, preserved saves/identity, stale AI completion and cancelled autosave. A PR-only, read-only workflow exercises desktop and mobile Chromium with local guest play, blocked external provider requests and zero document reloads. No merge, Pages publication, provider call or paid test is included. Real Android/iOS devices, account sign-in and live multiplayer are not certified by these tests.
