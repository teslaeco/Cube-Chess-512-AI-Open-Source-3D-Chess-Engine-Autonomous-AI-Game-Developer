import "./promotion.css";
import { CubeChessApplication } from "../app/CubeChessApplication.js";
import { installPawnPromotion } from "./PawnPromotion.js";

const originalStartGame = CubeChessApplication.prototype.startGame;
CubeChessApplication.prototype.startGame = function startGameWithPromotion(config) {
  const result = originalStartGame.call(this, config);
  if (!this.pawnPromotion) this.pawnPromotion = installPawnPromotion(this);
  return result;
};

void import("../main.js").catch((error) => {
  console.error("Failed to start Cube Chess 512", error);
});
