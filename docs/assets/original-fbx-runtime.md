# Original FBX runtime models

Cube Chess 512 loads the supplied `public/assets/original-chess-models/chess.fbx` file with Three.js `FBXLoader`.

The loader extracts the six chess-piece types by object name, clones them for each side, applies the game's white or black material, enables shadows, adds an outline and normalizes every piece to the same cell envelope:

- maximum height: `0.78`
- maximum width: `0.68`
- maximum depth: `0.68`
- base aligned to `Y = 0`
- centered on the local X/Z origin

Procedural pieces remain only as a loading and error fallback.
