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
