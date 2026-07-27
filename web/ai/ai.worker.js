import { chooseBestMove } from "./searchEngine.js";

let generation = 0;

self.addEventListener("message", (event) => {
  if (event.data.type === "cancel") {
    generation += 1;
    return;
  }
  if (event.data.type !== "choose-move") return;

  const token = generation;
  const move = chooseBestMove(
    event.data.pieces,
    event.data.sideToMove,
    event.data.difficulty,
    { isCancelled: () => token !== generation },
  );
  self.postMessage({ requestId: event.data.requestId, move });
});
