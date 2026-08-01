export class AiController {
  constructor() {
    this.worker = new Worker(new URL("./ai.worker.js", import.meta.url), {
      type: "module",
      name: "cube-chess-ai",
    });
    this.requestSequence = 0;
    this.pending = new Map();
    this.recentAiPieceIds = [];
    this.worker.addEventListener("message", (event) => {
      const pending = this.pending.get(event.data.requestId);
      if (!pending) return;
      this.pending.delete(event.data.requestId);
      const move = event.data.move ?? null;
      if (move?.pieceId) {
        this.recentAiPieceIds.unshift(move.pieceId);
        this.recentAiPieceIds = this.recentAiPieceIds.slice(0, 4);
      }
      pending.resolve(move);
    });
    this.worker.addEventListener("error", (error) => {
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
    });
  }

  chooseMove(snapshot) {
    const requestId = ++this.requestSequence;
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.worker.postMessage({
        type: "choose-move",
        requestId,
        pieces: snapshot.pieces,
        sideToMove: snapshot.sideToMove,
        difficulty: snapshot.gameConfig.difficulty,
        recentAiPieceIds: this.recentAiPieceIds,
      });
    });
  }

  cancel() {
    this.requestSequence += 1;
    this.recentAiPieceIds = [];
    for (const pending of this.pending.values()) pending.resolve(null);
    this.pending.clear();
    this.worker.postMessage({ type: "cancel" });
  }

  dispose() {
    this.cancel();
    this.worker.terminate();
  }
}
