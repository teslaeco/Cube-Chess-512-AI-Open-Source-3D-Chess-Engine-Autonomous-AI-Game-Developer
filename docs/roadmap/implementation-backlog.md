# Implementation Backlog

GitHub Issues are currently disabled for this repository, so the planned work is tracked here until Issues are enabled.

## P0 — Core playable game

- [ ] authoritative GameController
- [ ] side to move, White starts
- [ ] block selection of opponent pieces
- [ ] execute legal moves
- [ ] captures
- [ ] turn switching
- [ ] game-over lock
- [ ] pending cross-level move selection
- [ ] move animation and camera tracking
- [ ] history, undo and redo
- [ ] new game without reload

## P0 — Responsive desktop and mobile UI

- [ ] collapsible desktop panel
- [ ] mobile portrait and landscape layouts
- [ ] tablet layout
- [ ] fit board to view
- [ ] camera zoom limits
- [ ] safe-area support
- [ ] no clipped menu or canvas

## P1 — Main menu

- [ ] New Game
- [ ] Save
- [ ] Online
- [ ] Settings
- [ ] Subscribe
- [ ] License
- [ ] Help
- [ ] About

## P1 — Internationalization

- [ ] Polish and English complete
- [ ] language picker
- [ ] automatic detection
- [ ] fallback
- [ ] RTL
- [ ] locale quality status
- [ ] draft catalog for requested world languages

## P1 — Saves and replay

- [ ] IndexedDB storage
- [ ] JSON import/export
- [ ] replay timeline
- [ ] 3D FEN
- [ ] 3D PGN

## P1 — PWA

- [ ] manifest
- [ ] service worker
- [ ] offline shell
- [ ] update prompt
- [ ] cache versioning

## P2 — Computer and AI modes

- [ ] deterministic computer opponent
- [ ] minimax
- [ ] alpha-beta
- [ ] Web Worker
- [ ] difficulty levels
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

- [ ] authoritative server
- [ ] WebSocket
- [ ] lobby
- [ ] invites
- [ ] reconnect
- [ ] spectators
- [ ] anti-cheat
- [ ] moderation

## P2 — Attract-mode demo

- [ ] separate demo controller
- [ ] one-minute legal 3D game
- [ ] captures outside board
- [ ] aura effect
- [ ] legal checkmate ending
- [ ] loop and resource cleanup

## P3 — Desktop packages

- [ ] Tauri evaluation
- [ ] Windows x64
- [ ] Linux x64
- [ ] macOS Intel
- [ ] macOS Apple Silicon
- [ ] CI packaging

## P3 — Mini Computer 1/8

- [ ] sandboxed tablet UI
- [ ] game files
- [ ] media
- [ ] safe browser adapter
- [ ] CSP and allowlist
- [ ] threat model

## P3 — Subscription concept

- [ ] Pro concept screen
- [ ] no pay-to-win
- [ ] no payment claims before implementation

## P3 — Accessibility

- [ ] keyboard
- [ ] high contrast
- [ ] large text
- [ ] reduced motion
- [ ] screen-reader labels
- [ ] touch target audit

## P3 — Performance

- [ ] draw-call reduction
- [ ] shared materials and geometry
- [ ] device quality presets
- [ ] WebGL context loss recovery
- [ ] stress tests
- [ ] FPS diagnostics
