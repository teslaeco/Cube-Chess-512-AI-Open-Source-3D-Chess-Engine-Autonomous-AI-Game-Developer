import "./styles/main.css";
import { CubeChessApplication } from "./app/CubeChessApplication.js";
import { registerServiceWorker } from "./pwa/registerServiceWorker.js";

const application = new CubeChessApplication(document.querySelector("#app"));
if (import.meta.env.DEV) {
  // Development-only hook for real WebGL pointer E2E tests. Vite removes this
  // branch from the production build.
  window.__cubeChessApplication = application;
}
window.addEventListener("pagehide", () => application.dispose(), { once: true });
registerServiceWorker();
