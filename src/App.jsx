import { useEffect, useState } from "react";

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
    let disposed = false;
    const root = document.getElementById("legacy-root");

    async function boot() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}legacy-shell.html`);
        if (!response.ok) throw new Error("Не удалось загрузить оболочку приложения.");
        const documentFragment = new DOMParser().parseFromString(await response.text(), "text/html");
        documentFragment.querySelectorAll("script").forEach((node) => node.remove());
        if (disposed) return;
        root.innerHTML = documentFragment.body.innerHTML;
        for (const source of legacyScripts) {
          if (disposed) return;
          await loadScript(source);
        }
      } catch (cause) {
        if (!disposed) setError(cause instanceof Error ? cause.message : String(cause));
      }
    }

    boot();
    return () => { disposed = true; };
  }, []);

  if (error) return <main className="boot-error">{error}</main>;
  return <main id="legacy-root" aria-busy="true"><div className="empty">Загрузка IT Study Lab…</div></main>;
}
