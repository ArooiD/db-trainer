import { useApp } from "../../state/app-store.jsx";

export default function TransferModal() {
  const {
    transfer, closeTransfer, setTransferConfig, runTransfer, connections,
  } = useApp();

  if (!transfer.open) return null;
  const cfg = transfer.config || {};

  return (
    <div className="modal" onClick={(event) => { if (event.target === event.currentTarget && !transfer.busy) closeTransfer(); }}>
      <div className="modal-body transfer-body">
        <button className="modal-close" onClick={closeTransfer} disabled={transfer.busy}>✕</button>
        <h3>⇄ Имитация общения между базами</h3>
        <p className="settings-intro">
          Данные выгружаются SELECT-запросом из одной подключённой базы и пакетно записываются
          в таблицу другой — как Exchange / replication между независимыми runtime.
        </p>

        <div className="transfer-grid">
          <label className="transfer-field">
            <span>Источник (откуда)</span>
            <select value={cfg.sourceConnId} onChange={(e) => setTransferConfig({ sourceConnId: e.target.value })} disabled={transfer.busy}>
              {connections.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <label className="transfer-field">
            <span>Приёмник (куда)</span>
            <select value={cfg.targetConnId} onChange={(e) => setTransferConfig({ targetConnId: e.target.value })} disabled={transfer.busy}>
              {connections.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
        </div>

        <label className="transfer-field">
          <span>SELECT-запрос источника</span>
          <textarea
            className="transfer-sql"
            spellCheck={false}
            value={cfg.sourceSql}
            onChange={(e) => setTransferConfig({ sourceSql: e.target.value })}
            disabled={transfer.busy}
          />
        </label>

        <div className="transfer-grid">
          <label className="transfer-field">
            <span>Таблица-приёмник</span>
            <input
              type="text"
              value={cfg.targetTable}
              placeholder="например employees_copy"
              onChange={(e) => setTransferConfig({ targetTable: e.target.value })}
              disabled={transfer.busy}
            />
          </label>
          <label className="transfer-field">
            <span>Режим</span>
            <select value={cfg.mode} onChange={(e) => setTransferConfig({ mode: e.target.value })} disabled={transfer.busy}>
              <option value="create">Создать таблицу и заполнить</option>
              <option value="append">INSERT в существующую</option>
            </select>
          </label>
        </div>

        {transfer.error && <div className="transfer-error">{transfer.error}</div>}

        {transfer.result?.log && (
          <div className="transfer-log" aria-live="polite">
            {transfer.result.log.map((line, index) => <div key={index}>{line}</div>)}
          </div>
        )}

        <div className="transfer-actions">
          <button className="primary" disabled={transfer.busy || connections.length < 2} onClick={runTransfer}>
            {transfer.busy ? "Перенос…" : "▶ Выполнить перенос"}
          </button>
          {transfer.result?.inserted > 0 && (
            <span className="transfer-done">Перенесено {transfer.result.inserted} строк</span>
          )}
        </div>
      </div>
    </div>
  );
}
