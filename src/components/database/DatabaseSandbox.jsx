import { useApp } from "../../state/app-store.jsx";
import ResultTable from "../shared/ResultTable.jsx";
import DatabaseStudio from "./DatabaseStudio.jsx";

export default function DatabaseSandbox() {
  const {
    nav, sandbox, setDraft, runSandbox, resetSandbox, clearSandbox, clearHistory, showHistoryCommand,
    engineBusy, connections, activeConnId, switchConnection, closeConnection, renameConnection, setSettingsOpen, openTransfer,
  } = useApp();
  const active = nav.mode === "sandbox" && nav.lab === "database";

  const meta = connections.find((c) => c.id === activeConnId)?.meta || { label: "—", technology: "", dialect: "" };

  return (
    <div className={`database-ide${active ? "" : " hidden"}`}>
      <main className="ide-main">
        <div className="connection-bar" role="tablist" aria-label="Подключения к базам">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className={`connection-chip${conn.id === activeConnId ? " active" : ""}`}
              role="tab"
              aria-selected={conn.id === activeConnId}
              onClick={() => switchConnection(conn.id)}
              onDoubleClick={() => renameConnection(conn.id)}
            >
              <span className={`conn-dot ${conn.engineId}`} />
              <span className="conn-label">{conn.label}</span>
              <button
                className="conn-close"
                title="Закрыть подключение"
                onClick={(event) => { event.stopPropagation(); closeConnection(conn.id); }}
              >×</button>
            </div>
          ))}
          <button className="connection-add" title="Новое подключение" onClick={() => setSettingsOpen(true)}>＋</button>
          {connections.length >= 2 && (
            <button className="connection-transfer" title="Имитировать перенос данных между базами" onClick={() => openTransfer()}>
              ⇄ Перенос
            </button>
          )}
        </div>

        <div className="ide-document-tabs">
          <button className="ide-document-tab active">
            <span className="tab-table-icon">▦</span>
            <span>{sandbox.tabTitle}</span>
            <span className="tab-close">×</span>
          </button>
          <button className="ide-new-tab" title="Новый запрос" onClick={clearSandbox}>＋</button>
          <div className="ide-runtime-caption">
            <span>{meta.label}</span><small>{meta.technology || meta.dialect || "runtime"}</small>
          </div>
        </div>


        <div className="ide-workspace">
          <section className="ide-center">
            <div className="data-toolbar">
              <button title="Повторить запрос" onClick={runSandbox}>↻</button>
              <button className="primary" title="Выполнить запрос" disabled={sandbox.running || engineBusy} onClick={runSandbox}>
                ▶ Run <kbd>Ctrl↵</kbd>
              </button>
              <span className="toolbar-separator" />
              <button title="Новый запрос" onClick={clearSandbox}>＋ SQL</button>
              <SchemaButton />
              <DesignerButton />
              {sandbox.feedback.text && (
                <span className={`inline-feedback ${sandbox.feedback.state}`}>{sandbox.feedback.text}</span>
              )}
            </div>

            <section className="output-card ide-data-grid">
              <div className="grid-filter-row">
                <span>⌯</span><span>WHERE</span><span className="grid-order">≡ &nbsp; ORDER BY</span>
              </div>
              <div className="result-box workbench-output">
                <ResultTable result={sandbox.result} fallback={sandbox.resultEmpty} />
              </div>
            </section>

            <section className="ide-console-dock">
              <div className="console-tabs">
                <button className="console-tab active">Query console</button>
                <button className="console-tab">Output</button>
                <span className="console-spacer" />
                <button className="danger subtle" onClick={resetSandbox}>Reset runtime</button>
              </div>
              <div className="console-layout">
                <section className="editor-card">
                  <div className="panel-head">
                    <span>console.sql</span><small>DDL · DML · Ctrl/Cmd + Enter</small>
                  </div>
                  <textarea
                    className="workbench-editor"
                    spellCheck={false}
                    aria-label="SQL console"
                    value={sandbox.draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                        event.preventDefault();
                        runSandbox();
                      }
                    }}
                  />
                </section>
                <aside className="history-card">
                  <div className="panel-head">
                    <span>History</span>
                    <button className="link-button" onClick={clearHistory}>очистить</button>
                  </div>
                  <div className="history-list">
                    {sandbox.history.length === 0 && (
                      <div className="history-empty">История появится после первого запуска.</div>
                    )}
                    {sandbox.history.slice(0, 20).map((item, index) => (
                      <button
                        key={`${item.createdAt}-${index}`}
                        className="history-item"
                        onClick={() => showHistoryCommand(index)}
                      >
                        <span className={`history-state ${item.error ? "bad" : "ok"}`}>{item.error ? "!" : "✓"}</span>
                        <span className="history-command">{item.command.replace(/\s+/g, " ").trim()}</span>
                        <span className="history-time">{item.durationMs} ms</span>
                      </button>
                    ))}
                  </div>
                </aside>
              </div>
            </section>
          </section>

          <DatabaseStudio active={active} />
        </div>

        <div className="ide-statusbar">
          <span>● <strong>{meta.label}</strong></span>
          <span>browser runtime</span>
          <span className="statusbar-spacer" />
          <span>IT Study Lab</span>
        </div>
      </main>
    </div>
  );
}

function SchemaButton() {
  const { showModal, runtime } = useApp();
  return (
    <button
      onClick={() =>
        showModal(
          <>
            <h3>Схема учебной базы · {runtime.getMeta()?.label || "SQL"}</h3>
            <pre>{runtime.schemaDoc()}</pre>
            <p className="muted">Схема одинакова в SQLite и PostgreSQL, чтобы можно было сравнивать диалекты.</p>
          </>
        )
      }
    >
      DDL
    </button>
  );
}

function DesignerButton() {
  const { openDesigner } = useApp();
  return <button onClick={() => openDesigner(null)}>ER Diagram</button>;
}
