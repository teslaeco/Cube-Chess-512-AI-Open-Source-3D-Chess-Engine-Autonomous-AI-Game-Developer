const SESSION_KEY = "cubeChessIdentity";

const PRIMARY_PROVIDERS = [
  { id: "google", label: "Google", className: "auth-google" },
  { id: "apple", label: "Apple", className: "auth-apple" },
  { id: "microsoft", label: "Microsoft", className: "auth-microsoft" },
];

const MORE_PROVIDERS = [
  { id: "facebook", label: "Facebook", className: "auth-facebook" },
  { id: "github", label: "GitHub", className: "auth-github" },
  { id: "wechat", label: "WeChat", className: "auth-wechat" },
  { id: "qq", label: "QQ", className: "auth-qq" },
  { id: "line", label: "LINE", className: "auth-line" },
  { id: "phone", label: "Telefon / SMS", className: "auth-phone" },
  { id: "email", label: "E-mail", className: "auth-email" },
];

const ALL_PROVIDERS = [...PRIMARY_PROVIDERS, ...MORE_PROVIDERS];

function iconSvg(id) {
  const icons = {
    google: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.37Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.4l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.05v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.91A6 6 0 0 1 6.08 12c0-.66.11-1.3.31-1.91v-2.6H3.05A10 10 0 0 0 2 12c0 1.61.39 3.13 1.05 4.51l3.34-2.6Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.95 5.49l3.34 2.6C7.18 7.72 9.39 5.96 12 5.96Z"/></svg>`,
    apple: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.7 12.8c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9-.7 0-1.8-.9-3-.9-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 6.9 1.1 9.2.8 1.1 1.7 2.3 2.9 2.2 1.2 0 1.6-.7 3.1-.7s1.9.7 3.1.7c1.3 0 2.1-1.1 2.8-2.2.9-1.3 1.2-2.6 1.2-2.7-.1 0-2.5-1-2.5-3.5ZM14.4 6c.6-.7 1-1.8.9-2.9-.9 0-2 .6-2.6 1.3-.6.6-1.1 1.7-1 2.8 1 .1 2.1-.5 2.7-1.2Z"/></svg>`,
    microsoft: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#F25022" d="M2 2h9v9H2z"/><path fill="#7FBA00" d="M13 2h9v9h-9z"/><path fill="#00A4EF" d="M2 13h9v9H2z"/><path fill="#FFB900" d="M13 13h9v9h-9z"/></svg>`,
    facebook: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.86v-8.4H7.08V12h3.04V9.36c0-3 1.79-4.66 4.53-4.66 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.46h-2.79v8.4A12 12 0 0 0 24 12Z"/><path fill="#fff" d="M16.66 15.46 17.19 12h-3.32V9.75c0-.95.46-1.87 1.95-1.87h1.51V4.93s-1.37-.23-2.68-.23c-2.74 0-4.53 1.66-4.53 4.66V12H7.08v3.46h3.04v8.4c.61.1 1.24.14 1.88.14s1.27-.05 1.87-.14v-8.4h2.79Z"/></svg>`,
    github: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .7A11.5 11.5 0 0 0 8.36 23.1c.58.1.79-.25.79-.56v-2.2c-3.23.7-3.91-1.37-3.91-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.04 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.74-1.55-2.58-.29-5.29-1.29-5.29-5.75 0-1.27.46-2.31 1.19-3.13-.12-.29-.52-1.48.11-3.09 0 0 .97-.31 3.17 1.2A11 11 0 0 1 12 6c.98 0 1.96.13 2.88.39 2.2-1.5 3.17-1.2 3.17-1.2.63 1.61.23 2.8.11 3.09.74.82 1.19 1.86 1.19 3.13 0 4.47-2.72 5.45-5.31 5.74.42.36.79 1.07.79 2.16v3.23c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z"/></svg>`,
    wechat: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#07C160" d="M9.6 3C4.9 3 1 6.1 1 9.9c0 2.2 1.3 4.2 3.3 5.5l-.8 2.5 2.9-1.5c1 .3 2 .5 3.2.5h.5a6.6 6.6 0 0 1-.3-1.9c0-3.8 3.5-6.8 7.9-6.8h.8C17.6 5.2 13.9 3 9.6 3Z"/><path fill="#07C160" d="M23 15c0-3.1-3.2-5.7-7.1-5.7S8.8 11.9 8.8 15s3.2 5.7 7.1 5.7c.9 0 1.8-.1 2.6-.4l2.4 1.3-.7-2.1C21.9 18.5 23 16.8 23 15Z"/><circle cx="6.7" cy="8.2" r="1" fill="#fff"/><circle cx="12.1" cy="8.2" r="1" fill="#fff"/><circle cx="13.5" cy="13.6" r=".9" fill="#fff"/><circle cx="18.1" cy="13.6" r=".9" fill="#fff"/></svg>`,
    qq: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#12B7F5" d="M12 2c-3.8 0-6.3 3.3-6.3 7.4 0 .9.1 1.8.4 2.6-1.2 1.2-2 2.8-2 4.3 0 .8.3 1.3.8 1.3.4 0 .9-.3 1.5-.8.6 3 2.6 5.2 5.6 5.2s5-2.2 5.6-5.2c.6.5 1.1.8 1.5.8.5 0 .8-.5.8-1.3 0-1.5-.8-3.1-2-4.3.3-.8.4-1.7.4-2.6C18.3 5.3 15.8 2 12 2Z"/><ellipse cx="9.4" cy="9.1" rx="1.1" ry="1.7" fill="#fff"/><ellipse cx="14.6" cy="9.1" rx="1.1" ry="1.7" fill="#fff"/><path fill="#fff" d="M8.2 14.2c.8 1.3 2.1 2 3.8 2s3-.7 3.8-2c-1 .5-2.3.8-3.8.8s-2.8-.3-3.8-.8Z"/></svg>`,
    line: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#06C755" d="M12 2C5.9 2 1 6 1 11c0 4.5 4 8.2 9.3 8.9.4.1.9.3 1 .7.1.4.1 1 .1 1.4 0 .4-.2 1.6 1.4.9 1.6-.7 8.7-5.1 10-8.7.4-1 .6-2.1.6-3.2C23.4 6 18.1 2 12 2Z"/><path fill="#fff" d="M6.1 8.8h1.4v5H6.1zm2.2 0h1.4v5H8.3zm2.3 0H12l1.8 2.7V8.8h1.4v5h-1.4L12 11.1v2.7h-1.4zm5.4 0h3.2v1.2h-1.8v.7h1.7v1.2h-1.7v.7h1.9v1.2H16z"/></svg>`,
    phone: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 2.8 9 2.2c.6-.1 1.2.2 1.4.8l1.1 3.1c.2.5 0 1.1-.4 1.4L9.7 8.6c1.1 2.4 3 4.3 5.4 5.4l1.1-1.4c.4-.4.9-.6 1.4-.4l3.1 1.1c.6.2.9.8.8 1.4l-.6 2.4c-.2.7-.8 1.2-1.5 1.2C11.8 18.3 5.7 12.2 5.7 4.6c0-.8.4-1.5.9-1.8Z"/></svg>`,
    email: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm9 8.2L20.3 6H3.7L12 12.2Zm0 2.5L3 8v10h18V8l-9 6.7Z"/></svg>`,
  };
  return icons[id] ?? "";
}

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
  return { mode: "guest", provider: "guest", playerId: `guest-${randomUUID()}`, displayName: "Gość" };
}

function oauthBaseUrl() {
  return String(import.meta.env.VITE_AUTH_BASE_URL ?? "").replace(/\/$/, "");
}

function callbackIdentity() {
  const url = new URL(window.location.href);
  const provider = url.searchParams.get("auth_provider");
  const playerId = url.searchParams.get("player_id");
  if (!provider || !playerId) return null;
  const identity = { mode: "account", provider, playerId, displayName: url.searchParams.get("display_name") || "Cube Chess Player" };
  for (const key of ["auth_provider", "player_id", "display_name"]) url.searchParams.delete(key);
  window.history.replaceState({}, "", url);
  return identity;
}

function providerMarkup(provider) {
  return `<button type="button" class="auth-provider ${provider.className}" data-auth="${provider.id}"><span class="auth-provider-icon" aria-hidden="true">${iconSvg(provider.id)}</span><span>Zaloguj przez ${provider.label}</span></button>`;
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
        <div class="auth-primary-list">${PRIMARY_PROVIDERS.map(providerMarkup).join("")}</div>
        <button type="button" class="auth-more-toggle" data-auth-more aria-expanded="false"><span>Więcej sposobów logowania</span><span class="auth-more-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span></button>
        <div class="auth-more-panel" data-auth-more-panel hidden>${MORE_PROVIDERS.map(providerMarkup).join("")}</div>
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
      if (button) this.choose(button.dataset.auth);
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
