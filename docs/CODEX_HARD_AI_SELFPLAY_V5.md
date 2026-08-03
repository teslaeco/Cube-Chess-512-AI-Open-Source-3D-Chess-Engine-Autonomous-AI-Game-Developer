# Codex task — final runtime blunder veto and self-play validation

## Role
Act as a senior chess-engine and game-runtime engineer. Improve the existing Cube Chess 512 production AI. Do not replace the authoritative move generator, legal-move rules, renderer, saves, multiplayer, promotion UI or current Alpha-Beta engine.

## Confirmed production defect
A computer queen can still capture a low-value pawn on a square where the player has an immediate legal recapture. Earlier root filtering is insufficient because the final Worker/variant fallback path can return a move after the search and because a difficulty mismatch can bypass hard-only policy.

## Required architecture
1. Add a final, independent safety gate in the Worker immediately before a move is posted to the game.
2. Apply the immediate-material blunder veto to every difficulty. Easy may play positionally weak moves, but it must not hang a queen, rook, bishop or knight for a pawn in one move.
3. Reconstruct the authoritative legal move from piece id and from/to coordinates. Never trust only serialized metadata.
4. After applying the candidate move, generate all legal opponent replies. If any reply immediately captures the moved guarded piece, compare the captured value against the moved piece value.
5. Reject a candidate when the exchange is materially unsound. A queen must not be exchanged for a rook, bishop, knight or pawn; a rook must not be exchanged for a pawn; minor pieces must not be exchanged for a pawn without compensation.
6. Preserve only these exceptions:
   - the candidate immediately checkmates,
   - the immediate capture is materially equal or winning within a small tolerance,
   - the existing strict level-G to level-H promotion exception remains provably legal after every recapture,
   - no safe legal move exists, in which case the engine must still return a legal move.
7. If the searched move is vetoed, rerun hard search using only safe root candidates. For easy/medium, select the best ordered safe candidate.
8. Add diagnostics: policy version, veto applied, rejected move, number of safe candidates and build/runtime policy id.
9. Keep deterministic behavior and Worker cancellation.

## Required validation
- Unit test: queen captures pawn and is immediately recaptured — veto.
- Unit test: rook captures queen and is recaptured — allow because material is won.
- Unit test: bishop/knight for pawn — veto.
- Integration test through `chooseMoveWithVariantRules`, including variant fallback.
- Deterministic safety-training suite with at least 3,000 generated tactical episodes using real legal-move generation.
- Self-play smoke suite covering both colors and several opening seeds.
- Existing typecheck, unit tests, build and production smoke test remain green.

## Pull request
Use a separate Draft PR. Document root cause, risk, test count and runtime cost. Do not merge until all checks are green and the generated training report confirms zero accepted immediate high-value-for-low-value blunders.
