# High-detail owner-uploaded chess models

These browser assets are geometry-preserving derivatives of the six GLB models supplied by the repository owner. They replace the former 834–898 triangle runtime derivatives, whose silhouettes were visibly blocky at gameplay scale.

| Piece | Owner-supplied source | Source triangles | Runtime triangles | Runtime vertices |
| --- | --- | ---: | ---: | ---: |
| Pawn | `Meshy_AI_Steel_Pawn_0803204718_generate.glb` | 262,528 | 78,941 | 39,304 |
| Rook | `Meshy_AI_Titanium_Rook_0803204411_generate.glb` | 344,150 | 106,798 | 53,276 |
| Knight | `Meshy_AI_Faceted_Knight_0803200730_generate.glb` | 303,848 | 112,072 | 55,406 |
| Bishop | `Meshy_AI_Gunmetal_Bishop_0803204615_generate.glb` | 231,000 | 90,134 | 44,818 |
| Queen | `Meshy_AI_Obsidian_King_0808103127_generate.glb` | 256,142 | 91,668 | 45,546 |
| King | `Meshy_AI_Steel_King_0803204608_generate.glb` | 224,228 | 77,848 | 38,451 |

The Obsidian model is mapped to the queen because its pointed crown reads clearly as a queen. The separate Steel King retains the explicit cross.

## Browser format

The source positions are clustered on a fine 128–160 cell grid, averaged within each occupied cell, and rebuilt without degenerate or duplicate triangles. The result retains 77k–112k triangles per unique figure while keeping every vertex index within the portable 16-bit `CCM1` limit. Positions are quantized to unsigned 16-bit values; normals are reconstructed in the browser. Geometry is decoded once per type and shared by every board instance.

Run `scripts/build-high-detail-chess-assets.mjs` with `HIGH_DETAIL_CHESS_SOURCE_DIR` pointing to the six owner-supplied GLBs to reproduce the payloads and `build-report.json`.

## Provenance

The repository owner supplied the source files. Keep proof of generation and confirm the applicable Meshy account/license before commercial redistribution.
