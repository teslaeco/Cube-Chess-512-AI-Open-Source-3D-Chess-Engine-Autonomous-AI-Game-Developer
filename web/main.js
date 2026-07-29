import "./styles/main.css";
import "./styles/auth.css";
import "./styles/global-online.css";
import { CubeChessApplication } from "./app/CubeChessApplication.js";
import { AuthGate } from "./auth/AuthGate.js";
import { OnlineMenuEnhancer } from "./online/OnlineMenuEnhancer.js";
import { registerServiceWorker } from "./pwa/registerServiceWorker.js";

const root = document.querySelector("#app");

// The real authentication dialog must remain enabled for users, but browser E2E
// tests need a deterministic authenticated identity before they interact with the
// menu and canvas. This branch exists only in Vite development builds and is
// removed from the production bundle.
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

// Attract mode may still be animating a piece when the player presses Start.
// Settle every active animation before the new position is synchronized so no
// model remains suspended above the board and raycasting starts deterministically.
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

const onlineMenu = new OnlineMenuEnhancer(root);
const authGate = new AuthGate(root, (identity) => {
  application.identity = identity;
  root.dataset.authMode = identity.mode;
  root.dataset.playerId = identity.playerId;
});

if (import.meta.env.DEV) {
  // Development-only hook for real WebGL pointer E2E tests. Vite removes this
  // branch from the production build.
  window.__cubeChessApplication = application;
}
window.addEventListener(
  "pagehide",
  () => {
    onlineMenu.dispose();
    authGate.dispose();
    application.dispose();
  },
  { once: true },
);
registerServiceWorker();
