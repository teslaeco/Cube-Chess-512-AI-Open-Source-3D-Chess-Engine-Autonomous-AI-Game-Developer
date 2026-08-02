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

const TUTORIAL_COPY = {
  en: {
    title: "6. Pawn Promotion in 3D Space",
    levelsOneToSeven: "On Levels 1 through 7, a pawn may be promoted according to the classical chess rule. If it reaches the opponent’s final rank on its current level, the player may replace it with a queen, rook, bishop or knight.",
    levelEight: "A pawn may also advance vertically between levels. If a legal move places it on Level 8, it is promoted immediately, regardless of the rank, file or square on which it entered the highest level.",
    allowedPieces: "A pawn cannot be promoted to a king or another pawn.",
    yellowSelection: "During promotion, the available pieces are highlighted in yellow.",
  },
  pl: {
    title: "6. Promocja pionka w przestrzeni 3D",
    levelsOneToSeven: "Na poziomach od 1 do 7 pionek może zostać promowany zgodnie z klasyczną zasadą szachową. Jeżeli dotrze do ostatniego rzędu przeciwnika na swoim aktualnym poziomie, gracz może zamienić go na hetmana, wieżę, gońca albo skoczka.",
    levelEight: "Pionek może również awansować pionowo pomiędzy poziomami. Jeżeli po legalnym ruchu wejdzie na poziom 8, zostaje promowany natychmiast, niezależnie od rzędu, kolumny i pola, na którym znalazł się na najwyższym poziomie.",
    allowedPieces: "Nie można promować pionka na króla ani na kolejnego pionka.",
    yellowSelection: "Podczas promocji dostępne figury zostaną podświetlone na żółto.",
  },
};

const originalTutorialRender = TutorialController.prototype.render;
TutorialController.prototype.render = function renderWithPromotionSection(state) {
  originalTutorialRender.call(this, state);
  if (!this.panel || this.panel.hidden) return;
  let section = this.panel.querySelector("[data-tutorial-pawn-promotion]");
  if (!section) {
    section = document.createElement("section");
    section.className = "tutorial-pawn-promotion";
    section.dataset.tutorialPawnPromotion = "";
    this.panel.append(section);
  }
  const language = this.application.presentation.language === "pl" ? "pl" : "en";
  const copy = TUTORIAL_COPY[language];
  section.innerHTML = `<h2>${copy.title}</h2><p>${copy.levelsOneToSeven}</p><p>${copy.levelEight}</p><p>${copy.yellowSelection} ${copy.allowedPieces}</p>`;
};

await import("../main.js");
