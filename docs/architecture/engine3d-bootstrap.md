# Engine 3D bootstrap

## Current architecture

The repository currently contains a TypeScript library rather than a browser
application. Its public entry point is `src/index.ts`. It exports coordinate
helpers, an in-memory `Board3D`, piece and position types, pseudo-legal move
generation, move application, and layer-visibility helpers. The existing
8×8×8 move-generation implementation remains outside `src/engine3d` and is
intentionally untouched by this bootstrap.

Unit tests live in `test/engine.test.ts` and run with Vitest. `npm run build`
typechecks the TypeScript engine and produces the browser application bundle
with Vite. `npm run dev` serves the HTML entry point and visual application.

## Three.js integration points

The visual application loads Three.js as pinned native browser ESM modules via
the import map in `index.html`. Its renderer lives under `web/renderer/`; the
existing `src/rendering/visibility.ts` remains a future level-opacity policy.
The renderer consumes presentation state through `web/app/GamePresentation.js`
and does not import engine rule modules.
Unit tests live in `test/engine.test.ts` and run with Vitest. TypeScript emits
declarations and JavaScript to `dist`; `npm run build` invokes that compiler.
`npm run dev` uses Vite only as the local development server. There is no HTML
entry point or current browser UI in this checkout, so the server is a runtime
smoke check rather than a rendered game.

## Three.js integration points

There is no Three.js package, scene, renderer, model, or UI component in the
current checkout. The sole rendering-oriented module is
`src/rendering/visibility.ts`: it defines level opacity values and documents
the expected `THREE.Material` updates. A future renderer adapter should consume
engine state through the `src/engine3d/index.ts` public boundary, then map
engine coordinates to mesh transforms. It must not import rule modules into
rendering code.

## chess.js usage

Neither `package.json` nor `src/` currently references `chess.js`. Therefore
there is no chess.js integration to remove, replace, or alter in this
repository state. If a UI branch adds chess.js, retain it as the 2D-game
adapter until the 3D engine exposes an equivalent, tested integration contract.

## Safe migration plan to an 8×8×8 engine

1. Define immutable coordinate and board contracts in `coordinates/` and
   `board/`, with tests placed beside their modules.
2. Add state ownership and versioned serialization in `state/` and
   `serialization/`; keep state independent of Three.js objects.
3. Specify movement and legality separately in `moves/`, `pieces/`, and
   `rules/`. Establish test fixtures before implementing any piece movement.
4. Expose only reviewed, stable contracts from `src/engine3d/index.ts` and
   adapt the renderer at that boundary.
5. Run the 2D chess.js path and the 3D engine in parallel behind an explicit
   feature flag. Compare serialized states and test fixtures before switching
   gameplay or AI.
6. Add search and evaluation only after legal move generation and state
   serialization are stable; isolate those concerns in `ai/`.

The directories in this bootstrap are deliberately empty. They establish
ownership boundaries without introducing provisional rules or changing the
existing chess logic.
