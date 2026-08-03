# Codex Task — Classical 3D Search Engine V8

## Role

Act as the Lead Chess Engine Engineer for Cube Chess 512 AI. Treat this as production engine work, not a prototype and not a cosmetic heuristic patch.

## Product context

Cube Chess 512 is played on an 8 × 8 × 8 board containing 512 cells. The rules extend classical chess movement into the third dimension. The engine must reason about length, width and height, cross-level attacks, 3D king safety, promotion on the project-defined terminal planes, and a much larger branching factor than ordinary chess.

The intended design follows the foundations of the earliest serious chess programs:

1. encode the rules and generate legal moves,
2. create temporary board states,
3. evaluate positions,
4. search the opponent's best replies with Minimax / Alpha-Beta,
5. select the best result from a fully completed search iteration.

Do not attempt to store every possible game. Self-play is used to test and tune the engine, not to replace correct rules, search and evaluation.

## Critical user-reported defect

On the live game, `easy` can appear more sensible than `hard`. `hard` may repeatedly move the queen or one piece and fail to build a coordinated attack.

The current advanced engine initializes its answer from move ordering and may return that provisional move when the first iterative-deepening pass times out. On a 512-cell board, depth one may be interrupted because each leaf evaluation is expensive. This means `hard` can return a move that was ordered first rather than a move that completed a real comparison across all root candidates.

This is release-blocking.

## Required architecture

### 1. Guaranteed completed root baseline

Before recursive Alpha-Beta starts, evaluate every safe legal root move with a bounded, deterministic static root pass.

The baseline must:

- inspect every permitted root candidate,
- apply the move to a cloned board,
- use material, 3D positional value and team-play features,
- preserve checkmate, decisive capture, promotion and king-safety priorities,
- finish independently of the deep-search time budget,
- become the fallback result when no recursive depth completes.

Never return `orderMoves(...)[0]` merely because the clock expired.

### 2. Correct iterative deepening

- Commit a new principal variation only after the entire root iteration completes.
- If an iteration is interrupted, keep the result of the last fully completed iteration.
- Expose diagnostics: baseline completed, baseline candidate count, completed recursive depth, timeout/abort reason and result source.
- Move ordering may improve speed but must never be treated as the final decision.

### 3. Team play belongs in position evaluation

Do not rely only on a root-level style tie-break. Add symmetric 3D team-coordination terms to the leaf evaluation used by Alpha-Beta:

- number of active pieces,
- mobility distributed across several pieces,
- mutually defended pieces,
- coordinated attacks where at least two pieces attack the same enemy target,
- support for a recently developed piece,
- control of multiple levels,
- unique reachable volume,
- king shield and enemy pressure through levels,
- trapped or isolated major pieces,
- early unsupported queen activity,
- repeated quiet moves by one piece.

Tactics remain authoritative. Team-play scoring must never suppress:

- checkmate,
- escaping check,
- winning a queen or other clearly favorable material,
- a legal promotion,
- a forced tactical sequence.

### 4. Search strength must be monotonic

`hard` must not become weaker merely because it has a larger search budget.

Create a deterministic benchmark suite proving that:

- every tactical position solved by `easy` is also solved by `hard`,
- `hard` keeps a winning capture even after repeated use of the capturing piece,
- `hard` rejects queen-for-pawn, queen-for-knight, queen-for-bishop and queen-for-rook blunders when the queen is legally recaptured,
- `hard` does not return a provisional move when recursive depth zero is completed,
- with equal or near-equal tactical scores, `hard` develops another useful piece and builds coordinated pressure,
- timeout at any point returns the completed static baseline or last completed recursive depth.

### 5. Performance

The 8 × 8 × 8 branching factor is large. Avoid repeated legal-move generation inside the same evaluation.

- Cache legal moves for both colors once per evaluated board where practical.
- Reuse those lists for mobility, king pressure, exchange liability and coordination.
- Keep evaluation deterministic.
- Do not reduce correctness to obtain a green benchmark.
- Do not introduce unbounded work on the browser main thread.

### 6. Self-play and training

Add real-board deterministic validation after the architecture is correct.

Self-play must use:

- legal `Board3D` states,
- the production move generator,
- production safety gates,
- fixed seeds and identical openings between candidate policies,
- reports containing completed depths, baseline fallbacks, queen share, unique pieces used, coordinated attacks, material blunders and game outcomes.

Do not call a synthetic feature-vector loop a full chess game. Clearly distinguish full games, bounded rollouts and tactical episodes.

## Required tests

Add unit, integration, regression and performance tests for:

1. completed static baseline under immediate timeout,
2. last-completed-depth preservation,
3. hard/easy tactical dominance,
4. team coordination inside leaf evaluation,
5. symmetry of the initial position,
6. zero queen-for-lower-piece recapturable blunders,
7. preservation of winning captures and checkmates,
8. deterministic results for identical seeds and clocks,
9. bounded evaluation work and no repeated move generation regressions.

## Pull request requirements

Use a separate PR. Include:

- exact root cause,
- architecture before/after,
- risk analysis,
- test evidence,
- benchmark results,
- explicit statement of whether each run is a full game, bounded rollout or tactical episode.

Do not mark ready or merge unless typecheck, all tests, production build, smoke test and the new strength benchmark are green.
