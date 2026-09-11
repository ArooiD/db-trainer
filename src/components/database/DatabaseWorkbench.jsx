export default function DatabaseWorkbench() {
  return (
    <section className="ide-center">
      <div className="data-toolbar">
        <button id="sandbox-refresh-result" title="Повторить запрос">↻</button>
        <button id="sandbox-run" className="primary" title="Выполнить запрос">▶ Run <kbd>Ctrl↵</kbd></button>
        <span className="toolbar-separator" />
        <button id="sandbox-clear" title="Новый запрос">＋ SQL</button>
        <button id="sandbox-schema">DDL</button>
        <button id="sandbox-design">ER Diagram</button>
        <span id="sandbox-feedback" className="inline-feedback" />
      </div>
      <section className="output-card ide-data-grid">
        <div className="grid-filter-row"><span>⌯</span><span>WHERE</span><span className="grid-order">≡ &nbsp; ORDER BY</span></div>
        <div id="sandbox-result" className="result-box workbench-output"><div className="empty">Среда запускается…</div></div>
      </section>
      <section className="ide-console-dock">
        <div className="console-tabs">
          <button className="console-tab active">Query console</button><button className="console-tab">Output</button><span className="console-spacer" />
          <button id="sandbox-reset" className="danger subtle">Reset runtime</button>
        </div>
        <div className="console-layout">
          <section className="editor-card"><div className="panel-head"><span>console.sql</span><small>DDL · DML · Ctrl/Cmd + Enter</small></div><textarea id="sandbox-editor" className="workbench-editor" spellCheck={false} aria-label="SQL console" /></section>
          <aside className="history-card"><div className="panel-head"><span>History</span><button id="sandbox-clear-history" className="link-button">очистить</button></div><div id="sandbox-history" className="history-list" /></aside>
        </div>
      </section>
    </section>
  );
}
