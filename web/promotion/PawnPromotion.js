import { positionStatus } from "../app/EngineMoveAdapter.js";

export const LEGAL_PROMOTION_TYPES = Object.freeze(["queen", "rook", "bishop", "knight"]);
export const PROMOTION_REASONS = Object.freeze({ FINAL_RANK: "final-rank", LEVEL_EIGHT: "level-eight" });

export function evaluatePawnPromotion(piece, from, to) {
  if (!piece || piece.type !== "pawn" || !from || !to) return { required: false };
  if (to.z === 7) return { required: true, reason: PROMOTION_REASONS.LEVEL_EIGHT };
  const finalRank = piece.color === "white" ? 7 : 0;
  return to.z < 7 && to.y === finalRank
    ? { required: true, reason: PROMOTION_REASONS.FINAL_RANK }
    : { required: false };
}

export function assertPromotionType(type) {
  if (!LEGAL_PROMOTION_TYPES.includes(type)) {
    throw new RangeError(`Illegal promotion piece: ${String(type)}`);
  }
  return type;
}

export function chooseAIPromotion(_gameState, _move) {
  return "queen";
}

function finishTurn(presentation, movingColor) {
  presentation.sideToMove = movingColor === "white" ? "black" : "white";
  if (presentation.sideToMove === "white") presentation.fullMoveNumber += 1;
  presentation.status = positionStatus(presentation.pieces, presentation.sideToMove);
  presentation.clearSelection();
  presentation.message = presentation.status.kind === "active" && presentation.status.inCheck
    ? "check"
    : presentation.status.kind;
  if (presentation.status.kind !== "active") presentation.appState = "gameOver";
}

export function installPawnPromotion(application) {
  const presentation = application.presentation;
  const originalExecuteMove = presentation.executeMove.bind(presentation);
  const originalCanHumanInteract = presentation.canHumanInteract.bind(presentation);
  const root = application.root ?? document.querySelector("#app");

  const overlay = document.createElement("div");
  overlay.className = "promotion-overlay";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML = `<section class="promotion-dialog"><h2 data-promotion-title></h2><div class="promotion-options"></div></section>`;
  root.append(overlay);

  const labels = {
    en: { title: "Promote pawn", queen: "Queen", rook: "Rook", bishop: "Bishop", knight: "Knight" },
    pl: { title: "Promocja pionka", queen: "Hetman", rook: "Wieża", bishop: "Goniec", knight: "Skoczek" },
  };

  function locale() { return presentation.language === "pl" ? labels.pl : labels.en; }

  function renderOptions() {
    const copy = locale();
    overlay.querySelector("[data-promotion-title]").textContent = copy.title;
    const options = overlay.querySelector(".promotion-options");
    options.innerHTML = LEGAL_PROMOTION_TYPES.map((type) =>
      `<button type="button" class="promotion-option promotion-option--available" data-promote="${type}" aria-label="Promote pawn to ${copy[type]}">${copy[type]}</button>`,
    ).join("");
    queueMicrotask(() => options.querySelector("button")?.focus());
  }

  function resolvePromotion(type) {
    assertPromotionType(type);
    const pending = presentation.pendingPromotion;
    if (!pending) return false;
    const piece = presentation.pieces.find((candidate) => candidate.id === pending.pieceId);
    if (!piece || piece.type !== "pawn") return false;
    piece.type = type;
    presentation.lastMove = {
      ...presentation.lastMove,
      promotion: { reason: pending.reason, promotedTo: type },
      promotedTo: type,
      promotionReason: pending.reason,
    };
    presentation.pendingPromotion = null;
    presentation.busy = false;
    overlay.hidden = true;
    finishTurn(presentation, pending.color);
    application.renderer.refresh();
    application.handleStateChange?.(presentation.snapshot());
    return true;
  }

  overlay.addEventListener("click", (event) => {
    const type = event.target.closest("[data-promote]")?.dataset.promote;
    if (type) resolvePromotion(type);
  });
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") event.preventDefault();
  });

  presentation.canHumanInteract = () => !presentation.pendingPromotion && originalCanHumanInteract();
  presentation.resolvePromotion = resolvePromotion;

  presentation.executeMove = (move, options = {}) => {
    const movingPiece = presentation.pieces.find((piece) => piece.id === move?.pieceId);
    const from = movingPiece ? structuredClone(movingPiece.position) : null;
    const movingColor = movingPiece?.color;
    const fullMoveBefore = presentation.fullMoveNumber;
    const result = originalExecuteMove(move, options);
    if (!result || !movingPiece || !from) return result;

    const moved = presentation.pieces.find((piece) => piece.id === movingPiece.id);
    const evaluation = evaluatePawnPromotion(moved, from, moved?.position);
    if (!evaluation.required) return result;

    // Undo the normal turn completion. The committed board move remains in place.
    presentation.sideToMove = movingColor;
    presentation.fullMoveNumber = fullMoveBefore;
    presentation.status = { kind: "active", inCheck: false };
    presentation.appState = "playing";
    presentation.busy = true;
    presentation.pendingPromotion = {
      pieceId: moved.id,
      color: movingColor,
      from,
      to: structuredClone(moved.position),
      reason: evaluation.reason,
    };
    presentation.lastMove = {
      ...presentation.lastMove,
      promotion: { reason: evaluation.reason, promotedTo: null },
      promotionReason: evaluation.reason,
    };

    if (presentation.gameConfig.aiSide === movingColor) {
      resolvePromotion(chooseAIPromotion(presentation.snapshot(), presentation.lastMove));
    } else {
      renderOptions();
      overlay.hidden = false;
    }
    return true;
  };

  return { resolvePromotion, dispose: () => overlay.remove() };
}
