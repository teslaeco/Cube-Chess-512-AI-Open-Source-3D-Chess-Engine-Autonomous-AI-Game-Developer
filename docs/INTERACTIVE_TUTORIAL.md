# Interactive 3D rules tutorial

## Goal

The tutorial teaches the central Cube Chess 512 rule without duplicating move validation: classical chess movement geometry is extended from length and width into height across eight 8 × 8 levels.

## Architecture

`TutorialController` is a presentation-only module. It reads immutable snapshots produced by `GamePresentation`, reacts to selected pieces and completed moves, and renders a responsive accessible panel. It never calls `executeMove`, never changes pieces, and never writes to authoritative multiplayer state.

The engine remains the source of truth for:

- selected piece,
- legal targets,
- captures,
- source and destination levels,
- completed moves.

Tutorial progress is stored separately under the versioned `cubeChessTutorial` localStorage key.

## Lesson flow

1. Explain eight boards and 512 squares.
2. Ask the player to choose a white piece.
3. Explain engine-generated legal targets.
4. Explain the third movement axis.
5. Confirm the first spatial lesson.

The panel also provides piece-specific explanations, replay feedback, reset, skip, legal-move help and optional automatic move explanations.

## Localization and accessibility

The initial release includes Polish and English copy with English fallback. The panel uses an `aria-live` region, keyboard-operable native controls, visible focus styles, mobile layout rules, high-contrast support and reduced-motion handling.

## Extending lessons

Add new lesson entries to `STEPS`, add translated keys to both locale dictionaries, and advance state only from game snapshot facts. Do not implement move geometry inside tutorial code.

## Tests

Run:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Unit coverage currently validates move classification, piece explanation mapping and safe versioned progress loading. Integration and browser coverage should continue to be expanded as the tutorial becomes connected to additional renderer events such as illegal target attempts and hover explanations.
