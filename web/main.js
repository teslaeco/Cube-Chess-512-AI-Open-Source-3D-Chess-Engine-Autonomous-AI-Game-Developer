import "./styles/main.css";
import "./styles/auth.css";
import "./styles/global-online.css";
import "./styles/profile.css";
import { CubeChessApplication } from "./app/CubeChessApplication.js";
import { AuthGate } from "./auth/AuthGate.js";
import { UserProfileMenu } from "./auth/UserProfileMenu.js";
import { OnlineMenuEnhancer } from "./online/OnlineMenuEnhancer.js";
import { registerServiceWorker } from "./pwa/registerServiceWorker.js";

const root = document.querySelector("#app");

if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("e2e") === "1") {
  sessionStorage.setItem(
    "cubeChessIdentity",
    JSON.stringify({
      mode: "guest",
      provider: "guest",
      playerId: "guest-e2e",
      displayName: "E2E Guest",
    }),
  );
}

const application = new CubeChessApplication(root);

const rendererStartGame = application.renderer.startGame.bind(application.renderer);
application.renderer.startGame = (config) => {
  const pieceRenderer = application.renderer.pieceRenderer;
  for (const animation of pieceRenderer.animations.values()) {
    animation.object.position.copy(animation.to);
    pieceRenderer.removeMoveAura(animation.object);
    pieceRenderer.setBlueHighlight(animation.object, false, 0);
    animation.object.scale.setScalar(1);
  }
  pieceRenderer.animations.clear();
  rendererStartGame(config);
};

const onlineMenu = new OnlineMenuEnhancer(root, (onlineGame) => {
  const isWhite = onlineGame.role === "white";
  application.onlineGame = onlineGame;
  root.dataset.gameMode = "online";
  root.dataset.onlineRole = onlineGame.role;
  root.dataset.onlineRoom = onlineGame.roomCode || "";
  application.startGame({
    mode: "local",
    humanSide: isWhite ? "white" : "black",
    whiteName: isWhite ? onlineGame.displayName : "Gracz online",
    blackName: isWhite ? "Gracz online" : onlineGame.displayName,
    clockMinutes: 0,
  });
});
let profileMenu;
const authGate = new AuthGate(root, (identity) => {
  application.identity = identity;
  root.dataset.authMode = identity.mode;
  root.dataset.playerId = identity.playerId;
  if (identity.mode === "account") profileMenu?.show(identity);
  else profileMenu?.hide();
});
profileMenu = new UserProfileMenu(root, authGate);
if (authGate.identity?.mode === "account") profileMenu.show(authGate.identity);

if (import.meta.env.DEV) {
  window.__cubeChessApplication = application;
}
window.addEventListener(
  "pagehide",
  () => {
    profileMenu.dispose();
    onlineMenu.dispose();
    authGate.dispose();
    application.dispose();
  },
  { once: true },
);
registerServiceWorker();
