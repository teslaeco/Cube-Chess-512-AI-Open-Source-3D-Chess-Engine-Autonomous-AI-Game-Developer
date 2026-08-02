function updateMessage() {
  return document.documentElement.lang?.startsWith("pl")
    ? "Wczytuję najnowszą wersję gry"
    : "Loading the latest game version";
}

function reloadOnceForControllerChange() {
  const key = "cubeChessControllerReload";
  if (sessionStorage.getItem(key) === "1") {
    sessionStorage.removeItem(key);
    return;
  }
  sessionStorage.setItem(key, "1");
  location.reload();
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;

  try {
    const registration = await navigator.serviceWorker.register("./sw.js", {
      scope: "./",
      updateViaCache: "none",
    });

    navigator.serviceWorker.addEventListener("controllerchange", reloadOnceForControllerChange);

    const activateWaitingWorker = () => {
      if (!registration.waiting) return false;
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      return true;
    };

    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state !== "installed" || !navigator.serviceWorker.controller) return;
        document.documentElement.dataset.updateStatus = updateMessage();
        activateWaitingWorker();
      });
    });

    await registration.update();
    activateWaitingWorker();
  } catch (error) {
    console.warn("Cube Chess offline shell could not be registered", error);
  }
}
