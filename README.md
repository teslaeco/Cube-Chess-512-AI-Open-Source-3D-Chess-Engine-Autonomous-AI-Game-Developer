# Cube Chess 512 AI

[Open the live Cube Chess 512 browser build](https://teslaeco.github.io/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/)

Cube Chess 512 is an open-source TypeScript foundation for 8×8×8 chess. The
browser renderer presents one continuous cubic lattice containing 512 selectable
cells: eight levels, each containing a complete 8×8 board. It uses procedural
Three.js pieces, lighting, shadows, an orbit camera, raycast selection, and a
responsive HUD.

## Run locally

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

## GitHub Pages deployment

The workflow in `.github/workflows/deploy-pages.yml` validates and publishes the
production `dist` directory after every push to `main`. The public site is:

https://teslaeco.github.io/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/

The repository must use **GitHub Actions** as the Pages publishing source under
**Settings → Pages → Build and deployment**.

## Three.js delivery

The browser loads pinned Three.js `0.169.0` native ESM modules from jsDelivr via
the import map in `index.html`. This deliberately avoids adding `three` or
`@types/three` to npm. The import map exposes `three` and `three/addons/`, and
`OrbitControls` is imported as an ESM addon. A future release may migrate the
pinned CDN imports to local npm dependencies while retaining the same renderer
module API.

## Current status

- `src/engine3d` is independent from Three.js and DOM code.
- The engine defines canonical 8×8×8 movement geometry.
- The rules layer detects attacked cells, check, legal moves, checkmate, and
  stalemate.
- `web/app/GamePresentation.js` is the serializable presentation boundary.
- The renderer displays a true 8×8×8 lattice with exactly 512 cubic cells.
- The classic 32-piece starting arrangement is currently placed on level A.
- Pieces are procedural Three.js geometry groups; no 2D chess-piece images are
  used.

## Current limitations

The browser interface does not yet execute engine-approved moves. Undo/redo,
turn state, promotion, castling, en passant, persistence, multiplayer, and AI
remain future stages. The end-user browser requires internet access to load the
pinned Three.js CDN modules.

## Next stage

The next implementation stage is a complete game-state controller with turns,
move history, undo, and a strict command boundary between the browser UI and the
engine.
