# Meshy chess model derivatives

These assets are mobile-safe derivatives of six GLB files supplied by the repository owner on 2026-08-04.

| Runtime piece | Supplied file | Original triangles | Runtime triangles | Runtime vertices |
| --- | --- | ---: | ---: | ---: |
| Pawn | `Meshy_AI_Steel_Pawn_0803204718_generate.glb` | 262,528 | 860 | 409 |
| Rook | `Meshy_AI_Titanium_Rook_0803204411_generate.glb` | 344,150 | 860 | 416 |
| Knight | `Meshy_AI_Faceted_Knight_0803200730_generate.glb` | 303,848 | 834 | 405 |
| Bishop | `Meshy_AI_Gunmetal_Bishop_0803204615_generate.glb` | 231,000 | 898 | 427 |
| Queen | `Meshy_AI_Obsidian_King_0803204627_generate.glb` | 256,142 | 866 | 416 |
| King | `Meshy_AI_Steel_King_0803204608_generate.glb` | 224,228 | 846 | 410 |

The Obsidian asset is used for the queen because its pointed crown reads as a queen, while the Steel King has an explicit cross and is used for the king.

## Runtime format

`CCM1` stores a 36-byte little-endian header, quantized `uint16` XYZ positions and `uint16` triangle indices. Each payload is stored as one Base64 text asset for reliable GitHub Pages, Vite, Tauri and PWA delivery without Git LFS. The browser validates counts and bounds before creating a shared Three.js `BufferGeometry` and computes vertex normals at load time.

Raw GLB files are intentionally not committed because they total roughly 29 MB and contain 224k–344k triangles each. The six compact runtime payloads total roughly 46 KB before Base64 encoding.

## Provenance

The repository owner supplied the source files. Before commercial store distribution, retain proof of generation and confirm that the applicable Meshy account/license permits redistribution of generated 3D assets under the game's release terms.
