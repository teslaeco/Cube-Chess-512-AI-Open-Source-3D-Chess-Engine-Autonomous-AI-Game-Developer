# Codex task — paired team play and 100,000 computational games

## Role

Act as a senior chess-engine engineer working on Cube Chess 512 AI. Preserve the authoritative 8×8×8 rules, promotion logic, final material-safety gate, save format, renderer and multiplayer protocol.

## Production defect

The hard computer can stop making immediate material blunders but still repeat quiet moves with one rook, bishop, queen or another single piece. The existing recent-piece history mostly affects move ordering; a completed Alpha-Beta score can ignore it entirely.

## Required behaviour

1. Alpha-Beta remains authoritative for forced mates, checks, promotions, winning captures, king safety and material advantages.
2. Quiet alternatives whose search scores are strategically close must use a bounded team-play tie-break.
3. Repeating the same non-tactical piece several turns in a row receives an escalating penalty.
4. Switching to a different piece receives credit only when it improves development, defence, mutual support or cooperation with the most recently moved piece.
5. The engine should prefer paired and coordinated plans: one piece attacks or advances while another protects it, opens a line, protects the previous piece or increases the number of defended partners.
6. Do not enforce artificial variety when the repeated move is tactically required.
7. Never bypass `finalMoveSafety.js`.

## Training requirement

Create a deterministic, reproducible training tournament that executes exactly 100,000 computational curriculum games by default. It must:

- compare several candidate weight profiles,
- preserve zero missed forcing tactics in the curriculum,
- penalize quiet same-piece streaks,
- reward mutual defence and support of the previous piece,
- publish a JSON artifact with rankings and metrics,
- fail CI if the selected profile differs from the committed production profile,
- remain runnable manually with `npm run train:teamplay -- --games=100000`.

This training is parameter selection for an Alpha-Beta evaluation policy, not a claim that the browser engine is a neural network.

## Required tests

- unit tests for the strategic equivalence window,
- tactical superiority must beat cosmetic move diversity,
- a third quiet move by the same major piece must be strongly penalized,
- seeded hard-vs-hard self-play must use at least two pieces per side when at least three moves are available,
- existing promotion and material-safety regressions must remain green,
- full typecheck, unit/regression suite, production build and smoke test must pass.

## Pull request rules

Use a separate PR. Document purpose, architecture, measurable training results, risks and manual tests. Do not merge while any normal CI or 100K training check is red.
