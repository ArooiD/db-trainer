(function setupPwa() {
  const installButton = document.getElementById("install-app");
  const connectionStatus = document.getElementById("connection-status");
  let installPrompt = null;

  function updateConnectionStatus() {
    const offline = !navigator.onLine;
    connectionStatus.textContent = offline ? "Офлайн" : "";
    connectionStatus.classList.toggle("offline", offline);
  }

  updateConnectionStatus();
  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    installButton.classList.remove("hidden");
  });

  installButton.addEventListener("click", async () => {
    if (!installPrompt) return;
    installButton.disabled = true;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installButton.classList.add("hidden");
    installButton.disabled = false;
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    installButton.classList.add("hidden");
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch((error) => {
        console.warn("Service Worker registration failed", error);
      });
    });
  }
})();
