# Original chess model source

This directory is reserved for the original public chess models supplied by the project owner.

## Supplied archive inspection

The uploaded archive `uqxyw8icneo0-chess.rar` was successfully unpacked. It contains one Autodesk 3ds Max source file:

- `chess.max`
- uncompressed size: 15,712,256 bytes
- SHA-256: `0516c315dd036b90de64c121b0ff00a5d7b7a2ccdcb022c6281acd3bf7a02df7`

Original archive SHA-256:

- `f4ed5ab92e029cfeead3fee0954b310fca6d3311fec7c9434d1d98651c4e24d3`

## Required conversion before browser use

A `.max` file cannot be loaded directly by Three.js or a web browser. Open the source in Autodesk 3ds Max or Blender with a compatible importer and export the six piece types as GLB files:

- `pawn.glb`
- `rook.glb`
- `knight.glb`
- `bishop.glb`
- `queen.glb`
- `king.glb`

The exported files must preserve their original proportions, use a common origin at the centre of the base, rest on `Y = 0`, and face the same direction. They should then be placed in this directory and loaded by the renderer with automatic per-cell normalization.

Do not replace these assets with procedural fallback geometry in production.