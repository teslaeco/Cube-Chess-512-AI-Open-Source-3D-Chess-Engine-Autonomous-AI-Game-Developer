const DEFAULT_REGION = "europe";
const IDENTITY_KEY = "cubeChessIdentity";
const PLAYER_ID_KEY = "cubeChessPlayerId";
const DEFAULT_MULTIPLAYER_URL = "https://cube-chess-512-server.onrender.com";

function multiplayerBaseUrl() {
  return String(import.meta.env.VITE_MULTIPLAYER_URL || DEFAULT_MULTIPLAYER_URL).replace(/\/$/, "");
}

function multiplayerWebSocketUrl() {
  const url = new URL(multiplayerBaseUrl());
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.href.replace(/\/$/, "");
}

function identity() {
  try {
    return JSON.parse(sessionStorage.getItem(IDENTITY_KEY) || "null");
  } catch {
    return null;
  }
}

function playerId() {
  let value = sessionStorage.getItem(PLAYER_ID_KEY);
  if (!value) {
    value = `guest_${crypto.randomUUID().replace(/-/g, "")}`;
    sessionStorage.setItem(PLAYER_ID_KEY, value);
  }
  return value;
}

function invitationToken(value) {
  const input = String(value || "").trim();
  if (!input) return "";
  try {
    const url = new URL(input, location.href);
    return url.searchParams.get("invite") || input;
  } catch {
    return input;
  }
}

export class OnlineMenuEnhancer {
  constructor(root) {
    this.root = root;
    this.socket = null;
    this.room = null;
    this.pendingMessage = null;
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

    const player = identity();
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
          <label>Token lub link zaproszenia<input name="inviteToken" maxlength="500" autocomplete="off" placeholder="Wklej token lub pełny link" required></label>
          <button class="primary-action" type="submit">Dołącz</button>
        </form>
      </div>
      <div class="online-room-card" data-online-room hidden>
        <div><small>Kod pokoju</small><strong data-room-code></strong></div>
        <div><small>Rola</small><strong data-room-role>—</strong></div>
        <div><small>Status</small><strong data-room-status>Łączenie…</strong></div>
        <div class="online-room-buttons"><button data-copy-invite>Kopiuj link zaproszenia</button><button data-ready-player>Gotowy</button></div>
      </div>
      <p class="online-server-status online" data-online-status>Publiczny serwer multiplayer jest gotowy. Utwórz pokój albo dołącz kodem i tokenem.</p>`;
    panel.prepend(lobby);

    const params = new URLSearchParams(location.search);
    const roomCode = params.get("room");
    const invite = params.get("invite");
    const region = params.get("region") || DEFAULT_REGION;
    if (roomCode && invite) {
      const form = lobby.querySelector("[data-join-room-form]");
      form.elements.roomCode.value = roomCode;
      form.elements.inviteToken.value = invite;
      queueMicrotask(() => this.openRoom(region, roomCode.toUpperCase(), "join-private", invite));
    }
  }

  submit(event) {
    const createForm = event.target.closest("[data-create-room-form]");
    const joinForm = event.target.closest("[data-join-room-form]");
    if (!createForm && !joinForm) return;
    event.preventDefault();

    if (createForm) {
      const data = new FormData(createForm);
      this.openRoom(data.get("region")?.toString() || DEFAULT_REGION, "", "create-room");
      return;
    }

    const data = new FormData(joinForm);
    const code = data.get("roomCode")?.toString().trim().toUpperCase();
    const token = invitationToken(data.get("inviteToken"));
    if (code && token) this.openRoom(DEFAULT_REGION, code, "join-private", token);
  }

  openRoom(region, roomCode, type, inviteToken = "") {
    const card = this.root.querySelector("[data-online-room]");
    card.hidden = false;
    card.dataset.region = region;
    card.dataset.roomCode = roomCode;
    card.dataset.inviteToken = inviteToken;
    card.querySelector("[data-room-code]").textContent = roomCode || "Tworzenie…";
    card.querySelector("[data-room-status]").textContent = "Łączenie z serwerem…";
    this.setStatus("Budzenie i łączenie z serwerem Render…", "online");

    this.pendingMessage = type === "create-room"
      ? { type, region, playerId: playerId() }
      : { type, region, roomCode, inviteToken, playerId: playerId() };

    this.connect();
  }

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.sendPending();
      return;
    }
    if (this.socket?.readyState === WebSocket.CONNECTING) return;

    this.socket = new WebSocket(multiplayerWebSocketUrl());
    this.socket.addEventListener("open", () => {
      this.setStatus("Połączono z serwerem multiplayer.", "online");
      this.sendPending();
    });
    this.socket.addEventListener("message", (event) => this.handleServerMessage(event.data));
    this.socket.addEventListener("close", () => {
      this.setStatus("Połączenie z serwerem zostało przerwane. Spróbuj ponownie.", "offline");
      this.socket = null;
    });
    this.socket.addEventListener("error", () => {
      this.setStatus("Nie udało się połączyć z serwerem multiplayer.", "offline");
    });
  }

  sendPending() {
    if (!this.pendingMessage || this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(this.pendingMessage));
    this.pendingMessage = null;
  }

  handleServerMessage(raw) {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      this.setStatus("Serwer zwrócił nieprawidłową odpowiedź.", "offline");
      return;
    }

    if (message.type === "error") {
      this.setStatus(message.message || "Serwer odrzucił żądanie.", "offline");
      return;
    }

    if (message.type === "room-created") {
      this.room = message;
      this.updateRoom(message.roomCode, message.role, "Pokój utworzony. Wyślij link drugiemu graczowi.");
      return;
    }

    if (message.type === "joined" || message.type === "reconnected") {
      this.room = { ...this.room, ...message };
      this.updateRoom(this.room?.roomCode || this.root.querySelector("[data-online-room]")?.dataset.roomCode, message.role, "Dołączono do pokoju. Ustaw gotowość.");
      return;
    }

    if (message.type === "state") {
      const players = message.state?.players || [];
      const readyCount = players.filter((entry) => entry.ready).length;
      const status = players.length >= 2 && readyCount >= 2
        ? "Obaj gracze gotowi — partia może się rozpocząć."
        : `Gracze: ${players.length}/2, gotowi: ${readyCount}/2`;
      this.updateRoom(undefined, undefined, status);
    }
  }

  updateRoom(code, role, status) {
    const card = this.root.querySelector("[data-online-room]");
    if (!card) return;
    if (code) {
      card.dataset.roomCode = code;
      card.querySelector("[data-room-code]").textContent = code;
    }
    if (role) card.querySelector("[data-room-role]").textContent = role === "white" ? "Białe" : role === "black" ? "Czarne" : "Obserwator";
    if (status) card.querySelector("[data-room-status]").textContent = status;
  }

  setStatus(text, state) {
    const element = this.root.querySelector("[data-online-status]");
    if (!element) return;
    element.textContent = text;
    element.className = `online-server-status ${state}`;
  }

  async click(event) {
    const copy = event.target.closest("[data-copy-invite]");
    const ready = event.target.closest("[data-ready-player]");
    if (copy) {
      if (!this.room?.inviteToken) {
        this.setStatus("Link zaproszenia jest dostępny tylko dla twórcy pokoju.", "offline");
        return;
      }
      const url = new URL(location.href);
      url.searchParams.set("region", this.room.region);
      url.searchParams.set("room", this.room.roomCode);
      url.searchParams.set("invite", this.room.inviteToken);
      await navigator.clipboard.writeText(url.href);
      copy.textContent = "Skopiowano";
      this.setStatus("Link zaproszenia skopiowany. Wyślij go drugiemu graczowi.", "online");
    }
    if (ready) {
      const isReady = !ready.classList.contains("ready");
      if (this.socket?.readyState !== WebSocket.OPEN) {
        this.setStatus("Najpierw połącz się z pokojem.", "offline");
        return;
      }
      this.socket.send(JSON.stringify({ type: "ready", ready: isReady }));
      ready.classList.toggle("ready", isReady);
      ready.textContent = isReady ? "Gotowy ✓" : "Gotowy";
    }
  }

  dispose() {
    this.socket?.close();
    this.observer.disconnect();
    this.root.removeEventListener("submit", this.handleSubmit);
    this.root.removeEventListener("click", this.handleClick);
  }
}
