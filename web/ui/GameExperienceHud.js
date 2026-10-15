import { GameHud as BaseGameHud } from "./GameHud.js";
import { gameExperienceText } from "./gameExperienceCopy.js";
import "../styles/game-experience.css";
import "../styles/premium-hud.css";

/** Extend the existing HUD without duplicating its boards, settings or save UI. */
export class GameHud extends BaseGameHud {
  constructor(container, actions) {
    super(container, actions);
    // One menu destination only: gameplay uses the confirmed Exit control.
    // The ordinary Menu control is reserved for the demo/start screen.
    for (const [selector, testId] of [[".header-actions", "return-to-menu"]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "menu-button exit-match-button";
      button.setAttribute("aria-label", this.t("returnToMenu"));
      button.dataset.action = "return-to-menu";
      button.dataset.testid = testId;
      button.hidden = true;
      this.element.querySelector(selector).prepend(button);
    }
  }

  t(key, values) {
    return gameExperienceText(this.state?.language, key) ?? super.t(key, values);
  }

  async runAction(action, button) {
    if (action === "return-to-menu") return this.actions.returnToMenu();
    return super.runAction(action, button);
  }

  update(state) {
    super.update(state);
    const inMatch = state.appState !== "demo";
    const openMenu = this.element.querySelector('.game-header [data-action="open-menu"]');
    if (openMenu) {
      openMenu.hidden = inMatch;
      openMenu.disabled = inMatch;
      openMenu.setAttribute("aria-hidden", String(inMatch));
    }
    this.element.querySelectorAll('[data-action="return-to-menu"]').forEach(button => {
      button.textContent = `↩ ${this.t("returnToMenu")}`;
      button.setAttribute("aria-label", this.t("returnToMenu"));
      button.hidden = !inMatch;
    });
  }

  resetOpenPanels() {
    const computer = this.element.querySelector("[data-mini-computer]");
    computer.classList.remove("open");
    computer.setAttribute("aria-hidden", "true");
    const audio = this.element.querySelector("[data-audio]");
    if (audio) { audio.pause(); audio.removeAttribute("src"); audio.load(); }
    if (this.audioUrl) URL.revokeObjectURL(this.audioUrl);
    this.audioUrl = null;
    this.activeComputerTab = "myComputer";
    this.activePanel = "newGame";
    this.renderPanel();
  }
}
