export function executeAutomatedMovePreservingLevel(presentation, move) {
  const playerLevel = presentation.activeLevel;
  const executed = presentation.executeMove(move, { allowBusy: true });
  if (executed) presentation.setActiveLevel(playerLevel);
  return executed;
}
