const SESSION_STORAGE_KEY = "cubeChessSupabaseSession";

function supabaseUrl() {
  return String(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
}

function supabaseAnonKey() {
  return String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();
}

function authHeaders(token = supabaseAnonKey()) {
  const anonKey = supabaseAnonKey();
  return {
    apikey: anonKey,
    authorization: `Bearer ${token || anonKey}`,
    "content-type": "application/json",
  };
}

export function authBackendConfigured() {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    throw new Error(
      body?.msg ||
        body?.message ||
        body?.error_description ||
        body?.error ||
        "Supabase odrzucił żądanie logowania.",
    );
  }
  return body;
}

function persistSession(result) {
  if (!result?.access_token || !result?.user?.id) return null;
  const session = {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    expiresAt: result.expires_at,
    user: result.user,
  };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

function identityFromUser(user, provider = "supabase") {
  return {
    mode: "account",
    provider,
    playerId: user.id,
    displayName:
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Cube Chess Player",
    email: user.email || "",
    avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
  };
}

export class AuthApi {
  async request(path, body, token = supabaseAnonKey()) {
    const base = supabaseUrl();
    const anonKey = supabaseAnonKey();
    if (!base || !anonKey) {
      throw new Error(
        "Supabase Auth nie jest jeszcze podłączony do wdrożenia. Na razie wybierz tryb gościa.",
      );
    }
    const response = await fetch(`${base}/auth/v1${path}`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(body),
    });
    return parseResponse(response);
  }

  async register(payload) {
    return this.request("/signup", {
      email: payload.email,
      password: payload.password,
      data: {
        display_name: payload.displayName,
        accepted_terms: payload.acceptTerms === true,
      },
    });
  }

  forgotPassword(payload) {
    return this.request("/recover", {
      email: payload.email,
      redirect_to: `${window.location.origin}${window.location.pathname}`,
    });
  }

  async login(payload) {
    const result = await this.request("/token?grant_type=password", {
      email: payload.email,
      password: payload.password,
    });
    const session = persistSession(result);
    if (!session) throw new Error("Supabase nie zwrócił prawidłowej sesji gracza.");
    return identityFromUser(result.user, "email");
  }

  redirectToProvider(provider, returnTo) {
    const base = supabaseUrl();
    if (!base) throw new Error("Supabase Auth nie jest skonfigurowany.");
    const target = new URL(`${base}/auth/v1/authorize`);
    target.searchParams.set("provider", provider);
    target.searchParams.set("redirect_to", returnTo.split("?")[0]);
    window.location.assign(target.href);
  }

  async restoreSessionFromUrl() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const expiresIn = Number(hash.get("expires_in") || 0);
    if (!accessToken) return null;

    const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
      headers: authHeaders(accessToken),
    });
    const user = await parseResponse(response);
    const result = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresIn ? Math.floor(Date.now() / 1000) + expiresIn : null,
      user,
    };
    persistSession(result);
    history.replaceState({}, document.title, `${location.pathname}${location.search}`);
    return identityFromUser(user, hash.get("provider_token") ? "oauth" : "google");
  }

  async restoreStoredSession() {
    let stored;
    try {
      stored = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "null");
    } catch {
      stored = null;
    }
    if (!stored?.accessToken) return null;

    const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
      headers: authHeaders(stored.accessToken),
    });
    if (response.status === 401 && stored.refreshToken) {
      const refreshed = await this.request("/token?grant_type=refresh_token", {
        refresh_token: stored.refreshToken,
      });
      persistSession(refreshed);
      return identityFromUser(refreshed.user, "supabase");
    }
    if (!response.ok) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    const user = await response.json();
    return identityFromUser(user, "supabase");
  }

  async signOut() {
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "null");
    } catch {}
    if (stored?.accessToken) {
      await fetch(`${supabaseUrl()}/auth/v1/logout`, {
        method: "POST",
        headers: authHeaders(stored.accessToken),
      }).catch(() => {});
    }
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}
