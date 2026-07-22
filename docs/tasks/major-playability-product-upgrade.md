# Major playability and product upgrade

This checklist is the repository-local epic because GitHub Issues are disabled.
The owner can enable **Settings → General → Features → Issues** and migrate the
unchecked work to issues later.

## Completed in this draft PR

- [x] Real raycast selection and legal click/tap move execution
- [x] Capture by clicking the opponent mesh on a legal target
- [x] White-first turn ownership, turn changes, check/mate/stalemate lock
- [x] Exact undo/redo state including captures, turn and active level
- [x] Cross-level highlights, path, piece animation and camera follow
- [x] Black and White pawn A→H rule, including attack detection and tests
- [x] Bishop/rook/queen movement separation and blocking regressions
- [x] Click-versus-camera-drag threshold
- [x] Bounding-sphere board fit and distance-independent default lighting
- [x] Eight numbered, accessible menu panels with `×`, Escape and focus trap
- [x] Local two-player and computer-side selection; computer opens as White
- [x] Web Worker legal-move search with easy/medium/hard time/depth limits
- [x] Versioned IndexedDB save/load/rename/delete, autosave and JSON import/export
- [x] 38 BCP 47 choices, `ar-PS`, persistence, fallback and RTL
- [x] Polish/English technical completeness and explicit machine-draft labels
- [x] Legal engine-driven one-minute looping background demo and cleanup
- [x] Captured-piece area/aura and selected-piece glow
- [x] Mini Computer 1/8: virtual files, safe external search, keyboard and local audio
- [x] Eight logical multiplayer regions and honest offline UI state
- [x] Authoritative local WebSocket server, health endpoint, sequence validation,
  spectators, reconnect identity, Docker configuration and integration test
- [x] PWA manifest, icon, versioned offline shell and update notification
- [x] Tauri 2 scaffolding and draft unsigned release workflow for four targets
- [x] Single deterministic Pages workflow with production and browser gates
- [x] Real WebGL E2E tests, responsive screenshots and production smoke test

## Still required before calling the full product vision complete

### Gameplay and teaching

- [ ] Promotion, castling and en passant decisions for the 3D ruleset
- [ ] Complete tutorial explanations for each piece, rejected move and level change
- [ ] Implement the selected game clock rather than only storing its configuration
- [ ] Replay timeline plus versioned 3D FEN/PGN interchange design
- [ ] Curated 60-second demo containing every requested piece, captures, ascent to H
  and an engine-verified legal checkmate

### Online service

- [ ] Connect the menu to `MultiplayerClient` with lobby and room-code forms
- [ ] Invitations, presence and reconnect UX
- [ ] Deploy real TLS WebSocket endpoints and health checks for selected regions
- [ ] Authentication, rate limits, abuse controls, moderation and persistence
- [ ] Threat model and independent server security review

### UI, accessibility and localization

- [ ] Complete sound, shadow, antialiasing, render-scale, control-sensitivity,
  region latency, FPS/draw-call and local-data reset settings
- [ ] Keyboard board navigation and screen-reader announcements for every move
- [ ] Human translation/review for each locale currently marked machine draft
- [ ] Plural rules and localized names for all piece/rule help content
- [ ] Playlist per side and online synchronized listening after a real backend exists

### Engineering and release

- [ ] Migrate remaining `web/**/*.js` critical paths to strict TypeScript
- [ ] WebGL context-loss recovery, quality presets and memory/FPS soak tests
- [ ] Render-performance pass using instancing/shared piece geometry where useful
- [ ] Add a release-download panel that reads only actually published artifacts
- [ ] Generate release artifacts, then code-sign Windows/macOS and notarize macOS
- [ ] Run external device/manual accessibility testing before a stable release
