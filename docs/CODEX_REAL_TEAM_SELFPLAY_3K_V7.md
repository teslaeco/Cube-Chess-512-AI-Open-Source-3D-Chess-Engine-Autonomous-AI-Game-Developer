# Codex task — real squad self-play and queen exchange safety v7

## Role

Act as the senior AI/engine team for Cube Chess 512. Work only in a dedicated pull request. Preserve the authoritative 8×8×8 rules and all existing promotion, king-safety and multiplayer behavior.

## Critical production defect

The hard AI can repeatedly move the queen and can exchange the queen for a knight or pawn. A queen-for-lower-piece exchange is a release-blocking defect unless one of these conditions is proven by legal search:

1. the move checkmates immediately,
2. a bounded static exchange sequence recovers sufficient material,
3. the existing level-seven promotion exception gives sufficient concrete compensation.

Never treat an unproven sacrifice, activity bonus or team-play bonus as material compensation.

## Required architecture

1. Use one authoritative static-exchange evaluator at both the search root and the final Worker boundary.
2. Resolve captured pieces by `capturedPieceId`, not only by the destination square.
3. Prevent fallback logic from reintroducing a queen-for-pawn, queen-for-knight, queen-for-bishop or queen-for-rook blunder.
4. Do not classify every capture as a forcing move. Checks, mates and promotions may bypass team-play tie-breaks; ordinary captures remain subject to the normal strategic comparison.
5. Track the complete recent-piece window, not only consecutive repetitions.
6. Penalize queen monopoly and repeated use of one piece during quiet play.
7. Reward:
   - fresh-piece development,
   - mutual defence,
   - support for the previously moved piece,
   - two or more pieces attacking the same enemy target,
   - moves that increase the number of active pieces and covered board levels.
8. Alpha-Beta and material score remain authoritative outside a narrow equivalence window.

## Real training requirement

Replace synthetic feature-only training as the merge gate with at least 3,000 real legal hard-AI self-play games:

- 1,000 games for each candidate policy,
- identical deterministic opening seeds for every candidate,
- real `Board3D` states,
- real legal move generation,
- real Worker safety enforcement,
- at least 18 hard-AI plies per game unless the game ends,
- no fabricated move candidates or synthetic feature vectors.

The report must include:

- total real games and plies,
- queen move rate,
- quiet queen move rate,
- average distinct pieces used per side,
- coordinated-team move rate,
- fresh-piece move rate,
- quiet three-move same-piece violations,
- unsafe material decisions,
- forced unsafe fallbacks,
- queen-for-lower-piece losses on the opponent's immediate reply.

## Mandatory regressions

Add tests proving that:

- queen for pawn with a legal recapture is rejected,
- queen for knight with a legal recapture is rejected,
- queen for rook with a legal recapture is rejected under Cube Chess values,
- rook for queen remains accepted,
- the final Worker replaces a selected queen-for-knight move with a safe legal move,
- a capture is not automatically classified as forcing,
- queen monopoly is scored substantially below a fresh coordinated squad move,
- real-board hard self-play uses more than one piece and never bypasses the final safety gate.

## Merge gate

Do not merge unless all conditions are true:

- typecheck passes,
- full unit and regression suite passes,
- production build and smoke test pass,
- the real 3,000-game workflow passes,
- critical queen-trade violations equal zero,
- unsafe material decisions equal zero,
- forced unsafe fallbacks equal zero,
- production team-move rate is higher than the legacy `balanced-v6` baseline,
- production policy wins the real self-play ranking.

Document the exact result and remaining risk in the pull request. Do not claim neural-network training; this is deterministic policy tuning and validation of the Alpha-Beta engine.
