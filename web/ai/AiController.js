import {
  getDifficultyProfile,
  normalizeDifficulty,
} from "./difficultyProfiles.js";

export class AiController {
  constructor() {
    this.requestSequence = 0;
    this.pending = new Map();
    this.recentAiPieceIds = [];
    this.aiUsageCounts = {};
    this.createWorker();
  }

  createWorker() {
    this.worker = new Worker(new URL("./ai.worker.js", import.meta.url), {
      type: "module",
      name: "cube-chess-ai",
    });
    this.worker.addEventListener("message", (event) => {
      const pending = this.pending.get(event.data.requestId);
      if (!pending) return;
      this.pending.delete(event.data.requestId);
      const move = event.data.move ?? null;
      if (move?.pieceId) {
        this.recentAiPieceIds.unshift(move.pieceId);
        this.recentAiPieceIds = this.recentAiPieceIds.slice(0, 24);
        this.aiUsageCounts[move.pieceId] =
          Number(this.aiUsageCounts[move.pieceId] ?? 0) + 1;
      }
      pending.resolve(move);
    });
    this.worker.addEventListener("error", (error) => {
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
    });
  }

  chooseMove(snapshot, overrides = {}) {
    const requestId = ++this.requestSequence;
    const requestedDifficulty =
      overrides.difficulty ?? snapshot.gameConfig.difficulty;
    const difficulty = normalizeDifficulty(requestedDifficulty);
    const profile = getDifficultyProfile(difficulty);
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.worker.postMessage({
        type: "choose-move",
        requestId,
        pieces: snapshot.pieces,
        sideToMove: snapshot.sideToMove,
        difficulty,
        requestedDifficulty,
        searchMilliseconds:
          overrides.searchMilliseconds ?? profile.searchMilliseconds,
        recentAiPieceIds: this.recentAiPieceIds,
        aiUsageCounts: this.aiUsageCounts,
      });
    });
  }

  restartWorker({ preserveHistory = true } = {}) {
    this.requestSequence += 1;
    for (const pending of this.pending.values()) pending.resolve(null);
    this.pending.clear();
    this.worker?.terminate();
    if (!preserveHistory) {
      this.recentAiPieceIds = [];
      this.aiUsageCounts = {};
    }
    this.createWorker();
  }

  cancel() {
    this.requestSequence += 1;
    this.recentAiPieceIds = [];
    this.aiUsageCounts = {};
    for (const pending of this.pending.values()) pending.resolve(null);
    this.pending.clear();
    this.worker.postMessage({ type: "cancel" });
  }

  dispose() {
    this.cancel();
    this.worker.terminate();
  }
}
