function baseUrl() {
  return String(import.meta.env.VITE_AUTH_BASE_URL ?? "").replace(/\/$/, "");
}

export function authBackendConfigured() {
  return Boolean(baseUrl());
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    throw new Error(body?.message || "Serwer logowania odrzucił żądanie.");
  }
  return body;
}

export class AuthApi {
  async request(path, body) {
    const base = baseUrl();
    if (!base) {
      throw new Error("Serwer kont nie jest jeszcze uruchomiony. Na razie wybierz tryb gościa.");
    }
    const response = await fetch(`${base}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return parseResponse(response);
  }

  register(payload) {
    return this.request("/auth/register", payload);
  }

  forgotPassword(payload) {
    return this.request("/auth/password/forgot", payload);
  }

  async login(payload) {
    const result = await this.request("/auth/login", payload);
    if (!result?.playerId) throw new Error("Serwer nie zwrócił prawidłowej sesji gracza.");
    return {
      mode: "account",
      provider: "email",
      playerId: result.playerId,
      displayName: result.displayName || "Cube Chess Player",
    };
  }

  redirectToProvider(provider, returnTo) {
    const target = new URL(`${baseUrl()}/auth/${provider}`);
    target.searchParams.set("returnTo", returnTo.split("?")[0]);
    window.location.assign(target.href);
  }
}
