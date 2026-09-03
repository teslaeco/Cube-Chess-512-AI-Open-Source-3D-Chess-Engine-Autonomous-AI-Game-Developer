const SESSION_KEY = "cubeChessIdentity";

export function createDirectGuestIdentity(randomUUID = () => crypto.randomUUID()) {
  return {
    mode: "guest",
    provider: "guest",
    playerId: `guest-link-${randomUUID()}`,
    displayName: "Gość",
  };
}

export function bootstrapGuestEntry({
  search = window.location.search,
  storage = sessionStorage,
  isDev = false,
  randomUUID = () => crypto.randomUUID(),
} = {}) {
  const params = new URLSearchParams(search);
  const e2e = isDev && params.get("e2e") === "1";
  const directGuest = params.get("guest") === "1";
  if (!e2e && !directGuest) return false;

  const identity = e2e
    ? {
        mode: "guest",
        provider: "guest",
        playerId: "guest-e2e",
        displayName: "E2E Guest",
      }
    : createDirectGuestIdentity(randomUUID);

  storage.setItem(SESSION_KEY, JSON.stringify(identity));
  return true;
}
