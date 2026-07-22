# Cube Chess 512 AI — Full Product Roadmap

## Product vision

Cube Chess 512 AI is an open-source 8×8×8 chess platform with 512 addressable cells, a professional 3D interface, legal cross-level movement, local and online play, AI opponents, training tools, replay, saves, internationalization, PWA support and later native desktop packages.

The project also serves a broader research vision connected with Terraforming Planet: responsible use of AI for environmental observation, task coordination and human-supervised decision support. This vision is aspirational and must remain clearly separated from claims about currently deployed environmental protection systems.

## Delivery rule

Large features must be implemented as separate, reviewable Pull Requests. A feature is not marked complete until tests, build, documentation and manual validation pass.

## Phase 1 — Fully playable local game

Priority: critical.

- authoritative `GameController`
- side to move, with White starting
- selecting only pieces belonging to the active player
- executing engine-approved moves
- captures
- turn switching
- check, checkmate and stalemate integration
- cross-level move selection with `pendingMoveSelection`
- move animation and camera tracking
- move history
- undo and redo
- new game without page reload
- responsive desktop and mobile layout
- `Fit Board to View`
- Polish and English localization foundation
- local save and load

## Phase 2 — Main menu and navigation

The start screen contains eight entries:

1. New Game
2. Save
3. Online
4. Settings
5. Subscribe
6. License
7. Help
8. About

Each entry opens an accessible panel with keyboard, touch and screen-reader support.

## Phase 3 — Internationalization

Initial language catalog:

- Polish
- English
- German
- French
- Spanish
- Portuguese
- Italian
- Ukrainian
- Russian
- Arabic
- Hebrew
- Turkish
- Persian
- Hindi
- Bengali
- Urdu
- Simplified Chinese
- Traditional Chinese
- Japanese
- Korean
- Indonesian
- Vietnamese
- Thai
- Swahili
- Afrikaans

Availability is based on language and user preference, not political recognition of states or territories. The application is intended to be available to users worldwide, including users in Palestine and other territories.

Polish and English must be complete. Other locales may begin as clearly marked drafts with quality status: `verified`, `machine-draft`, or `incomplete`.

## Phase 4 — Online architecture

The UI may display eight planned server regions, but must not pretend that production servers already exist.

1. Arctic — option under construction
2. Europe — option under construction
3. Asia — option under construction
4. Africa — option under construction
5. North America — option under construction
6. South America — option under construction
7. Australia — option under construction
8. Antarctica — option under construction

Future backend requirements:

- authoritative move validation
- WebSocket sessions
- lobby and invitations
- reconnect and sequence numbers
- spectator mode
- moderation and rate limiting
- anti-cheat controls
- regional matchmaking

## Phase 5 — AI modes

- local two-player
- deterministic computer opponent
- minimax and alpha-beta
- iterative deepening
- Web Worker execution
- configurable difficulty
- tutorial AI explaining legal movement and check rules
- advanced AI architecture for later evaluation and search improvements

## Phase 6 — Save, replay and formats

- IndexedDB save storage
- JSON import/export
- replay timeline
- move list
- 3D FEN design
- 3D PGN design
- versioned schemas
- future cloud synchronization

## Phase 7 — Attract-mode demo

The start menu may show a one-minute looping demonstration:

- separate demo game state
- legal alternating moves
- cross-level action
- camera tracking
- captured-piece display outside the 512-cell board
- short legal checkmate ending
- automatic reset
- pause when the page is hidden
- disable for reduced-motion users

## Phase 8 — Mini Computer 1/8

A sandboxed optional panel styled as a small tablet next to the board.

Planned modules:

- My Computer
- Game Files
- Browser
- Media
- Settings

Security requirements:

- no unrestricted system-file access
- sandboxed embeds
- allowlist and CSP
- no password storage
- no execution of arbitrary untrusted HTML
- respect third-party embedding restrictions

## Phase 9 — Subscription concept

`Cube Chess Pro` remains a product concept until a compliant backend and payment system exist.

Possible non-pay-to-win features:

- additional visual themes
- advanced game analysis
- extended replays
- private rooms
- statistics
- synchronized saves

## Phase 10 — PWA and desktop

Web targets:

- Chrome and Chromium
- Firefox
- Safari
- Edge
- Android browsers
- iOS Safari

PWA:

- manifest
- service worker
- offline shell
- update notification
- cache versioning

Desktop packaging should reuse the same codebase. Evaluate Tauri 2 first, with Electron as fallback.

Targets:

- Windows x64
- Linux x64
- macOS Intel
- macOS Apple Silicon

## Phase 11 — Accessibility and performance

- keyboard navigation
- minimum touch target size 44×44 px
- RTL support
- high contrast
- large text
- reduced motion
- WebGL context-loss recovery
- device quality presets
- FPS and draw-call diagnostics
- stress and regression tests

## About and mission text requirements

The About page should state that:

- Cube Chess 512 is an original concept by Sebastian Laskowski
- the project expands classical chess into three dimensions
- it is developed as open source
- it is connected to the wider Terraforming Planet vision
- future research may explore eight AI agents, one per level, with up to 64 tasks per agent
- environmental applications require scientific validation, risk assessment, legal compliance and human oversight
- OpenAI is thanked for creating tools that enabled the author to learn and build the project
- no official partnership, endorsement or funding by OpenAI is implied

Contact for Help:

- xodobrox@gmail.com
