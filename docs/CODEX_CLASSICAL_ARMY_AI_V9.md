# Codex Task — Classical Whole-Army AI V9

## Role

Act as the Lead Chess Engine Engineer and Senior AI Engineer for Cube Chess 512 AI. Treat this as production engine work for a long-lived open-source game. Do not solve the problem with cosmetic randomness, hard-coded opening moves or a forced round-robin that ignores tactics.

## Product context

Cube Chess 512 uses one 8 × 8 × 8 board with 512 cells. Each side begins with the classical army of sixteen pieces, extended into three-dimensional movement. The engine must understand legal movement, checks, checkmate, promotion, material, king safety, exchanges, level transitions and attacks crossing several levels.

The design must follow the principles of the first serious chess programs:

1. encode rules and legal move generation,
2. construct temporary board states,
3. evaluate each position,
4. calculate the opponent's best reply with Minimax / Alpha-Beta,
5. use iterative deepening and keep only a completed result,
6. use self-play and tactical curricula to validate and tune evaluation, not to replace the rules.

Do not attempt to store every possible game.

## Release-blocking defects

### Difficulty inversion in the live application

The menu sends `easy`, `medium` and `hard` correctly, and the Worker routes `hard` to the advanced engine. However, the application previously used one global eight-second watchdog. The completed-root hard engine could exceed that outer watchdog. The live application then discarded the valid hard calculation and executed the first legal move. Easy finished inside the watchdog and therefore appeared stronger than hard.

Required fix:

- centralize difficulty profiles,
- preserve the exact menu label in diagnostics,
- resolve it to the intended engine once,
- use monotonic search and watchdog budgets,
- never replace a normal hard timeout directly with `legalMoves[0]`,
- restart a timed-out Worker and perform a bounded searched emergency calculation,
- use an arbitrary legal move only after two independent Worker failures.

### Single-piece and queen monopoly

The engine remembers only a short recent sequence. It does not maintain a game-long record of how many times each of its surviving pieces has contributed. As a result, a queen or pawn can dominate the game while knights, bishops, rooks and other pawns remain unused.

Required fix:

- maintain a per-game usage ledger for all AI pieces,
- preserve it across a timed-out Worker restart,
- reset it for a new game, load or cancellation,
- feed it to the completed root baseline and advanced hard search,
- distinguish tactical necessity from quiet strategic choice.

## Whole-army evaluation

For each safe legal root move, calculate both the existing team-play analysis and a whole-army development analysis.

Reward, when tactically comparable:

- activating a previously unused piece,
- developing knights and bishops,
- using a new piece type in the current plan,
- increasing the number of pieces with legal influence,
- defending the moved piece,
- opening lines for rooks,
- connected pawn advances,
- adding a second attacker to a target,
- creating mutual defence,
- increasing useful control of levels and volume,
- distributing work across the surviving army.

Penalize:

- another quiet queen move while fewer than six army units have contributed,
- repeated quiet moves by one piece,
- unsupported queen excursions,
- premature rook activity before minor-piece development,
- a move that reduces the number of active supporting pieces,
- isolated attacks without reinforcement.

Do not require all sixteen units to move mechanically. A blocked pawn, captured piece or tactically irrelevant unit must not be moved merely to satisfy a counter.

## Tactical authority

Whole-army play is a strategic tie-break and evaluation term. It must never suppress:

- checkmate,
- escaping check,
- a winning capture,
- a legal promotion,
- saving a hanging queen or rook,
- a forced tactical sequence,
- a materially superior exchange.

Queen-for-pawn, queen-for-knight, queen-for-bishop and queen-for-rook trades remain forbidden when the queen is legally recaptured and there is no immediate checkmate.

## Search requirements

- Hard must use the advanced completed-root engine.
- Medium must use the bounded classical engine.
- Easy must use the shallow classical engine.
- Search strength and runtime budgets must be monotonic.
- Every serialized result must expose requested difficulty, resolved difficulty, engine and search budget.
- The hard result must come from the completed static root or the last completed Alpha-Beta depth.
- The application watchdog must not discard a completed hard result and silently execute the first legal move.

## Training and validation

Use three clearly named validation classes:

### 1. Unit and tactical regression positions

Verify exact invariants such as difficulty routing, material safety, tactical authority and whole-army scoring.

### 2. Real legal curriculum episodes

Run thousands of deterministic episodes on real `Board3D` states. Use the production move generator, production material gate, real temporary boards and the actual team/army root selector. Vary legal openings and usage histories. Measure:

- quiet queen selection rate,
- number of distinct pieces used,
- number of piece roles used,
- fresh-unit activations,
- coordinated attacks,
- mutual defence,
- material-safety violations,
- missed decisive captures,
- hard/medium/easy routing mismatches.

Call these bounded curriculum episodes, not full games.

### 3. Bounded real-board self-play

Run deterministic legal 8×8×8 rollouts with identical openings for compared policies. Report the number of games, plies, candidate limit and search depth. Do not describe a bounded rollout as a full tournament game.

## Required tests

1. `easy`, `medium`, `hard` retain their labels end to end.
2. Hard routes to `classical-3d-advanced`.
3. Search and watchdog budgets increase monotonically.
4. A hard watchdog expiry triggers a searched medium emergency attempt, not the first legal move.
5. The army ledger persists across Worker restart and resets for a new game.
6. After repeated quiet queen use, a safe fresh knight or bishop wins a near-equal comparison.
7. A rook still captures a free queen regardless of usage history.
8. Checkmate and promotion remain authoritative.
9. A quiet queen monopoly is rejected when a safe coordinated army move is comparable.
10. No recapturable queen-for-lower-piece trade is accepted.
11. Identical seeds and positions produce deterministic results.
12. All production tests, build and smoke validation remain green.

## Pull request requirements

Create one focused PR with:

- the exact watchdog root cause,
- before/after difficulty routing,
- the whole-army ledger design,
- evaluation and search integration,
- tests and training reports,
- performance risk analysis,
- an explicit distinction between full games, bounded rollouts and tactical episodes.

Do not mark ready or merge before all required CI checks are green and a manual mobile game confirms that hard no longer degrades to an arbitrary legal fallback.
