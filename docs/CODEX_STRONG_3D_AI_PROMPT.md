# Codex task — strong promotion-aware Cube Chess 512 AI

## Role

Act as a Senior Chess Engine Engineer. Improve the existing production engine; do not create a separate prototype or replace the authoritative move generator.

## Authoritative Cube Chess rules

- The board is 8×8×8 = 512 fields, with levels A–H.
- Current movement geometry in `DirectionVectors.ts` and `PawnMoveGenerator.ts` is authoritative.
- Rook: 6 straight axes.
- Bishop: classical x-y diagonals and full x-y-z diagonals. Do not restore removed x-z/y-z bishop rays.
- Queen: all 26 non-zero 3D directions.
- King: 26 adjacent directions.
- Knight: 24 offsets shaped 2-1-0.
- Pawns use the current rank, height and rank-plus-height advances; both armies climb A→H.
- Promotion occurs on the classical final rank on levels A–G or immediately after any legal move onto level H.
- The current AI promotes to a queen unless a future underpromotion search proves another piece is forced or superior.
- Do not change legal movement rules in this task.

## Required corrections

1. Search simulation must replace a promoted pawn immediately. A pawn on a promotion square must never remain a pawn inside Alpha-Beta or quiescence.
2. Use Cube Chess material values informed by the mobility of the current 8×8×8 geometry, without allowing raw mobility to override king safety or forced tactics.
3. Prevent voluntary queen, rook, bishop or knight sacrifices for a pawn unless search proves compensation, promotion, mate or a larger material recovery.
4. Replace linear pawn-progress rewards with diminishing development rewards and overextension penalties.
5. Prefer coordinated development, defended pieces, king safety, connected pawns and useful control of several levels.
6. Root heuristics may order moves only. They must never be added to or replace the completed Minimax/Alpha-Beta score.
7. Preserve iterative deepening, Alpha-Beta, quiescence, transposition table, killer/history heuristics and Web Worker execution.
8. Keep hard AI deterministic.

## Required implementation contract

- Use one shared `applyMoveForSearch(board, move)` helper in ordinary and advanced search.
- Detect promotion from the moving pawn and destination, even when `move.kind` is `quiet` or `capture`.
- Include inferred promotions in tactical move ordering and quiescence.
- Keep the production promotion UI and save/undo system backward compatible.

## Acceptance tests

- A pawn entering level H becomes a queen in the search board.
- A pawn reaching the classical final rank on levels A–G becomes a queen in the search board.
- An ordinary pawn move remains a pawn.
- A safe rook evaluates above a rook hanging to a pawn.
- Hard AI refuses a rook-for-pawn capture when the opponent has a forced queen recapture.
- Coordinated minor-piece development evaluates above an unsupported pawn march.
- Existing movement, check, mate, promotion, multiplayer, build and E2E tests remain green.

## Pull request requirements

Use a separate Draft PR. Document the root cause, 3D material model, risk and manual full-game test. Do not merge before green typecheck, unit tests, production build and mobile verification against hard AI.
