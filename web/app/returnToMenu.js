/** A confirmed, in-document exit. Saved games and the signed-in identity are not deleted. */
export function returnToMenu(application, confirm = message => window.confirm(message)) {
  const { presentation } = application;
  const hasMatch = presentation.appState !== "demo" || Boolean(application.onlineGame);
  if (!hasMatch) { application.renderer.openMenu(); return true; }
  if (!confirm(application.hud.t("confirmReturnToMenu"))) return false;

  application.cancelSessionWork();
  application.attractMode.stop();
  // Invalidate gameplay before animation cleanup or network-close callbacks run.
  presentation.appState = "demo";
  presentation.menuOpen = true;
  presentation.busy = false;
  const online = application.onlineGame;
  application.onlineGame = null;
  if (online?.socket) {
    if (application.onlineSocketHandler) online.socket.removeEventListener("message", application.onlineSocketHandler);
    online.socket.close(1000, "Return to main menu");
  }
  application.onlineSocketHandler = null;
  for (const key of ["gameMode", "onlineRole", "onlineRoom"]) delete application.root.dataset[key];

  const pieces = application.renderer.pieceRenderer;
  for (const animation of pieces.animations.values()) {
    animation.object.position.copy(animation.to);
    pieces.removeMoveAura(animation.object);
    pieces.setBlueHighlight(animation.object, false, 0);
    animation.object.scale.setScalar(1);
  }
  pieces.animations.clear();
  application.renderer.selection.clearPendingSelection();
  application.hud.resetOpenPanels();
  application.attractMode.start();
  application.renderer.openMenu();
  application.hud.element.querySelector('[data-testid="menu-newGame"]')?.focus();
  return true;
}
