const DEFAULT_REGION = "europe";
const IDENTITY_KEY = "cubeChessIdentity";

function multiplayerBaseUrl() {
  return String(import.meta.env.VITE_MULTIPLAYER_URL ?? "").replace(/\/$/, "");
}

function identity() {
  try {
    return JSON.parse(sessionStorage.getItem(IDENTITY_KEY) || "null");
  } catch {
    return null;
  }
}

function randomRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

export class OnlineMenuEnhancer {
  constructor(root) {
    this.root = root;
    this.observer = new MutationObserver(() => this.refresh());
    this.observer.observe(root, { childList: true, subtree: true, attributes: true });
    this.handleSubmit = (event) => this.submit(event);
    this.handleClick = (event) => this.click(event);
    root.addEventListener("submit", this.handleSubmit);
    root.addEventListener("click", this.handleClick);
    this.refresh();
  }

  refresh() {
    const onlineButton = this.root.querySelector("[data-testid='menu-online'].active");
    const panel = this.root.querySelector("[data-menu-panel]");
    if (!onlineButton || !panel || panel.querySelector("[data-online-lobby]")) return;

    const base = multiplayerBaseUrl();
    const player = identity();
    const status = base
      ? "Serwer multiplayer jest skonfigurowany. Możesz utworzyć pokój lub dołączyć kodem."
      : "Frontend lobby jest gotowy, ale GitHub Pages nie uruchamia serwera gry. Ustaw VITE_MULTIPLAYER_URL po wdrożeniu backendu.";

    const lobby = document.createElement("section");
    lobby.className = "online-lobby";
    lobby.dataset.onlineLobby = "";
    lobby.innerHTML = `
      <div class="online-identity">
        <span class="online-avatar" aria-hidden="true">${player?.mode === "account" ? "✓" : "G"}</span>
        <div><strong>${player?.displayName || "Gość"}</strong><small>${player?.mode === "account" ? `Konto: ${player.provider}` : "Sesja gościa"}</small></div>
      </div>
      <div class="online-actions-grid">
        <form data-create-room-form>
          <h3>Utwórz prywatny pokój</h3>
          <label>Region<select name="region">
            <option value="europe">Europa</option><option value="asia">Azja</option><option value="africa">Afryka</option><option value="north-america">Ameryka Północna</option><option value="south-america">Ameryka Południowa</option><option value="australia">Australia</option><option value="arctic">Arktyka</option><option value="antarctica">Antarktyda</option>
          </select></label>
          <button class="primary-action" type="submit">Utwórz pokój</button>
        </form>
        <form data-join-room-form>
          <h3>Dołącz do znajomego</h3>
          <label>Kod pokoju<input name="roomCode" maxlength="12" autocomplete="off" placeholder="NP. 7K9M2ABC" required></label>
          <label>Token zaproszenia<input name="inviteToken" maxlength="160" autocomplete="off" placeholder="Wklej token lub link"></label>
          <button class="primary-action" type="submit">Dołącz</button>
        </form>
      </div>
      <div class="online-room-card" data-online-room hidden>
        <div><small>Kod pokoju</small><strong data-room-code></strong></div>
        <div><small>Status</small><strong data-room-status>Oczekiwanie na drugiego gracza</strong></div>
        <div class="online-room-buttons"><button data-copy-invite>Kopiuj link zaproszenia</button><button data-ready-player>Gotowy</button></div>
      </div>
      <p class="online-server-status ${base ? "online" : "offline"}" data-online-status>${status}</p>`;
    panel.prepend(lobby);
  }

  submit(event) {
    const createForm = event.target.closest("[data-create-room-form]");
    const joinForm = event.target.closest("[data-join-room-form]");
    if (!createForm && !joinForm) return;
    event.preventDefault();
    const base = multiplayerBaseUrl();
    const status = this.root.querySelector("[data-online-status]");
    if (!base) {
      status.textContent = "Nie można połączyć: publiczny serwer multiplayer nie jest jeszcze wdrożony. Interfejs jest gotowy, ale trzeba uruchomić backend poza GitHub Pages.";
      status.className = "online-server-status offline";
      return;
    }
    if (createForm) {
      const data = new FormData(createForm);
      this.openRoom(data.get("region")?.toString() || DEFAULT_REGION, randomRoomCode());
    } else {
      const data = new FormData(joinForm);
      const code = data.get("roomCode")?.toString().trim().toUpperCase();
      if (code) this.openRoom(DEFAULT_REGION, code);
    }
  }

  openRoom(region, roomCode) {
    const card = this.root.querySelector("[data-online-room]");
    card.hidden = false;
    card.dataset.region = region;
    card.dataset.roomCode = roomCode;
    card.querySelector("[data-room-code]").textContent = roomCode;
    this.root.querySelector("[data-online-status]").textContent = "Pokój przygotowany. Łączenie z serwerem multiplayer…";
  }

  async click(event) {
    const copy = event.target.closest("[data-copy-invite]");
    const ready = event.target.closest("[data-ready-player]");
    if (copy) {
      const card = this.root.querySelector("[data-online-room]");
      const url = new URL(location.href);
      url.searchParams.set("region", card.dataset.region);
      url.searchParams.set("room", card.dataset.roomCode);
      await navigator.clipboard.writeText(url.href);
      copy.textContent = "Skopiowano";
    }
    if (ready) {
      ready.classList.toggle("ready");
      ready.textContent = ready.classList.contains("ready") ? "Gotowy ✓" : "Gotowy";
    }
  }

  dispose() {
    this.observer.disconnect();
    this.root.removeEventListener("submit", this.handleSubmit);
    this.root.removeEventListener("click", this.handleClick);
  }
}
