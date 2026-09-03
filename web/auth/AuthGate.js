import { AuthApi, authBackendConfigured } from "./AuthApi.js";

const SESSION_KEY = "cubeChessIdentity";

const PRIMARY_PROVIDERS = [
  { id: "apple", label: "Apple", className: "auth-apple" },
  { id: "google", label: "Google", className: "auth-google" },
  { id: "playstation", label: "PlayStation", className: "auth-playstation" },
  { id: "steam", label: "Steam", className: "auth-steam" },
  { id: "microsoft", label: "Microsoft / Xbox", className: "auth-microsoft" },
];

const MORE_PROVIDERS = [
  { id: "facebook", label: "Facebook", className: "auth-facebook" },
  { id: "github", label: "GitHub", className: "auth-github" },
  { id: "wechat", label: "WeChat", className: "auth-wechat" },
  { id: "qq", label: "QQ", className: "auth-qq" },
  { id: "line", label: "LINE", className: "auth-line" },
  { id: "phone", label: "Telefon / SMS", className: "auth-phone" },
];
const ALL_PROVIDERS = [...PRIMARY_PROVIDERS, ...MORE_PROVIDERS];

function iconSvg(id) {
  const icons = {
    apple: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.7 12.8c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9-.7 0-1.8-.9-3-.9-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 6.9 1.1 9.2.8 1.1 1.7 2.3 2.9 2.2 1.2 0 1.6-.7 3.1-.7s1.9.7 3.1.7c1.3 0 2.1-1.1 2.8-2.2.9-1.3 1.2-2.6 1.2-2.7-.1 0-2.5-1-2.5-3.5ZM14.4 6c.6-.7 1-1.8.9-2.9-.9 0-2 .6-2.6 1.3-.6.6-1.1 1.7-1 2.8 1 .1 2.1-.5 2.7-1.2Z"/></svg>`,
    google: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.37Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.4l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.05v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.91A6 6 0 0 1 6.08 12c0-.66.11-1.3.31-1.91v-2.6H3.05A10 10 0 0 0 2 12c0 1.61.39 3.13 1.05 4.51l3.34-2.6Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.95 5.49l3.34 2.6C7.18 7.72 9.39 5.96 12 5.96Z"/></svg>`,
    playstation: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.7 3v14.2l3.1 1V6.4c0-.6.3-1 .8-.8.7.2.9.9.9 1.5v4.7c2.3 1.1 4.1 0 4.1-2.9 0-3-1.1-4.3-4.3-5.4C12.5 2.9 10.8 2.7 9.7 3Zm-1.5 9.7-3.7 1.4c-2.5.9-2.9 2.2-.9 2.9 1.9.6 5.2.5 7.7-.4v-2.2l-1.1.4c-1.1.4-2.7.5-3.6.2-.8-.3-.7-.8.3-1.2l1.3-.5v-.6Zm6 1.1v2.5l3.7-1.3c1-.4 1.2-.9.4-1.2-.8-.3-2.2-.2-3.3.2l-.8.3v-.5Z"/></svg>`,
    steam: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1b2838"/><path fill="#fff" d="M11.2 14.8 8.4 13.6a3.1 3.1 0 0 0-1.8-.1l-4-1.7a9.4 9.4 0 0 0 .8 3l3.1 1.3a3.1 3.1 0 0 0 5.9-.1l3.8-2.7h.2a4.3 4.3 0 1 0-4.2-5.1l-2.6 3.7c.8.6 1.4 1.6 1.6 2.9Zm-3.7 3.3a1.9 1.9 0 1 1 1.5-3.5l1.4.6a1.9 1.9 0 0 1-2.9 2.9Zm8.9-6.7a2.4 2.4 0 1 1 0-4.8 2.4 2.4 0 0 1 0 4.8Z"/></svg>`,
    microsoft: `<svg viewBox="0 0 48 24" aria-hidden="true"><g transform="translate(1 4)"><path fill="#F25022" d="M0 0h7v7H0z"/><path fill="#7FBA00" d="M9 0h7v7H9z"/><path fill="#00A4EF" d="M0 9h7v7H0z"/><path fill="#FFB900" d="M9 9h7v7H9z"/></g><g transform="translate(25 2)" fill="none" stroke="#55b7ff" stroke-width="2"><circle cx="10" cy="10" r="9"/><path d="M5 7c1.5 0 2.8 1 5 3 2.2-2 3.5-3 5-3M7 15l3-5 3 5"/></g></svg>`,
    facebook: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#1877F2"/><path fill="#fff" d="M13.6 20v-7h2.4l.4-2.8h-2.8V8.4c0-.8.2-1.4 1.4-1.4h1.5V4.5c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.1H8.5V13H11v7h2.6Z"/></svg>`,
    github: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 .7A11.5 11.5 0 0 0 8.36 23.1c.58.1.79-.25.79-.56v-2.2c-3.23.7-3.91-1.37-3.91-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.04 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.74-1.55-2.58-.29-5.29-1.29-5.29-5.75 0-1.27.46-2.31 1.19-3.13-.12-.29-.52-1.48.11-3.09 0 0 .97-.31 3.17 1.2A11 11 0 0 1 12 6c.98 0 1.96.13 2.88.39 2.2-1.5 3.17-1.2 3.17-1.2.63 1.61.23 2.8.11 3.09.74.82 1.19 1.86 1.19 3.13 0 4.47-2.72 5.45-5.31 5.74.42.36.79 1.07.79 2.16v3.23c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z"/></svg>`,
    wechat: `<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="7" fill="#07C160"/><circle cx="15.5" cy="15" r="6" fill="#07C160"/></svg>`,
    qq: `<svg viewBox="0 0 24 24"><path fill="#12B7F5" d="M12 2c-3.8 0-6.3 3.3-6.3 7.4 0 .9.1 1.8.4 2.6-1.2 1.2-2 2.8-2 4.3 0 .8.3 1.3.8 1.3.4 0 .9-.3 1.5-.8.6 3 2.6 5.2 5.6 5.2s5-2.2 5.6-5.2c.6.5 1.1.8 1.5.8.5 0 .8-.5.8-1.3 0-1.5-.8-3.1-2-4.3.3-.8.4-1.7.4-2.6C18.3 5.3 15.8 2 12 2Z"/></svg>`,
    line: `<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="6" fill="#06C755"/><path fill="#fff" d="M6 8h2v6H6zm3 0h2v6H9zm3 0h2l2 3V8h2v6h-2l-2-3v3h-2z"/></svg>`,
    phone: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6.6 2.8 9 2.2c.6-.1 1.2.2 1.4.8l1.1 3.1c.2.5 0 1.1-.4 1.4L9.7 8.6c1.1 2.4 3 4.3 5.4 5.4l1.1-1.4c.4-.4.9-.6 1.4-.4l3.1 1.1c.6.2.9.8.8 1.4l-.6 2.4c-.2.7-.8 1.2-1.5 1.2C11.8 18.3 5.7 12.2 5.7 4.6c0-.8.4-1.5.9-1.8Z"/></svg>`,
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
  return {
    mode: "guest",
    provider: "guest",
    playerId: `guest-${randomUUID()}`,
    displayName: "Gość",
  };
}

export function isDirectGuestEntry(locationLike = window.location) {
  const search = String(locationLike?.search ?? "");
  const pathname = String(locationLike?.pathname ?? "");
  return new URLSearchParams(search).get("guest") === "1" || /\/guest\.html$/.test(pathname);
}

function providerMarkup(provider) {
  return `<button type="button" class="auth-provider ${provider.className}" data-auth="${provider.id}"><span class="auth-provider-icon" aria-hidden="true">${iconSvg(provider.id)}</span><span>Zaloguj przez ${provider.label}</span></button>`;
}

function accountForm(mode) {
  const title =
    mode === "register"
      ? "Załóż konto"
      : mode === "reset"
        ? "Zresetuj hasło"
        : "Zaloguj e-mailem";
  return `<form class="auth-account-form" data-account-form data-mode="${mode}">
    <div class="auth-form-heading"><strong>${title}</strong><button type="button" data-account-close aria-label="Zamknij">×</button></div>
    ${mode === "register" ? `<label>Nazwa gracza<input name="displayName" required minlength="2" maxlength="40" autocomplete="nickname"></label>` : ""}
    <label>E-mail<input name="email" type="email" required autocomplete="email"></label>
    ${mode !== "reset" ? `<label>Hasło<input name="password" type="password" required minlength="12" autocomplete="${mode === "register" ? "new-password" : "current-password"}"></label>` : ""}
    ${mode === "register" ? `<label class="auth-consent"><input name="acceptTerms" type="checkbox" required> Akceptuję regulamin i politykę prywatności.</label>` : ""}
    <button class="auth-account-submit" type="submit">${title}</button>
    ${mode === "login" ? `<button type="button" class="auth-forgot-inline" data-account="reset">Nie pamiętam hasła</button>` : ""}
    <p class="auth-form-message" data-account-message aria-live="polite"></p>
  </form>`;
}

export class AuthGate {
  constructor(container, onAuthenticated) {
    this.container = container;
    this.onAuthenticated = onAuthenticated;
    this.api = new AuthApi();
    this.element = document.createElement("section");
    this.element.className = "auth-gate";
    this.element.setAttribute("role", "dialog");
    this.element.setAttribute("aria-modal", "true");
    this.element.setAttribute("aria-labelledby", "auth-title");
    this.element.innerHTML = `<div class="auth-card">
      <p class="auth-eyebrow">Terraforming Planet · Open Source</p>
      <div class="auth-brand"><span>512</span><div><strong>Cube Chess 512 AI</strong><small>8×8×8 · 512 pól</small></div></div>
      <h1 id="auth-title">Witaj w Cube Chess 512</h1>
      <p class="auth-intro">Zaloguj się, aby zachować znajomych, ranking i historię partii, albo rozpocznij od razu jako gość.</p>
      <div class="auth-primary-list">${PRIMARY_PROVIDERS.map(providerMarkup).join("")}</div>
      <button type="button" class="auth-more-toggle" data-auth-more aria-expanded="false"><span>Więcej sposobów logowania</span><span class="auth-more-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span></button>
      <div class="auth-more-panel" data-auth-more-panel hidden>${MORE_PROVIDERS.map(providerMarkup).join("")}</div>
      <div class="auth-account-actions"><button type="button" data-account="register">Załóż konto</button><button type="button" data-account="login">Zaloguj e-mailem</button></div>
      <div data-account-panel></div>
      <div class="auth-divider"><span>lub</span></div>
      <button type="button" class="auth-guest" data-auth="guest">Zagraj jako gość <span aria-hidden="true">→</span></button>
      <p class="auth-note" data-auth-note>${authBackendConfigured() ? "Połączenie z Supabase Auth jest skonfigurowane." : "Tryb gościa działa od razu. Rejestracja i logowanie wymagają publicznej konfiguracji Supabase."}</p>
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
      const account = event.target.closest("[data-account]");
      if (account) {
        this.showAccountForm(account.dataset.account);
        return;
      }
      if (event.target.closest("[data-account-close]")) {
        this.element.querySelector("[data-account-panel]").innerHTML = "";
        return;
      }
      const button = event.target.closest("[data-auth]");
      if (button) this.choose(button.dataset.auth);
    };
    this.handleSubmit = (event) => {
      if (!event.target.matches("[data-account-form]")) return;
      event.preventDefault();
      void this.submitAccountForm(event.target);
    };
    this.element.addEventListener("click", this.handleClick);
    this.element.addEventListener("submit", this.handleSubmit);
    void this.restore();
  }

  async restore() {
    const note = this.element.querySelector("[data-auth-note]");
    note.textContent = "Sprawdzanie sesji…";

    // Explicit reviewer/guest entry uses exactly the same anonymous identity
    // contract as the visible "Zagraj jako gość" button, but completes it
    // synchronously so the provider login screen never flashes on screen.
    if (isDirectGuestEntry()) {
      const storedIdentity = parseStoredIdentity(sessionStorage.getItem(SESSION_KEY));
      const identity = storedIdentity?.mode === "guest" ? storedIdentity : createGuestIdentity();
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(identity));
      this.complete(identity);
      return;
    }

    try {
      const oauthIdentity = await this.api.restoreSessionFromUrl();
      if (oauthIdentity) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(oauthIdentity));
        this.complete(oauthIdentity);
        return;
      }

      const storedIdentity = parseStoredIdentity(sessionStorage.getItem(SESSION_KEY));
      if (storedIdentity?.mode === "guest") {
        this.complete(storedIdentity);
        return;
      }

      const sessionIdentity = await this.api.restoreStoredSession();
      if (sessionIdentity) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionIdentity));
        this.complete(sessionIdentity);
        return;
      }

      sessionStorage.removeItem(SESSION_KEY);
      note.textContent = authBackendConfigured()
        ? "Zaloguj się lub rozpocznij jako gość."
        : "Tryb gościa działa od razu. Supabase Auth nie jest skonfigurowany.";
    } catch (error) {
      sessionStorage.removeItem(SESSION_KEY);
      note.textContent = error instanceof Error ? error.message : "Nie udało się odtworzyć sesji.";
      note.setAttribute("role", "alert");
    }
  }

  showAccountForm(mode) {
    this.element.querySelector("[data-account-panel]").innerHTML = accountForm(mode);
    this.element.querySelector("[data-account-form] input")?.focus();
  }

  async submitAccountForm(form) {
    const message = form.querySelector("[data-account-message]");
    const submit = form.querySelector("button[type='submit']");
    submit.disabled = true;
    message.textContent = "Łączenie…";
    try {
      const data = Object.fromEntries(new FormData(form));
      if (form.dataset.mode === "register") {
        await this.api.register({ ...data, acceptTerms: data.acceptTerms === "on" });
        message.textContent = "Sprawdź skrzynkę e-mail i potwierdź konto.";
      } else if (form.dataset.mode === "reset") {
        await this.api.forgotPassword({ email: data.email });
        message.textContent = "Jeżeli konto istnieje, wysłaliśmy bezpieczny link resetujący.";
      } else {
        const identity = await this.api.login({ email: data.email, password: data.password });
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(identity));
        this.complete(identity);
      }
    } catch (error) {
      message.textContent = error instanceof Error ? error.message : "Nie udało się wykonać operacji.";
      message.setAttribute("role", "alert");
    } finally {
      submit.disabled = false;
    }
  }

  choose(provider) {
    if (provider === "guest") {
      const identity = createGuestIdentity();
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(identity));
      this.complete(identity);
      return;
    }
    if (!authBackendConfigured()) {
      const note = this.element.querySelector("[data-auth-note]");
      const label = ALL_PROVIDERS.find((entry) => entry.id === provider)?.label ?? provider;
      note.textContent = `Logowanie przez ${label} wymaga konfiguracji Supabase i danych dostawcy. Na razie wybierz tryb gościa.`;
      note.setAttribute("role", "alert");
      return;
    }
    this.api.redirectToProvider(provider, window.location.href);
  }

  complete(identity) {
    this.identity = identity;
    this.element.classList.add("auth-gate-hidden");
    this.element.setAttribute("aria-hidden", "true");
    this.onAuthenticated(identity);
  }

  async signOut() {
    await this.api.signOut();
    sessionStorage.removeItem(SESSION_KEY);
    this.identity = null;
    this.element.classList.remove("auth-gate-hidden");
    this.element.removeAttribute("aria-hidden");
    this.element.querySelector("[data-auth-note]").textContent = "Wylogowano pomyślnie.";
  }

  dispose() {
    this.element.removeEventListener("click", this.handleClick);
    this.element.removeEventListener("submit", this.handleSubmit);
    this.element.remove();
  }
}
