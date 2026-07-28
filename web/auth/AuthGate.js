const SESSION_KEY = "cubeChessIdentity";

const PRIMARY_PROVIDERS = [
  { id: "google", label: "Google", icon: "G", className: "auth-google" },
  { id: "apple", label: "Apple", icon: "", className: "auth-apple" },
  { id: "microsoft", label: "Microsoft", icon: "⊞", className: "auth-microsoft" },
];

const MORE_PROVIDERS = [
  { id: "facebook", label: "Facebook", icon: "f", className: "auth-facebook" },
  { id: "github", label: "GitHub", icon: "◉", className: "auth-github" },
  { id: "wechat", label: "WeChat", icon: "微", className: "auth-wechat" },
  { id: "qq", label: "QQ", icon: "Q", className: "auth-qq" },
  { id: "line", label: "LINE", icon: "L", className: "auth-line" },
  { id: "phone", label: "Telefon / SMS", icon: "☎", className: "auth-phone" },
  { id: "email", label: "E-mail", icon: "@", className: "auth-email" },
];

const ALL_PROVIDERS = [...PRIMARY_PROVIDERS, ...MORE_PROVIDERS];

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

function providerMarkup(provider) {
  return `<button type="button" class="auth-provider ${provider.className}" data-auth="${provider.id}"><span class="auth-provider-icon" aria-hidden="true">${provider.icon}</span><span>Zaloguj przez ${provider.label}</span></button>`;
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
        <div class="auth-primary-list">
          ${PRIMARY_PROVIDERS.map(providerMarkup).join("")}
        </div>
        <button type="button" class="auth-more-toggle" data-auth-more aria-expanded="false">
          <span>Więcej sposobów logowania</span><span class="auth-more-icon" aria-hidden="true">⌄</span>
        </button>
        <div class="auth-more-panel" data-auth-more-panel hidden>
          ${MORE_PROVIDERS.map(providerMarkup).join("")}
        </div>
        <div class="auth-divider"><span>lub</span></div>
        <button type="button" class="auth-guest" data-auth="guest">Zagraj jako gość <span aria-hidden="true">→</span></button>
        <p class="auth-note" data-auth-note>Tryb gościa działa od razu. Logowanie zewnętrzne zostanie aktywowane po podłączeniu publicznego serwera uwierzytelniania.</p>
      </div>`;
    container.append(this.element);
    this.handleClick = (event) => {
      const moreButton = event.target.closest("[data-auth-more]");
      if (moreButton) {
        const panel = this.element.querySelector("[data-auth-more-panel]");
        const expanded = moreButton.getAttribute("aria-expanded") === "true";
        moreButton.setAttribute("aria-expanded", String(!expanded));
        panel.hidden = expanded;
        return;
      }
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
      const label = ALL_PROVIDERS.find((entry) => entry.id === provider)?.label ?? provider;
      note.textContent = `Logowanie przez ${label} wymaga uruchomionego backendu i kluczy dostawcy. Na razie wybierz tryb gościa.`;
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
