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

function opposite(color) {
  return color === "white" ? "black" : "white";
}

function squareOf(piece) {
  return piece?.position?.square3D || "";
}

function inferAuthoritativeMove(state) {
  const localById = new Map(application.presentation.pieces.map((piece) => [piece.id, piece]));
  for (const piece of state?.pieces || []) {
    const local = localById.get(piece.id);
    if (local && squareOf(local) !== squareOf(piece)) {
      return { pieceId: piece.id, square3D: squareOf(piece) };
    }
  }
  return null;
}

function hardSynchronizeAuthoritativeState(state) {
  const presentation = application.presentation;
  const remoteIds = new Set((state.pieces || []).map((piece) => piece.id));
  for (const piece of presentation.pieces) {
    if (!remoteIds.has(piece.id) && !presentation.capturedPieces.some((captured) => captured.id === piece.id)) {
      presentation.capturedPieces.push({
        ...structuredClone(piece),
        capturedBy: opposite(piece.color),
        capturedOnMove: Math.max(1, Math.ceil(Number(state.sequence || 1) / 2)),
        captureIndex: presentation.capturedPieces.length,
      });
    }
  }
  presentation.pieces = structuredClone(state.pieces || []);
  presentation.sideToMove = state.sideToMove || "white";
  presentation.moveSequence = Number(state.sequence) || 0;
  presentation.fullMoveNumber = Math.floor(presentation.moveSequence / 2) + 1;
  presentation.status = structuredClone(state.status || { kind: "active", inCheck: false });
  presentation.appState = presentation.status.kind === "active" ? "playing" : "gameOver";
  presentation.busy = false;
  presentation.lastMove = null;
  presentation.clearSelection();
  application.renderer.refresh();
}

function applyAuthoritativeState(state) {
  const onlineGame = application.onlineGame;
  if (!onlineGame || state?.started !== true) return;
  const remoteSequence = Number(state.sequence) || 0;
  const localSequence = Number(application.presentation.moveSequence) || 0;
  if (remoteSequence <= localSequence) return;

  onlineGame.applyingRemoteState = true;
  try {
    const move = remoteSequence === localSequence + 1 ? inferAuthoritativeMove(state) : null;
    const executed = move ? application.renderer.executeAutomatedMove(move) : false;
    if (!executed || application.presentation.moveSequence !== remoteSequence) {
      hardSynchronizeAuthoritativeState(state);
    }
    onlineGame.lastSentSequence = Math.max(onlineGame.lastSentSequence || 0, remoteSequence);
  } finally {
    onlineGame.applyingRemoteState = false;
  }
}

function attachOnlineSocket(onlineGame) {
  if (application.onlineGame?.socket && application.onlineSocketHandler) {
    application.onlineGame.socket.removeEventListener("message", application.onlineSocketHandler);
  }
  const handler = (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message.type === "state") applyAuthoritativeState(message.state);
  };
  onlineGame.socket.addEventListener("message", handler);
  application.onlineSocketHandler = handler;
}

const baseCanHumanInteract = application.presentation.canHumanInteract.bind(application.presentation);
application.presentation.canHumanInteract = () => {
  const onlineGame = application.onlineGame;
  if (!onlineGame) return baseCanHumanInteract();
  return (
    baseCanHumanInteract() &&
    onlineGame.role !== "spectator" &&
    application.presentation.sideToMove === onlineGame.role
  );
};

const baseHandleStateChange = application.handleStateChange.bind(application);
application.handleStateChange = (state) => {
  baseHandleStateChange(state);
  const onlineGame = application.onlineGame;
  const move = state.lastMove;
  if (!onlineGame || onlineGame.applyingRemoteState || !move?.sequence) return;
  if (move.sequence <= (onlineGame.lastSentSequence || 0)) return;
  const movedPiece = state.pieces.find((piece) => piece.id === move.pieceId);
  if (!movedPiece || movedPiece.color !== onlineGame.role) return;
  if (onlineGame.socket?.readyState !== WebSocket.OPEN) return;

  onlineGame.socket.send(JSON.stringify({
    type: "move",
    sequence: move.sequence,
    move: { pieceId: move.pieceId, square3D: move.square3D },
  }));
  onlineGame.lastSentSequence = move.sequence;
};

const onlineMenu = new OnlineMenuEnhancer(root, (onlineGame) => {
  const isWhite = onlineGame.role === "white";
  onlineGame.lastSentSequence = Number(onlineGame.state?.sequence) || 0;
  onlineGame.applyingRemoteState = false;
  application.onlineGame = onlineGame;
  attachOnlineSocket(onlineGame);
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
  application.presentation.gameConfig.mode = "online";
  application.presentation.gameConfig.humanSide = onlineGame.role;
  applyAuthoritativeState(onlineGame.state);
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
    if (application.onlineGame?.socket && application.onlineSocketHandler) {
      application.onlineGame.socket.removeEventListener("message", application.onlineSocketHandler);
    }
    profileMenu.dispose();
    onlineMenu.dispose();
    authGate.dispose();
    application.dispose();
  },
  { once: true },
);
registerServiceWorker();
