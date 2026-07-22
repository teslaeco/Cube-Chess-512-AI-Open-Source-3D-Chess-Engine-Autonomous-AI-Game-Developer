const DEMO_LOOP_MS = 60_000;
const DEMO_MOVE_MS = 1_350;
const SHOWCASE_TYPES = ["pawn", "knight", "bishop", "rook", "queen", "king"];

export class AttractModeController {
  constructor(presentation, renderer) {
    this.presentation = presentation;
    this.renderer = renderer;
    this.timer = null;
    this.startedAt = 0;
    this.showcaseIndex = 0;
    this.tick = this.tick.bind(this);
  }

  start() {
    this.stop();
    this.renderer.startDemo();
    this.startedAt = performance.now();
    this.showcaseIndex = 0;
    this.timer = window.setInterval(this.tick, DEMO_MOVE_MS);
  }

  tick() {
    if (document.hidden || this.presentation.busy) return;
    if (performance.now() - this.startedAt >= DEMO_LOOP_MS || this.presentation.status.kind !== "active") {
      this.renderer.startDemo();
      this.startedAt = performance.now();
      this.showcaseIndex = 0;
      return;
    }
    const moves = this.presentation.getLegalMovesForSide();
    if (!moves.length) return;
    const wantedType = SHOWCASE_TYPES[this.showcaseIndex % SHOWCASE_TYPES.length];
    const pieces = new Map(this.presentation.pieces.map((piece) => [piece.id, piece]));
    const ranked = [...moves].sort((left, right) => {
      const score = (move) => {
        const piece = pieces.get(move.pieceId);
        return (
          (piece?.type === wantedType ? 100 : 0) +
          (move.kind === "capture" ? 45 : 0) +
          (move.to.z > move.from.z ? 30 : 0) +
          move.to.z * 2
        );
      };
      return score(right) - score(left) || left.square3D.localeCompare(right.square3D);
    });
    if (this.renderer.executeAutomatedMove(ranked[0])) this.showcaseIndex += 1;
  }

  stop() {
    if (this.timer != null) window.clearInterval(this.timer);
    this.timer = null;
  }

  dispose() {
    this.stop();
  }
}
