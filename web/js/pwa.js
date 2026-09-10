(function setupPwa() {
  const connectionStatus = document.getElementById("connection-status");

  function updateConnectionStatus() {
    const offline = !navigator.onLine;
    connectionStatus.textContent = offline ? "Офлайн" : "";
    connectionStatus.classList.toggle("offline", offline);
  }

  updateConnectionStatus();
  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      const reloadKey = "it-study-lab.pwa-controller-reload";
      if (sessionStorage.getItem(reloadKey)) return;
      sessionStorage.setItem(reloadKey, "1");
      location.reload();
    });
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js")
        .then(() => sessionStorage.removeItem("it-study-lab.pwa-controller-reload"))
        .catch((error) => {
          console.warn("Service Worker registration failed", error);
        });
    });
  }
})();
