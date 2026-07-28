const SESSION_KEY = "cubeChessIdentity";

export function parseStoredIdentity(value) {
  try {
    const identity = value ? JSON.parse(value) : null;
    if (!identity || typeof identity !== "object") return null;
    if (typeof identity.playerId !== "string" || !identity.playerId) return null;
    if (identity.mode !== "guest" && identity.mode !== "account") return null;
    return identity;
  } catch {
    return null;
  }
}

export function createGuestIdentity(randomUUID = () => crypto.randomUUID()) {
  return {
    mode: "guest",
    provider: "guest",
    playerId: `guest-${randomUUID()}`,
    displayName: "Gość",
  };
}

function oauthBaseUrl() {
  return String(import.meta.env.VITE_AUTH_BASE_URL ?? "").replace(/\/$/, "");
}

function callbackIdentity() {
  const url = new URL(window.location.href);
  const provider = url.searchParams.get("auth_provider");
  const playerId = url.searchParams.get("player_id");
  if (!provider || !playerId) return null;
  const identity = {
    mode: "account",
    provider,
    playerId,
    displayName: url.searchParams.get("display_name") || "Cube Chess Player",
  };
  for (const key of ["auth_provider", "player_id", "display_name"]) {
    url.searchParams.delete(key);
  }
  window.history.replaceState({}, "", url);
  return identity;
}

export class AuthGate {
  constructor(container, onAuthenticated) {
    this.container = container;
    this.onAuthenticated = onAuthenticated;
    this.element = document.createElement("section");
    this.element.className = "auth-gate";
    this.element.setAttribute("role", "dialog");
    this.element.setAttribute("aria-modal", "true");
    this.element.setAttribute("aria-labelledby", "auth-title");
    this.element.innerHTML = `
      <div class="auth-card">
        <p class="auth-eyebrow">Terraforming Planet · Open Source</p>
        <div class="auth-brand"><span>512</span><div><strong>Cube Chess 512 AI</strong><small>8×8×8 · 512 pól</small></div></div>
        <h1 id="auth-title">Witaj w Cube Chess 512</h1>
        <p class="auth-intro">Zaloguj się, aby zachować znajomych, ranking i historię partii, albo rozpocznij od razu jako gość.</p>
        <div class="auth-actions">
          <button type="button" class="auth-provider auth-google" data-auth="google"><span aria-hidden="true">G</span>Zaloguj przez Google</button>
          <button type="button" class="auth-provider auth-apple" data-auth="apple"><span aria-hidden="true">●</span>Zaloguj przez Apple</button>
          <div class="auth-divider"><span>lub</span></div>
          <button type="button" class="auth-guest" data-auth="guest">Zagraj jako gość <span aria-hidden="true">→</span></button>
        </div>
        <p class="auth-note" data-auth-note>Tryb gościa działa bez konta. Logowanie Google i Apple wymaga uruchomionego publicznego serwera uwierzytelniania.</p>
      </div>`;
    container.append(this.element);
    this.handleClick = (event) => {
      const button = event.target.closest("[data-auth]");
      if (!button) return;
      this.choose(button.dataset.auth);
    };
    this.element.addEventListener("click", this.handleClick);

    const identity = callbackIdentity() ?? parseStoredIdentity(sessionStorage.getItem(SESSION_KEY));
    if (identity) this.complete(identity);
  }

  choose(provider) {
    if (provider === "guest") {
      const identity = createGuestIdentity();
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(identity));
      this.complete(identity);
      return;
    }
    const base = oauthBaseUrl();
    if (!base) {
      const note = this.element.querySelector("[data-auth-note]");
      note.textContent = `Logowanie ${provider === "google" ? "Google" : "Apple"} będzie aktywne po podłączeniu adresu serwera VITE_AUTH_BASE_URL. Na razie wybierz tryb gościa.`;
      note.setAttribute("role", "alert");
      return;
    }
    const returnTo = new URL(window.location.href);
    returnTo.search = "";
    const target = new URL(`${base}/auth/${provider}`);
    target.searchParams.set("returnTo", returnTo.href);
    window.location.assign(target.href);
  }

  complete(identity) {
    this.identity = identity;
    this.element.classList.add("auth-gate-hidden");
    this.element.setAttribute("aria-hidden", "true");
    this.onAuthenticated(identity);
  }

  dispose() {
    this.element.removeEventListener("click", this.handleClick);
    this.element.remove();
  }
}
