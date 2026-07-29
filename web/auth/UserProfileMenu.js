export class UserProfileMenu {
  constructor(container, authGate) {
    this.container = container;
    this.authGate = authGate;
    this.identity = null;
    this.element = document.createElement("aside");
    this.element.className = "user-profile-menu";
    this.element.hidden = true;
    this.element.innerHTML = `
      <button class="user-profile-trigger" type="button" data-profile-trigger aria-expanded="false">
        <span class="user-profile-avatar" data-profile-avatar aria-hidden="true">U</span>
        <span class="user-profile-summary"><strong data-profile-name>Gracz</strong><small data-profile-email></small></span>
      </button>
      <section class="user-profile-panel" data-profile-panel hidden>
        <header>
          <div class="user-profile-avatar large" data-profile-avatar-large aria-hidden="true">U</div>
          <div><strong data-profile-name-panel>Gracz</strong><small data-profile-email-panel></small></div>
        </header>
        <nav aria-label="Konto gracza">
          <button type="button" data-profile-action="profile">Mój profil</button>
          <button type="button" data-profile-action="friends">Znajomi</button>
          <button type="button" data-profile-action="invitations">Zaproszenia</button>
          <button type="button" data-profile-action="history">Historia partii</button>
          <button type="button" data-profile-action="settings">Ustawienia</button>
          <button type="button" class="danger" data-profile-action="logout">Wyloguj</button>
        </nav>
        <section class="user-profile-details" data-profile-details hidden>
          <h2>Profil gracza</h2>
          <dl>
            <div><dt>Nazwa</dt><dd data-detail-name></dd></div>
            <div><dt>E-mail</dt><dd data-detail-email></dd></div>
            <div><dt>Ranking ELO</dt><dd>1200</dd></div>
            <div><dt>Rozegrane partie</dt><dd>0</dd></div>
            <div><dt>Wygrane</dt><dd>0</dd></div>
          </dl>
          <p>Rozbudowana edycja bio, kraju, zdjęcia profilowego i statystyk zostanie podłączona do tabeli profiles w kolejnym etapie.</p>
        </section>
      </section>`;
    container.append(this.element);

    this.handleClick = async (event) => {
      const trigger = event.target.closest("[data-profile-trigger]");
      if (trigger) {
        const panel = this.element.querySelector("[data-profile-panel]");
        const expanded = trigger.getAttribute("aria-expanded") === "true";
        trigger.setAttribute("aria-expanded", String(!expanded));
        panel.hidden = expanded;
        return;
      }
      const action = event.target.closest("[data-profile-action]")?.dataset.profileAction;
      if (!action) return;
      if (action === "logout") {
        await this.authGate.signOut();
        this.hide();
        return;
      }
      if (action === "profile") {
        this.element.querySelector("[data-profile-details]").hidden = false;
      }
    };
    this.element.addEventListener("click", this.handleClick);
  }

  show(identity) {
    this.identity = identity;
    const name = identity.displayName || "Gracz";
    const email = identity.email || "";
    const initial = name.trim().charAt(0).toUpperCase() || "U";
    this.element.querySelectorAll("[data-profile-avatar], [data-profile-avatar-large]").forEach((node) => {
      node.textContent = initial;
      if (identity.avatarUrl) {
        node.style.backgroundImage = `url(${JSON.stringify(identity.avatarUrl).slice(1, -1)})`;
        node.classList.add("has-image");
      }
    });
    this.element.querySelector("[data-profile-name]").textContent = name;
    this.element.querySelector("[data-profile-email]").textContent = email;
    this.element.querySelector("[data-profile-name-panel]").textContent = name;
    this.element.querySelector("[data-profile-email-panel]").textContent = email;
    this.element.querySelector("[data-detail-name]").textContent = name;
    this.element.querySelector("[data-detail-email]").textContent = email || "Brak";
    this.element.hidden = false;
  }

  hide() {
    this.identity = null;
    this.element.hidden = true;
    this.element.querySelector("[data-profile-panel]").hidden = true;
    this.element.querySelector("[data-profile-trigger]").setAttribute("aria-expanded", "false");
  }

  dispose() {
    this.element.removeEventListener("click", this.handleClick);
    this.element.remove();
  }
}
