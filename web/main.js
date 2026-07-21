import "./styles/main.css";
import { CubeChessApplication } from "./app/CubeChessApplication.js";

const application = new CubeChessApplication(document.querySelector("#app"));
window.addEventListener("pagehide", () => application.dispose(), { once: true });
