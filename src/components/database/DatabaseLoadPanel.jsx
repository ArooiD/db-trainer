const metrics = ["avg", "p50", "p95", "p99", "ops/s", "rows"];

export default function DatabaseLoadPanel() {
  return (
    <div id="db-tool-load" className="database-tool-panel hidden">
      <div className="load-layout">
        <section className="load-config">
          <div className="load-section-title">1. Данные для эксперимента</div>
          <p className="load-copy">Создайте отдельную таблицу <code>lab_load_events</code>, чтобы безопасно сравнивать запросы и индексы, не затрагивая собственную схему.</p>
          <label className="load-field"><span>Количество строк</span><input id="load-row-count" type="number" min="100" max="250000" step="1000" defaultValue="10000" /></label>
          <div className="load-actions"><button id="load-generate" className="primary">Создать dataset</button><button id="load-add-index">+ Индекс</button><button id="load-drop-index">− Индекс</button></div>
          <div className="load-section-title load-query-title">2. Запрос для benchmark</div>
          <textarea id="load-query" className="load-query" spellCheck={false} />
          <div className="load-benchmark-row">
            <label className="load-field compact-field"><span>Повторов</span><input id="load-iterations" type="number" min="5" max="200" defaultValue="30" /></label>
            <button id="load-use-editor">Взять SQL из Console</button><button id="load-benchmark" className="primary">Run benchmark</button>
          </div>
        </section>
        <aside className="load-results">
          <div className="load-section-title">Результаты</div><div id="load-runtime-hint" className="load-runtime-hint" />
          <div id="load-metrics" className="load-metrics">{metrics.map((metric) => <div key={metric} className="load-metric"><small>{metric}</small><strong>—</strong></div>)}</div>
          <div id="load-status" className="load-status">Сначала создайте dataset или используйте свой запрос.</div>
          <div className="load-learning-note">Попробуйте benchmark без индекса, затем создайте индекс и повторите. Так видно, как структура БД влияет на latency.</div>
        </aside>
      </div>
    </div>
  );
}
