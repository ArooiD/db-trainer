import { useApp } from "../state/app-store.jsx";
import ConnectionStatus from "./shared/ConnectionStatus.jsx";
import RuntimeSettings from "./shared/RuntimeSettings.jsx";
import { T } from "../workspace/strings.js";

const MODES = [
  { id: "lectures", label: "Лекции" },
  { id: "tests", label: "Тесты" },
  { id: "sandbox", label: "Песочница" },
];

export default function AppHeader() {
  const { nav, setMode, connections, activeConnId, setSettingsOpen, toggleArtifacts, artifactsOpen, engineStatus, tests, TASKS } = useApp();
  const activeConn = connections.find((c) => c.id === activeConnId);

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

      <button
        className="runtime-gear"
        title="Настройки runtime и подключений"
        aria-label="Настройки runtime"
        onClick={() => setSettingsOpen(true)}
      >
        <span className="gear-icon" aria-hidden="true">⚙</span>
        <span className="gear-meta">
          <strong>{connections.length} {plural(connections.length)}</strong>
          <small className={`runtime-status ${engineStatus.state}`.trim()}>{activeConn ? activeConn.label : engineStatus.text}</small>
        </span>
      </button>

      <div className={`progress${nav.mode === "tests" ? "" : " hidden"}`}>
        Tests: {tests.solved.size} / {TASKS.length}
      </div>

      <div className="pwa-controls">
        <ConnectionStatus />
        <button
          className={`artifacts-trigger${artifactsOpen ? " active" : ""}`}
          title={T.title}
          aria-label={T.title}
          aria-pressed={artifactsOpen}
          onClick={toggleArtifacts}
        >
          <span className="artifacts-icon" aria-hidden="true">◆</span>
        </button>
      </div>

      <RuntimeSettings />
    </header>
  );
}

function plural(count) {
  if (count === 1) return "подключение";
  if (count >= 2 && count <= 4) return "подключения";
  return "подключений";
}

