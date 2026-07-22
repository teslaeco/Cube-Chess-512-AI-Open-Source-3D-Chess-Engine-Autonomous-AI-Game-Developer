function updateMessage() {
  return document.documentElement.lang?.startsWith("pl")
    ? "Dostępna jest nowa wersja gry"
    : "A new game version is available";
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;
  try {
    const registration = await navigator.serviceWorker.register("./sw.js", {
      scope: "./",
    });
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      location.reload();
    });
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state !== "installed" || !navigator.serviceWorker.controller) return;
        const button = document.createElement("button");
        button.className = "update-toast";
        button.textContent = `${updateMessage()} · ↻`;
        button.addEventListener(
          "click",
          () => registration.waiting?.postMessage({ type: "SKIP_WAITING" }),
          { once: true },
        );
        document.body.append(button);
      });
    });
  } catch (error) {
    console.warn("Cube Chess offline shell could not be registered", error);
  }
}
