# Implementation Backlog

GitHub Issues are currently disabled for this repository, so the planned work is tracked here until Issues are enabled.

## P0 — Core playable game

- [x] authoritative presentation/controller boundary using the engine for legality
- [x] side to move, White starts
- [x] block selection of opponent pieces
- [x] execute legal moves
- [x] captures
- [x] turn switching
- [x] game-over lock
- [x] pending cross-level move selection
- [x] move animation and camera tracking
- [x] history, undo and redo
- [x] new game without reload

## P0 — Responsive desktop and mobile UI

- [x] overlay desktop panel and compact control docks
- [x] mobile portrait and landscape layouts
- [x] tablet layout
- [x] fit board to view
- [x] camera zoom limits
- [x] safe-area support
- [x] no clipped menu or canvas in automated viewport tests

## P1 — Main menu

- [x] New Game
- [x] Save
- [x] Online status (honestly offline until hosted)
- [x] Settings foundation
- [x] Subscribe concept (no payments)
- [x] License
- [x] Help
- [x] About

## P1 — Internationalization

- [x] Polish and English technically complete
- [x] language picker
- [x] automatic detection
- [x] exact/base/English fallback
- [x] RTL
- [x] locale quality status
- [x] draft catalog for requested world languages
- [ ] human review of machine-draft catalogs

## P1 — Saves and replay

- [x] IndexedDB storage
- [x] JSON import/export
- [ ] replay timeline
- [ ] 3D FEN
- [ ] 3D PGN

## P1 — PWA

- [x] manifest
- [x] service worker
- [x] offline shell
- [x] update prompt
- [x] cache versioning

## P2 — Computer and AI modes

- [x] deterministic legal fallback and reproducible test path
- [x] minimax
- [x] alpha-beta
- [x] Web Worker
- [x] difficulty levels
- [ ] tutorial AI

## P2 — Online multiplayer

Planned region labels shown in UI, all with the annotation **Option under construction**:

1. Arctic
2. Europe
3. Asia
4. Africa
5. North America
6. South America
7. Australia
8. Antarctica

Backend work:

- [x] authoritative local test server
- [x] WebSocket
- [ ] lobby
- [ ] invites
- [x] reconnect identity and client backoff foundation
- [x] spectators
- [ ] anti-cheat
- [ ] moderation

## P2 — Attract-mode demo

- [x] separate demo controller
- [x] one-minute loop using legal engine moves
- [x] captured models outside board when captures occur
- [x] aura effect
- [ ] legal checkmate ending
- [x] loop and resource cleanup

## P3 — Desktop packages

- [x] Tauri evaluation and scaffold
- [x] Windows x64 workflow target
- [x] Linux x64 AppImage/`.deb` workflow targets
- [x] macOS Intel workflow target
- [x] macOS Apple Silicon workflow target
- [x] CI packaging configuration
- [ ] generate, inspect, sign and notarize real release artifacts

## P3 — Mini Computer 1/8

- [x] sandboxed-in-scope virtual tablet UI
- [x] game files
- [x] user-selected local media
- [x] safe external-browser adapter (no arbitrary embedded execution)
- [ ] CSP and allowlist
- [ ] threat model

## P3 — Subscription concept

- [x] Pro concept screen
- [x] no pay-to-win
- [x] no payment claims before implementation

## P3 — Accessibility

- [x] keyboard menu navigation and focus trap
- [x] high contrast
- [x] large text
- [x] reduced motion
- [x] screen-reader labels for the menu/control shell
- [x] minimum control sizing and viewport audit
- [ ] keyboard board navigation and complete move announcements

## P3 — Performance

- [ ] draw-call reduction
- [ ] shared materials and geometry
- [ ] device quality presets
- [ ] WebGL context loss recovery
- [ ] stress tests
- [ ] FPS diagnostics
