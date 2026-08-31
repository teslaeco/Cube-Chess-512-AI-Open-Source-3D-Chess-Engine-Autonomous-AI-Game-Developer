import "./promotion.css";
import { CubeChessApplication } from "../app/CubeChessApplication.js";
import { registerVisualWebMcpTools } from "../forgemcp/visualTools.js";
import { ForgeMcpPremiumPieceSet } from "../renderer/ForgeMcpPremiumPieceSet.js";
import { installPawnPromotion } from "./PawnPromotion.js";

const PREMIUM_PRESET = "FORGEMCP_PREMIUM";
const LEGACY_PRESET = "LEGACY_COMPACT";

function configurePremiumDefault(application) {
  const factory = application?.renderer?.pieceRenderer?.factory;
  if (!factory || typeof factory.create !== "function") return false;

  // Preserve the real pre-challenge runtime factory so WebMCP rollback can
  // deterministically restore the compact Meshy pipeline.
  if (!factory.__forgeOriginalCreate) factory.__forgeOriginalCreate = factory.create.bind(factory);
  if (!factory.__forgePremiumSet) factory.__forgePremiumSet = new ForgeMcpPremiumPieceSet();

  factory.create = (type, color) => factory.__forgePremiumSet.create(type, color);
  factory.__forgeVisualMode = PREMIUM_PRESET;
  factory.__forgeLegacyVisualMode = LEGACY_PRESET;
  return true;
}

const originalHandleStateChange = CubeChessApplication.prototype.handleStateChange;
CubeChessApplication.prototype.handleStateChange = function handleStateChangeWithForgeMcp(state) {
  globalThis.__forgeMcpCubeApplication = this;
  return originalHandleStateChange.call(this, state);
};

const originalStartGame = CubeChessApplication.prototype.startGame;
CubeChessApplication.prototype.startGame = function startGameWithPromotion(config) {
  globalThis.__forgeMcpCubeApplication = this;

  // The public production game now starts with the NEW ForgeMCP premium
  // visual set. This is the default renderer configuration, not an
  // agent-triggered mutation. WebMCP mutations still require humanApproved.
  configurePremiumDefault(this);

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
