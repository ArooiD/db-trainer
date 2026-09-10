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
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch((error) => {
        console.warn("Service Worker registration failed", error);
      });
    });
  }
})();
