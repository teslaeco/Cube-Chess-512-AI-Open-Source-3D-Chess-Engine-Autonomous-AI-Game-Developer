# Browser renderer architecture

## Module flow

The browser application is deliberately separate from the TypeScript starter
engine. `web/state/initialPosition.js` and `web/renderer/coordinates.js` are
pure, testable presentation-data modules. `web/app/GamePresentation.js` owns a
serializable display snapshot. It is the only future integration point from
engine state into the visual application.

`CubeChessApplication` composes the presentation state, HUD, and renderer.
`ChessRenderer` composes scene, camera, board, piece, and selection controllers.
The renderer modules never import `movement.ts`, `applyMove.ts`, rules, or AI.
When game-state integration is introduced, an application adapter will convert
the public engine API into the presentation snapshot before rendering.

## Lifecycle and resources

`SceneController` owns the WebGL renderer, scene, fog, lights, shadow settings,
and ground. `CameraController` owns `PerspectiveCamera` and `OrbitControls`.
`ChessRenderer` owns the animation frame, resize listener, raycast controller,
and renderer children. Its `dispose()` method cancels animation, removes event
listeners, disposes controls/geometries/materials, and disposes the WebGL
renderer. Device pixel ratio is capped at two for mobile rendering cost.

## Coordinates and layers

`coordinates.js` validates `x`, `y`, and `z` in the range 0–7 and produces a
canonical address such as `A:e4`. It defines 8 board squares per axis, 8 total
levels, 512 total cube squares, square sizing, and level spacing. The first
renderer instance creates only level index zero as a `THREE.Group` named Level
A. The same address and position API accepts levels B–H, so later layers can be
added without redefining coordinate mapping.

## Browser module delivery

`index.html` loads Three.js and addons through a pinned native ESM import map.
No global `window.THREE` or legacy script tag is used. This bypasses the current
npm installation limitation, but it means production browsers must be allowed
to request the CDN. A later migration can replace the import-map addresses with
locally installed package paths while preserving module specifiers.
