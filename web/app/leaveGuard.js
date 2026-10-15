/**
 * The browser owns the beforeunload prompt text; custom messages are ignored
 * by current Chrome/Safari/Firefox. Request the native confirmation only for
 * a real active match, never for the anonymous attract-mode demo.
 *
 * A previously saved game can still have new unsaved moves, so the guard stays
 * active until the player explicitly ends the match in the in-page menu.
 */
export function hasActiveChessMatch(presentation) {
  return Boolean(
    presentation &&
    (presentation.appState === "playing" || presentation.appState === "gameOver") &&
    presentation.gameConfig?.mode !== "demo"
  );
}

export function confirmLeavingActiveMatch(event, presentation) {
  if (!hasActiveChessMatch(presentation)) return false;
  event.preventDefault();
  // Required as a legacy compatibility signal; browsers show their own text.
  event.returnValue = "";
  return true;
}
