export class AiController {
  constructor() {
    this.worker = new Worker(new URL("./ai.worker.js", import.meta.url), {
      type: "module",
      name: "cube-chess-ai",
    });
    this.requestSequence = 0;
    this.pending = new Map();
    this.worker.addEventListener("message", (event) => {
      const pending = this.pending.get(event.data.requestId);
      if (!pending) return;
      this.pending.delete(event.data.requestId);
      pending.resolve(event.data.move ?? null);
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
      });
    });
  }

  cancel() {
    this.requestSequence += 1;
    for (const pending of this.pending.values()) pending.resolve(null);
    this.pending.clear();
    this.worker.postMessage({ type: "cancel" });
  }

  dispose() {
    this.cancel();
    this.worker.terminate();
  }
}
