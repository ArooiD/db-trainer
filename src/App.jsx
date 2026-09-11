import { useEffect } from "react";
import { AppProvider, useApp } from "./state/app-store.jsx";
import AppHeader from "./components/AppHeader.jsx";
import AppModal from "./components/AppModal.jsx";
import LabRail from "./components/shared/LabRail.jsx";
import DatabaseSandbox from "./components/database/DatabaseSandbox.jsx";
import DesignerOverlay from "./components/database/DesignerOverlay.jsx";
import ProgrammingSandbox from "./components/programming/ProgrammingSandbox.jsx";
import LecturesView from "./components/lectures/LecturesView.jsx";
import TestsView from "./components/tests/TestsView.jsx";

function useServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return undefined;
    const reloadKey = "it-study-lab.pwa-controller-reload";
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (sessionStorage.getItem(reloadKey)) return;
      sessionStorage.setItem(reloadKey, "1");
      location.reload();
    });
    navigator.serviceWorker
      .register("./service-worker.js")
      .then(() => sessionStorage.removeItem(reloadKey))
      .catch((error) => console.warn("Service Worker registration failed", error));
    return undefined;
  }, []);
}

function Shell() {
  const { nav } = useApp();
  useServiceWorker();
  const sandboxVisible = nav.mode === "sandbox";
  return (
    <>
      <AppHeader />
      <div className="app-shell">
        <LabRail />
        <div className={`app-content${sandboxVisible ? "" : " hidden"}`}>
          <DatabaseSandbox />
          <ProgrammingSandbox />
        </div>
        {nav.mode === "tests" && <TestsView />}
        {nav.mode === "lectures" && <LecturesView />}
      </div>
      <AppModal />
      <DesignerOverlay />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
