import { useApp } from "../state/app-store.jsx";
import ConnectionStatus from "./shared/ConnectionStatus.jsx";

const MODES = [
  { id: "lectures", label: "Лекции" },
  { id: "tests", label: "Тесты" },
  { id: "sandbox", label: "Песочница" },
];

export default function AppHeader() {
  const { nav, setMode, engines, engineId, engineStatus, engineBusy, switchEngine, tests, TASKS } = useApp();

  return (
    <header className="topbar app-topbar">
      <div className="brand-block">
        <div className="brand">IT Study Lab</div>
        <div className="brand-subtitle">Interactive sandbox for future programmers</div>
      </div>

      <nav className="mode-tabs" aria-label="Режим работы">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            className={`mode-tab${nav.mode === mode.id ? " active" : ""}`}
            onClick={() => setMode(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </nav>

      <div className="runtime-switch">
        <label htmlFor="engine-select">Runtime</label>
        <select
          id="engine-select"
          aria-label="Выбор runtime"
          value={engineId}
          disabled={engineBusy}
          onChange={(event) => switchEngine(event.target.value)}
        >
          {engines.map((engine) => (
            <option key={engine.id} value={engine.id}>
              {engine.label} · {engine.technology || engine.dialect || "runtime"}
            </option>
          ))}
        </select>
        <span className={`runtime-status ${engineStatus.state}`.trim()}>{engineStatus.text}</span>
      </div>

      <div className={`progress${nav.mode === "tests" ? "" : " hidden"}`}>
        Tests: {tests.solved.size} / {TASKS.length}
      </div>

      <div className="pwa-controls">
        <ConnectionStatus />
      </div>
    </header>
  );
}
