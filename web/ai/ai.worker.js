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

export function chooseMoveWithVariantRules(
  pieces,
  sideToMove,
  difficulty,
  options = {},
) {
  const selected =
    difficulty === "hard"
      ? chooseAdvancedMove(pieces, sideToMove, options)
      : chooseBestMove(pieces, sideToMove, difficulty, options);
  if (!selected) return null;

  const board = createBoard(pieces);
  const legal = generateLegalMovesForColor(board, sideToMove);
  const filtered = applyLoneKingLevelRule(
    pieces,
    sideToMove,
    orderMoves(board, legal),
  );
  const selectedAllowed = applyLoneKingLevelRule(pieces, sideToMove, [selected]);

  // The searched hard-AI move is authoritative. Never replace a completed
  // alpha-beta result with the first move of another piece merely to create
  // cosmetic variety. Repetition is handled inside the strategic evaluation,
  // where tactics, material and king safety can override it correctly.
  if (selectedAllowed.length) return selected;

  // Variant rules may invalidate a move after search. In that exceptional
  // case return a deterministic legal fallback rather than an illegal move.
  return filtered.length ? serializeMove(filtered[0]) : null;
}

if (typeof self !== "undefined") {
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
      {
        isCancelled: () => token !== generation,
        recentAiPieceIds: event.data.recentAiPieceIds ?? [],
      },
    );
    self.postMessage({ requestId: event.data.requestId, move });
  });
}
