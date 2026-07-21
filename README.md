# Cube Chess 512 AI

> Screenshot placeholder: run the browser application to view the current Level A board.

Cube Chess 512 is an open-source TypeScript foundation for 8×8×8 chess. This
stage includes a working browser visualizer: a single classical 8×8 board
(`Layer A`) with procedural Three.js pieces, lighting, shadows, orbit camera,
raycast selection, and a responsive HUD.

## Run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To validate the repository:

```bash
npm run build
npm run test
npm run typecheck
```

## Three.js delivery

The browser loads pinned Three.js `0.169.0` native ESM modules from jsDelivr via
the import map in `index.html`. This deliberately avoids adding `three` or
`@types/three` to npm while registry installation is unavailable. The import
map exposes `three` and `three/addons/`, and `OrbitControls` is imported as an
ESM addon. Future releases should migrate the pinned CDN imports to local npm
dependencies, lock their versions, and retain the same renderer module API.

## Current status

- The independent Cube Chess 512 starter engine remains in `src/` and its
  existing tests remain in `test/`.
- `web/app/GamePresentation.js` is the presentation boundary: it supplies a
  serializable snapshot to the renderer and contains no movement rules.
- The visual application currently renders only level A (64 visible squares of
  the eventual 512), with a normal 32-piece starting arrangement.
- Figures are real Three.js geometry groups; no external models, textures, or
  2D chess-piece images are used.

## Current limitations

Movement, captures, legal-move generation in the UI, AI, check/checkmate,
undo/redo, persistence, and levels B–H are intentionally disabled. Selecting a
piece or square changes only presentation state. The renderer needs internet
access in the end-user browser to load the pinned Three.js CDN modules.

## Next stage

The next implementation step is to formalize the engine contracts behind
`src/engine3d`, add a tested presentation adapter for engine state, and render
additional levels without importing game rules into renderer modules. See
[`docs/architecture/browser-renderer.md`](docs/architecture/browser-renderer.md)
for the lifecycle and module-boundary design.
