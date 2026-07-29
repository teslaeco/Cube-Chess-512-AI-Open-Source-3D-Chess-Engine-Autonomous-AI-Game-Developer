function supabaseUrl() {
  return String(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
}

function supabaseAnonKey() {
  return String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();
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

export class AuthApi {
  async request(path, body) {
    const base = supabaseUrl();
    const anonKey = supabaseAnonKey();
    if (!base || !anonKey) {
      throw new Error(
        "Supabase Auth nie jest jeszcze podłączony do wdrożenia. Na razie wybierz tryb gościa.",
      );
    }
    const response = await fetch(`${base}/auth/v1${path}`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return parseResponse(response);
  }

  async register(payload) {
    const result = await this.request("/signup", {
      email: payload.email,
      password: payload.password,
      data: {
        display_name: payload.displayName,
        accepted_terms: payload.acceptTerms === true,
      },
    });
    return result;
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
    const user = result?.user;
    if (!user?.id || !result?.access_token) {
      throw new Error("Supabase nie zwrócił prawidłowej sesji gracza.");
    }
    sessionStorage.setItem(
      "cubeChessSupabaseSession",
      JSON.stringify({
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        expiresAt: result.expires_at,
      }),
    );
    return {
      mode: "account",
      provider: "email",
      playerId: user.id,
      displayName:
        user.user_metadata?.display_name ||
        user.email?.split("@")[0] ||
        "Cube Chess Player",
    };
  }

  redirectToProvider(provider, returnTo) {
    const base = supabaseUrl();
    if (!base) throw new Error("Supabase Auth nie jest skonfigurowany.");
    const target = new URL(`${base}/auth/v1/authorize`);
    target.searchParams.set("provider", provider);
    target.searchParams.set("redirect_to", returnTo.split("?")[0]);
    window.location.assign(target.href);
  }
}
