# Next step: Three.js renderer integration

## Verified baseline

The current repository is a buildable, renderer-independent TypeScript starter
for Cube Chess 512. The root library entry point exports the 8×8×8 board,
coordinates, piece and position types, pseudo-legal movement generation, move
application, and layer-visibility policy. Its existing Vitest suite covers
coordinate notation and representative 3D movement. The `src/engine3d/`
directory is an intentionally empty ownership boundary for the next engine
implementation phase; it does not replace the working starter modules yet.

The baseline has no external browser application dependency. It builds with
TypeScript, and Vite is available as the development-server command. Existing
engine modules and tests must remain authoritative until their replacements
have equivalent contracts and regression coverage.

## What is currently missing

No browser-facing game application is present in this repository. In
particular, it does not yet contain:

- an HTML application entry point and browser bootstrap module;
- Three.js and its rendering loop;
- a scene graph, WebGL renderer, lights, camera, or camera controls;
- board-square meshes, layer framing, piece meshes, model loading, textures,
  or public assets;
- pointer/raycast selection, move highlighting, animation, UI, or game-state
  presentation;
- a chess.js adapter or any other bridge for a legacy 2D game;
- an AI worker, worker protocol, or search integration;
- legal-move validation, check/checkmate, special moves, a complete pawn-rule
  specification, or an 8-layer starting position.

## Required module boundaries

The integration must preserve a one-way dependency direction: browser and
renderer code may depend on an adapter contract, but the engine must never
depend on `THREE.Object3D`, DOM types, loaded assets, or UI state.

| Module | Responsibility | Allowed dependencies |
| --- | --- | --- |
| `src/engine3d/coordinates` | 3D coordinate value objects and notation | shared engine types only |
| `src/engine3d/board` | 512-square occupancy and board queries | coordinates, state |
| `src/engine3d/pieces`, `moves`, `rules` | piece definitions, move descriptions, legality | engine modules only |
| `src/engine3d/state` | immutable game state and turn transitions | engine modules only |
| `src/engine3d/serialization` | versioned state interchange | state and coordinates |
| `src/engine3d/ai` | evaluation/search and a future worker protocol | engine modules only |
| future application adapter | maps an engine snapshot to presentation data | public engine API only |
| future Three.js renderer | scene lifecycle, meshes, interactions, animation | adapter contract and Three.js |
| future chess.js adapter | isolates legacy 2D chess.js state and commands | chess.js plus adapter contract |

The existing root starter modules (`src/board.ts`, `src/coord.ts`,
`src/movement.ts`, `src/applyMove.ts`, and `src/types.ts`) remain intact during
this transition. A future implementation may migrate their validated behavior
behind the `src/engine3d/index.ts` public API incrementally; it must not
silently fork two sources of truth for the same game state.

## Renderer integration design

1. Add the real browser application source, HTML entry point, assets, and
   dependency versions only when the approved upstream renderer source is
   available locally.
2. Add a small application-facing `GamePresentation` adapter. It should expose
   serializable board squares, pieces, selection, and legal-target data rather
   than engine `Map` instances or Three.js objects.
3. Initialize a Three.js scene in the application layer with renderer, camera,
   controls, lighting, and resize/disposal handling. Keep this lifecycle out of
   the engine.
4. Render board levels and pieces from `GamePresentation`. Use the existing
   `opacityForLevel` policy as the adapter point for layer visibility; do not
   mutate engine state to fade meshes.
5. Convert raycast hits to coordinate intents in the UI layer. Submit intents
   to the adapter, validate them in the engine, then re-render the resulting
   immutable state.
6. Keep legacy chess.js behind its own adapter until the 3D engine provides
   tested equivalent rules. Renderer code must not import chess.js directly.

## Transition from a classical board to 8×8×8

The visual transition must be additive. First render exactly one conventional
8×8 level from an engine snapshot, retaining the original assets, visual
scale, lighting, camera behavior, and chess.js interaction flow. Then add
level-aware scene grouping without changing the single-level presentation.

Once the engine has a tested 3D initial state and legal-move contract, make
the active level configurable. Render adjacent and distant levels using the
existing visibility policy, while pieces remain fully opaque. Only after
selection, camera controls, move highlighting, serialization, and undo/redo
work across all coordinates should the application expose all eight layers.
This staged approach makes every visual change independently reversible and
keeps 2D gameplay available as a reference path.

## Implementation order

1. Acquire the approved upstream application source and record its provenance
   and complete MIT license text in `THIRD_PARTY_NOTICES.md` before copying any
   files.
2. Integrate the upstream application unchanged enough to run its original
   2D/3D functionality; add build, test, typecheck, and development scripts
   without removing the current engine tests.
3. Establish the presentation and chess.js adapter boundaries, with smoke tests
   for browser-module import and unit tests for adapter transformations.
4. Formalize engine coordinate, board, state, and serialization contracts in
   `src/engine3d`, using regression tests based on the existing starter.
5. Implement and test complete 3D movement and legality before wiring those
   rules into any UI interaction.
6. Add renderer support for a single engine-driven level, then progressively
   add layer grouping, visibility, multi-level selection, and an 8×8×8 setup.
7. Add AI/worker integration only after state serialization and legal move
   generation are stable.

## Definition of ready for the renderer-import stage

Before importing an external renderer, this repository is ready when `npm
install`, `npm run build`, `npm run test`, and `npm run typecheck` pass from a
clean checkout, the existing engine test suite is preserved, and the renderer
is introduced exclusively through the boundaries above. The current baseline
meets those repository-side conditions; upstream assets and source remain the
sole missing prerequisite.
