export default function DatabaseTabs() {
  return (
    <div className="ide-document-tabs">
      <button className="ide-document-tab active"><span className="tab-table-icon">▦</span><span id="result-tab-title">SQL Result</span><span className="tab-close">×</span></button>
      <button id="new-query-tab" className="ide-new-tab" title="Новый запрос">＋</button>
      <div className="ide-runtime-caption"><span id="sandbox-runtime-name">SQLite</span><small id="sandbox-runtime-tech">sql.js / WASM</small></div>
    </div>
  );
}
