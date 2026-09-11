export default function DatabaseSandbox() {
  return (
    <>
<div id="database-sandbox" className="database-ide">
      <aside className="ide-activity-bar" aria-label="Лаборатории">
        <button className="activity-button active" data-open-lab="database" title="Базы данных"><span>▦</span><small>DB</small></button>
        <button className="activity-button" data-open-lab="programming" title="Программирование"><span>⌘</span><small>Code</small></button>
        <button className="activity-button" data-future-module data-title="Операционные системы" data-description="Интерактивный Linux terminal, файловая система, процессы, сигналы и визуализаторы." title="Операционные системы"><span>›_</span><small>OS</small></button>
        <button className="activity-button" data-future-module data-title="Специальные программные продукты" data-description="Dockerfile, Compose, контейнеры, сети, volumes и визуальная модель слоёв." title="Docker / Software"><span>◫</span><small>Dev</small></button>
      </aside>

      <main className="ide-main">
        <div className="ide-document-tabs">
          <button className="ide-document-tab active"><span className="tab-table-icon">▦</span><span id="result-tab-title">SQL Result</span><span className="tab-close">×</span></button>
          <button id="new-query-tab" className="ide-new-tab" title="Новый запрос">＋</button>
          <div className="ide-runtime-caption"><span id="sandbox-runtime-name">SQLite</span><small id="sandbox-runtime-tech">sql.js / WASM</small></div>
        </div>

        <div className="ide-workspace">
          <section className="ide-center">
            <div className="data-toolbar">
              <button id="sandbox-refresh-result" title="Повторить запрос">↻</button>
              <button id="sandbox-run" className="primary" title="Выполнить запрос">▶ Run <kbd>Ctrl↵</kbd></button>
              <span className="toolbar-separator"></span>
              <button id="sandbox-clear" title="Новый запрос">＋ SQL</button>
              <button id="sandbox-schema">DDL</button>
              <button id="sandbox-design">ER Diagram</button>
              <span id="sandbox-feedback" className="inline-feedback"></span>
            </div>

            <section className="output-card ide-data-grid">
              <div className="grid-filter-row">
                <span>⌯</span><span>WHERE</span>
                <span className="grid-order">≡ &nbsp; ORDER BY</span>
              </div>
              <div id="sandbox-result" className="result-box workbench-output"><div className="empty">Среда запускается…</div></div>
            </section>

            <section className="ide-console-dock">
              <div className="console-tabs">
                <button className="console-tab active">Query console</button>
                <button className="console-tab">Output</button>
                <span className="console-spacer"></span>
                <button id="sandbox-reset" className="danger subtle">Reset runtime</button>
              </div>
              <div className="console-layout">
                <section className="editor-card">
                  <div className="panel-head"><span>console.sql</span><small>DDL · DML · Ctrl/Cmd + Enter</small></div>
                  <textarea id="sandbox-editor" className="workbench-editor" spellCheck="false" aria-label="SQL console"></textarea>
                </section>
                <aside className="history-card">
                  <div className="panel-head"><span>History</span><button id="sandbox-clear-history" className="link-button">очистить</button></div>
                  <div id="sandbox-history" className="history-list"></div>
                </aside>
              </div>
            </section>
          </section>

          <section id="database-studio" className="database-studio-card ide-database-tree">
          <div className="database-studio-head">
            <div>
              <span className="database-studio-title">Database</span>
              <small id="db-inspector-status">чтение структуры…</small>
            </div>
            <div className="database-tool-tabs" role="tablist" aria-label="Инструменты базы данных">
              <button className="database-tool-tab active" data-db-tool-tab="structure" title="Структура">▦</button>
              <button className="database-tool-tab" data-db-tool-tab="erd" title="ERD">⌁</button>
              <button className="database-tool-tab" data-db-tool-tab="load" title="Нагрузка">◴</button>
              <button id="db-inspector-refresh" className="database-refresh" title="Обновить структуру">↻</button>
            </div>
          </div>

          <div id="db-tool-structure" className="database-tool-panel">
            <div className="schema-browser">
              <aside className="schema-table-list" id="schema-table-list">
                <div className="schema-empty">Схема появится после запуска runtime.</div>
              </aside>
              <div className="schema-detail" id="schema-detail">
                <div className="schema-empty">Выберите таблицу.</div>
              </div>
            </div>
          </div>

          <div id="db-tool-erd" className="database-tool-panel hidden">
            <div className="database-panel-note database-panel-note-action">
              <span>Диаграмма строится из фактической схемы runtime. Создайте или измените таблицы через SQL Console и нажмите Refresh при необходимости. Двойной клик по таблице вставит SELECT в редактор.</span>
              <button id="db-apply-designer" className="small-action">Применить ER Designer → runtime</button>
            </div>
            <div id="live-erd" className="live-erd">
              <div className="schema-empty">ERD появится после чтения схемы.</div>
            </div>
          </div>

          <div id="db-tool-load" className="database-tool-panel hidden">
            <div className="load-layout">
              <section className="load-config">
                <div className="load-section-title">1. Данные для эксперимента</div>
                <p className="load-copy">Создайте отдельную таблицу <code>lab_load_events</code>, чтобы безопасно сравнивать запросы и индексы, не затрагивая собственную схему.</p>
                <label className="load-field">
                  <span>Количество строк</span>
                  <input id="load-row-count" type="number" min="100" max="250000" step="1000" defaultValue="10000" />
                </label>
                <div className="load-actions">
                  <button id="load-generate" className="primary">Создать dataset</button>
                  <button id="load-add-index">+ Индекс</button>
                  <button id="load-drop-index">− Индекс</button>
                </div>

                <div className="load-section-title load-query-title">2. Запрос для benchmark</div>
                <textarea id="load-query" className="load-query" spellCheck="false"></textarea>
                <div className="load-benchmark-row">
                  <label className="load-field compact-field">
                    <span>Повторов</span>
                    <input id="load-iterations" type="number" min="5" max="200" defaultValue="30" />
                  </label>
                  <button id="load-use-editor">Взять SQL из Console</button>
                  <button id="load-benchmark" className="primary">Run benchmark</button>
                </div>
              </section>

              <aside className="load-results">
                <div className="load-section-title">Результаты</div>
                <div id="load-runtime-hint" className="load-runtime-hint"></div>
                <div id="load-metrics" className="load-metrics">
                  <div className="load-metric"><small>avg</small><strong>—</strong></div>
                  <div className="load-metric"><small>p50</small><strong>—</strong></div>
                  <div className="load-metric"><small>p95</small><strong>—</strong></div>
                  <div className="load-metric"><small>p99</small><strong>—</strong></div>
                  <div className="load-metric"><small>ops/s</small><strong>—</strong></div>
                  <div className="load-metric"><small>rows</small><strong>—</strong></div>
                </div>
                <div id="load-status" className="load-status">Сначала создайте dataset или используйте свой запрос.</div>
                <div className="load-learning-note">
                  Попробуйте benchmark без индекса, затем создайте индекс и повторите. Так видно, как структура БД влияет на latency.
                </div>
              </aside>
            </div>
          </div>
          </section>
        </div>
        <div className="ide-statusbar">
          <span>● <strong id="ide-engine-label">SQLite</strong></span>
          <span>browser runtime</span>
          <span className="statusbar-spacer"></span>
          <span>IT Study Lab</span>
        </div>
      </main>
    </div>
    </>
  );
}
