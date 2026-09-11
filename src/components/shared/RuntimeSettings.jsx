import { useApp } from "../../state/app-store.jsx";

export default function RuntimeSettings() {
  const {
    settingsOpen, setSettingsOpen,
    engines, enabledRuntimes, toggleRuntime,
    connections, activeConnId,
    openConnection, switchConnection, closeConnection, closeConnectionsOf,
    engineBusy, openTransfer,
  } = useApp();

  if (!settingsOpen) return null;

  const toggleEnabled = (engineId, on) => {
    toggleRuntime(engineId, on);
    if (!on) closeConnectionsOf(engineId);
  };

  return (
    <div className="modal" onClick={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
      <div className="modal-body settings-body">
        <button className="modal-close" onClick={() => setSettingsOpen(false)}>✕</button>
        <h3>Runtime и подключения</h3>
        <p className="settings-intro">
          Выберите, какие runtime подключать, и держите открытыми несколько независимых баз
          одновременно — каждая вкладка со своим содержимым.
        </p>

        <section className="settings-section">
          <div className="settings-section-title">Доступные runtime</div>
          <div className="runtime-cards">
            {engines.map((engine) => {
              const enabled = enabledRuntimes.includes(engine.id);
              const count = connections.filter((c) => c.engineId === engine.id).length;
              return (
                <div className={`runtime-card${enabled ? " enabled" : ""}`} key={engine.id}>
                  <label className="runtime-card-head">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) => toggleEnabled(engine.id, event.target.checked)}
                    />
                    <span>
                      <strong>{engine.label}</strong>
                      <small>{engine.technology || engine.dialect}</small>
                    </span>
                  </label>
                  <p>{engine.description}</p>
                  <div className="runtime-card-foot">
                    <small className="muted">{count > 0 ? `Открыто подключений: ${count}` : engine.capabilities.join(" · ")}</small>
                    <button
                      className="small-action"
                      disabled={!enabled || engineBusy}
                      onClick={() => openConnection(engine.id)}
                    >
                      ＋ Подключение
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-title">Открытые подключения</div>
          {connections.length === 0 && <div className="schema-empty">Подключений пока нет.</div>}
          <div className="connection-settings-list">
            {connections.map((conn) => (
              <div key={conn.id} className={`connection-settings-row${conn.id === activeConnId ? " active" : ""}`}>
                <button
                  className="connection-settings-name"
                  onClick={() => { switchConnection(conn.id); setSettingsOpen(false); }}
                  title="Сделать активным"
                >
                  <strong>{conn.label}</strong>
                  <small>{conn.meta?.technology || conn.meta?.dialect || conn.engineId}</small>
                </button>
                {conn.id === activeConnId && <span className="connection-active-dot" title="Активное">●</span>}
                <button className="danger subtle" disabled={engineBusy} onClick={() => closeConnection(conn.id)}>Закрыть</button>
              </div>
            ))}
          </div>
          {connections.length >= 2 && (
            <div className="settings-transfer-cta">
              <button
                className="primary"
                onClick={() => { openTransfer(); setSettingsOpen(false); }}
              >
                ⇄ Имитировать перенос между базами
              </button>
              <small className="muted">Выгрузить SELECT из одной базы и записать в таблицу другой.</small>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
