# Cube Chess 512 AI

[Play the current browser release](https://teslaeco.github.io/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/)

Cube Chess 512 AI is an open-source 8×8×8 chess project. One continuous 3D
lattice contains 512 addressable cells across levels A–H. The rules engine is
kept independent from Three.js and the browser UI.

![Desktop main menu](docs/audits/screenshots/desktop-main-menu.png)

## Working in this branch

- legal pointer and touch moves, captures, turn changes, check, checkmate and
  stalemate;
- legal cross-level movement with persistent highlights, a path guide, piece
  animation and camera tracking;
- corrected upward pawn movement for both colours and diagonal-only bishops;
- undo, redo, exact state restoration and versioned local saves in IndexedDB;
- an eight-section start menu, local two-player mode and a Web Worker computer
  opponent with three search limits;
- a legal engine-driven attract demo that stops when a real game starts;
- responsive desktop, phone and tablet layouts, keyboard focus handling, RTL,
  high contrast, large text and reduced-motion preferences;
- 38 BCP 47 locale choices, including `ar-PS`. Polish and English are complete;
  other languages are explicitly labelled machine drafts and fall back to
  English for untranslated copy;
- an optional, sandboxed-in-scope Mini Computer 1/8 for game saves, safe
  external search and user-selected local audio;
- a PWA shell, a local authoritative WebSocket test server and Tauri 2 release
  configuration for Windows, Linux and both macOS architectures.

The [implementation checklist](docs/tasks/major-playability-product-upgrade.md)
separates completed work from unfinished product features. In particular, the
public GitHub Pages site does **not** claim that multiplayer regions, payments,
signed desktop binaries or human-verified global translations are live.

## Run the web game

```bash
npm ci
npm run dev
```

Use the URL printed by Vite. To validate a production build:

```bash
npm run typecheck
npm run test
npm run build
npm run smoke:dist
```

Three.js `0.169.0` is a pinned npm dependency. The built game no longer needs a
runtime CDN connection.

## Browser interaction tests

```bash
npx playwright install chromium firefox webkit
npm run test:e2e
```

The test matrix covers Chromium, Firefox and WebKit on desktop, phone and tablet
profiles. Tests click projected Three.js objects through the real canvas rather
than calling presentation methods as a substitute for user input.

## Local multiplayer test server

```bash
npm run server:start
```

The server listens on `127.0.0.1:8787` by default. It exposes `/health` and
`/regions`, validates room moves against the authoritative engine and supports
room rejoin, spectators and sequence numbers. It is development infrastructure,
not eight deployed production servers. See
[the server guide](docs/online-test-server.md).

## PWA and desktop

The web build contains a manifest, versioned service worker, local icon and
offline shell. Tauri development uses the same UI:

```bash
npm run desktop:dev
npm run desktop:build
```

The release workflow prepares draft, unsigned prerelease artifacts for Windows
x64, Linux x64, macOS Intel and macOS Apple Silicon. Signing, notarization and a
real release tag remain owner-operated steps. See
[the desktop build guide](docs/desktop-builds.md).

## Deployment

`.github/workflows/deploy-pages.yml` is the only Pages publisher. It runs unit,
integration, browser and production-artifact smoke tests before deploying
`dist`. Pages must use **GitHub Actions** under **Settings → Pages → Build and
deployment**.

## Project status and boundaries

The game is now interactively playable, but the broader roadmap is not finished.
Replay navigation, a teaching/explanation layer, a curated demo ending in a
proved checkmate, hosted multiplayer/lobbies, full settings, strict typing of
the remaining JavaScript UI, signed desktop installers and professional review
of draft translations remain open work. See the
[audit](docs/audits/playability-and-ui-audit.md) and
[roadmap](docs/roadmap/full-product-roadmap.md).

Cube Chess 512 AI is licensed under the MIT License. The original 8×8×8 game
concept is by Sebastian Laskowski.
