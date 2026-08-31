import "./promotion.css";
import { CubeChessApplication } from "../app/CubeChessApplication.js";
import { registerVisualWebMcpTools } from "../forgemcp/visualTools.js";
import { installPawnPromotion } from "./PawnPromotion.js";

const originalHandleStateChange = CubeChessApplication.prototype.handleStateChange;
CubeChessApplication.prototype.handleStateChange = function handleStateChangeWithForgeMcp(state) {
  globalThis.__forgeMcpCubeApplication = this;
  return originalHandleStateChange.call(this, state);
};

const originalStartGame = CubeChessApplication.prototype.startGame;
CubeChessApplication.prototype.startGame = function startGameWithPromotion(config) {
  globalThis.__forgeMcpCubeApplication = this;
  const result = originalStartGame.call(this, config);
  if (!this.pawnPromotion) this.pawnPromotion = installPawnPromotion(this);
  return result;
};

void import("../main.js")
  .then(async () => {
    const registration = await registerVisualWebMcpTools();
    globalThis.__forgeMcpVisualToolRegistration = registration;
    if (registration.availability === "WEBMCP_AVAILABLE") {
      console.info("ForgeMCP visual WebMCP tools registered", registration);
    }
  })
  .catch((error) => {
    console.error("Failed to start Cube Chess 512", error);
  });
