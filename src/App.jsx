import { useEffect, useState } from "react";
import AppHeader from "./components/AppHeader.jsx";
import LabRail from "./components/shared/LabRail.jsx";
import DatabaseSandbox from "./components/DatabaseSandbox.jsx";
import ProgrammingSandbox from "./components/ProgrammingSandbox.jsx";
import LecturesView from "./components/LecturesView.jsx";
import TestsView from "./components/TestsView.jsx";
import AppModal from "./components/AppModal.jsx";

const legacyScripts = [
  "vendor/sql-wasm.js",
  "vendor/sql-binary.js",
  "js/data.js",
  "js/tasks.js",
  "js/lectures.js",
  "js/engines/lab-engine.js",
  "js/engines/runtime.js",
  "js/engines/sqlite-engine.js",
  "js/engines/pglite-engine.js",
  "js/db.js",
  "js/workbench.js",
  "js/design.js",
  "js/programming.js",
  "js/app.js",
  "js/database-studio.js",
  "js/pwa.js"
];

function loadScript(source) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${import.meta.env.BASE_URL}${source}`;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Не удалось загрузить ${source}`));
    document.body.append(script);
  });
}

export default function App() {
  const [error, setError] = useState("");

  useEffect(() => {
    async function boot() {
      try {
        for (const source of legacyScripts) {
          await loadScript(source);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    }

    if (!window.__itStudyLabBootPromise) window.__itStudyLabBootPromise = boot();
    window.__itStudyLabBootPromise.catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  if (error) return <main className="boot-error">{error}</main>;
  return (
    <>
      <AppHeader />
      <div className="app-shell">
        <LabRail active="database" />
        <div className="app-content">
          <section id="sandbox-view" className="product-view">
            <DatabaseSandbox />
            <ProgrammingSandbox />
          </section>
          <LecturesView />
          <TestsView />
        </div>
      </div>
      <AppModal />
    </>
  );
}
