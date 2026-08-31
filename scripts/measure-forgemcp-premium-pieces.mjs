import { ForgeMcpPremiumPieceSet } from "../web/renderer/ForgeMcpPremiumPieceSet.js";

const set = new ForgeMcpPremiumPieceSet();
const types = ["pawn", "rook", "knight", "bishop", "queen", "king"];
const measurements = types.map((type) => set.inspect(type, "white"));

const report = {
  preset: "FORGEMCP_PREMIUM",
  measuredAt: new Date().toISOString(),
  measurements,
};

console.log("FORGEMCP_PREMIUM_METRICS=" + JSON.stringify(report));
