import "./promotion.css";
import { CubeChessApplication } from "../app/CubeChessApplication.js";
import { TutorialController } from "../tutorial/TutorialController.js";
import { installPawnPromotion } from "./PawnPromotion.js";

const originalStartGame = CubeChessApplication.prototype.startGame;
CubeChessApplication.prototype.startGame = function startGameWithPromotion(config) {
  const result = originalStartGame.call(this, config);
  if (!this.pawnPromotion) this.pawnPromotion = installPawnPromotion(this);
  return result;
};

const PROMOTION_STEP_INDEX = 5;
const TUTORIAL_TOTAL_STEPS = 6;
const TUTORIAL_COPY = {
  en: {
    title: "6. Pawn Promotion in 3D Space",
    message: "On Levels 1 through 7, a pawn may be promoted according to the classical chess rule. If it reaches the opponent’s final rank on its current level, the player may replace it with a queen, rook, bishop or knight.\n\nA pawn may also advance vertically between levels. If a legal move places it on Level 8, it is promoted immediately, regardless of the rank, file or square on which it entered the highest level.\n\nDuring promotion, the available pieces are highlighted in yellow. A pawn cannot be promoted to a king or another pawn.",
    progress: (current) => `Step ${current} of ${TUTORIAL_TOTAL_STEPS}`,
  },
  pl: {
    title: "6. Promocja pionka w przestrzeni 3D",
    message: "Na poziomach od 1 do 7 pionek może zostać promowany zgodnie z klasyczną zasadą szachową. Jeżeli dotrze do ostatniego rzędu przeciwnika na swoim aktualnym poziomie, gracz może zamienić go na hetmana, wieżę, gońca albo skoczka.\n\nPionek może również awansować pionowo pomiędzy poziomami. Jeżeli po legalnym ruchu wejdzie na poziom 8, zostaje promowany natychmiast, niezależnie od rzędu, kolumny i pola, na którym znalazł się na najwyższym poziomie.\n\nPodczas promocji dostępne figury zostaną podświetlone na żółto. Nie można promować pionka na króla ani na kolejnego pionka.",
    progress: (current) => `Krok ${current} z ${TUTORIAL_TOTAL_STEPS}`,
  },
};

function tutorialCopy(controller) {
  return controller.application.presentation.language === "pl"
    ? TUTORIAL_COPY.pl
    : TUTORIAL_COPY.en;
}

const originalTutorialHandleAction = TutorialController.prototype.handleAction;
TutorialController.prototype.handleAction = function handleActionWithPromotionStep(event) {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "next" && this.progress.step === PROMOTION_STEP_INDEX - 1) {
    this.progress.step = PROMOTION_STEP_INDEX;
    this.dynamicMessage = "";
    this.save();
    this.render();
    return;
  }
  if (action === "previous" && this.progress.step === PROMOTION_STEP_INDEX) {
    this.progress.step = PROMOTION_STEP_INDEX - 1;
    this.save();
    this.render();
    return;
  }
  if (this.progress.step === PROMOTION_STEP_INDEX && ["why", "repeat"].includes(action)) {
    return;
  }
  originalTutorialHandleAction.call(this, event);
};

const originalTutorialRender = TutorialController.prototype.render;
TutorialController.prototype.render = function renderWithPromotionStep(state) {
  const requestedStep = this.progress.step;
  if (requestedStep === PROMOTION_STEP_INDEX) {
    this.progress.step = PROMOTION_STEP_INDEX - 1;
  }

  originalTutorialRender.call(this, state);
  this.progress.step = requestedStep;

  if (!this.panel || this.panel.hidden) return;

  const copy = tutorialCopy(this);
  const currentStep = requestedStep + 1;
  this.panel.querySelector('[data-role="progress"]').textContent = copy.progress(currentStep);

  const previous = this.panel.querySelector('[data-action="previous"]');
  const next = this.panel.querySelector('[data-action="next"]');
  const why = this.panel.querySelector('[data-action="why"]');
  const repeat = this.panel.querySelector('[data-action="repeat"]');

  if (requestedStep === PROMOTION_STEP_INDEX) {
    this.panel.querySelector('[data-role="step-title"]').textContent = copy.title;
    const message = this.panel.querySelector('[data-role="message"]');
    message.textContent = copy.message;
    message.style.whiteSpace = "pre-line";
    this.panel.querySelector('[data-role="explanation"]').textContent = "";
    previous.disabled = false;
    next.disabled = true;
    why.hidden = true;
    repeat.hidden = true;
  } else {
    this.panel.querySelector('[data-role="message"]').style.whiteSpace = "";
    next.disabled = requestedStep >= PROMOTION_STEP_INDEX;
    why.hidden = false;
    repeat.hidden = false;
  }

  this.panel.dataset.step = String(requestedStep);
};

void import("../main.js").catch((error) => {
  console.error("Failed to start Cube Chess 512", error);
});
