# Cube Chess 512 — Master AI strategy

This document defines the strategic contract for the `hard` computer opponent.

## Core rule

The hard AI must choose the best searched move. Post-search UI heuristics must never replace that move with an arbitrary legal alternative.

## Classical chess principles mapped to 3D

- Material safety: avoid hanging pieces and unfavorable exchanges.
- Development: activate pawns, bishops and knights before repeated quiet moves by one unit.
- King safety: maintain nearby defenders and avoid unnecessary king movement.
- Center control: reward influence over the geometric center of the 8×8×8 board.
- Space: reward useful control across multiple levels rather than unsupported pawn pushes.
- Coordination: reward positions where several distinct pieces have legal activity.
- Tempo: penalize repeated quiet moves with the same piece when equivalent developing moves exist.
- Tactics: checkmate, captures, promotions and forced defensive moves override development heuristics.
- Game phase: development matters most in the opening, king activity increases in reduced-material endings.

## Search contract

- Iterative deepening.
- Alpha-beta pruning.
- Transposition table.
- Quiescence search for unstable tactical positions.
- Root move ordering based on tactical and positional priorities.
- Cancellation and legal fallback.

## Regression requirements

The hard AI must not:

- replace its searched principal move with the first different legal move,
- push one quiet pawn repeatedly only to satisfy a diversity rule,
- prefer a cosmetic check over material or king safety,
- hang a more valuable piece when a safe legal alternative exists.
