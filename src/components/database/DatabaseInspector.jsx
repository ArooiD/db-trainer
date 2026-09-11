import DatabaseLoadPanel from "./DatabaseLoadPanel.jsx";

export default function DatabaseInspector() {
  return (
    <section id="database-studio" className="database-studio-card ide-database-tree">
      <div className="database-studio-head">
        <div><span className="database-studio-title">Database</span><small id="db-inspector-status">чтение структуры…</small></div>
        <div className="database-tool-tabs" role="tablist" aria-label="Инструменты базы данных">
          <button className="database-tool-tab active" data-db-tool-tab="structure" title="Структура">▦</button><button className="database-tool-tab" data-db-tool-tab="erd" title="ERD">⌁</button><button className="database-tool-tab" data-db-tool-tab="load" title="Нагрузка">◴</button><button id="db-inspector-refresh" className="database-refresh" title="Обновить структуру">↻</button>
        </div>
      </div>
      <div id="db-tool-structure" className="database-tool-panel"><div className="schema-browser"><aside className="schema-table-list" id="schema-table-list"><div className="schema-empty">Схема появится после запуска runtime.</div></aside><div className="schema-detail" id="schema-detail"><div className="schema-empty">Выберите таблицу.</div></div></div></div>
      <div id="db-tool-erd" className="database-tool-panel hidden"><div className="database-panel-note database-panel-note-action"><span>Диаграмма строится из фактической схемы runtime. Создайте или измените таблицы через SQL Console и нажмите Refresh при необходимости. Двойной клик по таблице вставит SELECT в редактор.</span><button id="db-apply-designer" className="small-action">Применить ER Designer → runtime</button></div><div id="live-erd" className="live-erd"><div className="schema-empty">ERD появится после чтения схемы.</div></div></div>
      <DatabaseLoadPanel />
    </section>
  );
}
