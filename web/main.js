import "./styles/main.css";
import "./styles/auth.css";
import { CubeChessApplication } from "./app/CubeChessApplication.js";
import { AuthGate } from "./auth/AuthGate.js";
import { registerServiceWorker } from "./pwa/registerServiceWorker.js";

const root = document.querySelector("#app");
const application = new CubeChessApplication(root);
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
    authGate.dispose();
    application.dispose();
  },
  { once: true },
);
registerServiceWorker();
