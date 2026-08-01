import { generateLegalMovesForColor } from "../../src/engine3d/index.ts";
import {
  chooseBestMove,
  createBoard,
  orderMoves,
  serializeMove,
} from "./searchEngine.js";
import { chooseAdvancedMove } from "./advancedSearch.js";
import { applyLoneKingLevelRule } from "../rules/LoneKingLevelRule.js";

let generation = 0;

function chooseMoveWithVariantRules(pieces, sideToMove, difficulty, options) {
  const selected =
    difficulty === "hard"
      ? chooseAdvancedMove(pieces, sideToMove, options)
      : chooseBestMove(pieces, sideToMove, difficulty, options);
  if (!selected) return null;

  const allowed = applyLoneKingLevelRule(pieces, sideToMove, [selected]);
  if (allowed.length) return selected;

  const board = createBoard(pieces);
  const legal = generateLegalMovesForColor(board, sideToMove);
  const filtered = applyLoneKingLevelRule(
    pieces,
    sideToMove,
    orderMoves(board, legal),
  );
  return filtered.length ? serializeMove(filtered[0]) : null;
}

self.addEventListener("message", (event) => {
  if (event.data.type === "cancel") {
    generation += 1;
    return;
  }
  if (event.data.type !== "choose-move") return;

  const token = generation;
  const move = chooseMoveWithVariantRules(
    event.data.pieces,
    event.data.sideToMove,
    event.data.difficulty,
    { isCancelled: () => token !== generation },
  );
  self.postMessage({ requestId: event.data.requestId, move });
});
