import { useCallback, useEffect, useRef, useState } from "react";
import { useApp, runtime } from "../../state/app-store.jsx";

function quoteIdent(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function fmtMs(value) {
  if (!Number.isFinite(value)) return "—";
  if (value < 1) return `${value.toFixed(2)} ms`;
  if (value < 100) return `${value.toFixed(1)} ms`;
  return `${Math.round(value)} ms`;
}

function pluralTables(count) {
  if (count === 1) return "таблица";
  if (count >= 2 && count <= 4) return "таблицы";
  return "таблиц";
}

const DEFAULT_LOAD_QUERY = "SELECT *\nFROM lab_load_events\nWHERE user_id = 42\nORDER BY created_at DESC\nLIMIT 20;";

export default function DatabaseStudio({ active }) {
  const { openTable, openDesigner } = useApp();
  const [tab, setTab] = useState("structure");
  const [schema, setSchema] = useState({ tables: [] });
  const [selectedTable, setSelectedTable] = useState("");
  const [status, setStatus] = useState("чтение структуры…");
  const [busy, setBusy] = useState(false);
  const refreshTimer = useRef(null);

  const refresh = useCallback(async () => {
    if (!runtime.active || typeof runtime.inspectSchema !== "function") {
      setSchema({ tables: [] });
      setStatus("Runtime не поддерживает просмотр структуры.");
      return;
    }
    setBusy(true);
    try {
      const next = await runtime.inspectSchema();
      const safe = next && Array.isArray(next.tables) ? next : { engine: runtime.activeId, tables: [] };
      setSchema(safe);
      setSelectedTable((prev) =>
        prev && safe.tables.some((table) => table.name === prev) ? prev : safe.tables[0]?.name || ""
      );
      const count = safe.tables.length;
      setStatus(`${count} ${pluralTables(count)}`);
    } catch (err) {
      setSchema({ tables: [] });
      setStatus(`Не удалось прочитать структуру: ${(err && err.message) || err}`);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const schedule = (delay = 60) => {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(refresh, delay);
    };
    const unsubscribe = runtime.onEvent((event) => {
      if (event.type === "use" || event.type === "reset") {
        schedule(30);
        return;
      }
      if (
        event.type === "execute" &&
        !event.options?.internal &&
        event.result &&
        !event.result.error &&
        /\b(create|alter|drop|truncate|rename)\b/i.test(String(event.command || ""))
      ) {
        schedule(80);
      }
    });
    if (runtime.active) refresh();
    return () => {
      unsubscribe();
      clearTimeout(refreshTimer.current);
    };
  }, [refresh]);

  useEffect(() => {
    if (active && tab === "structure" && runtime.active) refresh();
  }, [active, tab, refresh]);

  const emptyMessage = schema.tables.length === 0 ? status || "Схема появится после запуска runtime." : "";

  return (
    <section className="database-studio-card ide-database-tree">
      <div className="database-studio-head">
        <div>
          <span className="database-studio-title">Database</span>
          <small>{busy ? "обновление…" : status}</small>
        </div>
        <div className="database-tool-tabs" role="tablist" aria-label="Инструменты базы данных">
          <button
            className={`database-tool-tab${tab === "structure" ? " active" : ""}`}
            title="Структура"
            onClick={() => setTab("structure")}
          >▦</button>
          <button
            className={`database-tool-tab${tab === "erd" ? " active" : ""}`}
            title="ERD"
            onClick={() => setTab("erd")}
          >⌁</button>
          <button
            className={`database-tool-tab${tab === "load" ? " active" : ""}`}
            title="Нагрузка"
            onClick={() => setTab("load")}
          >◴</button>
          <button className="database-refresh" title="Обновить структуру" disabled={busy} onClick={refresh}>↻</button>
        </div>
      </div>

      {tab === "structure" && (
        <div className="database-tool-panel">
          <div className="schema-browser">
            <aside className="schema-table-list">
              {schema.tables.length === 0 && <div className="schema-empty">{emptyMessage || "В базе пока нет пользовательских таблиц."}</div>}
              {schema.tables.map((table) => (
                <button
                  key={table.name}
                  className={`schema-table-item${table.name === selectedTable ? " active" : ""}`}
                  onClick={() => setSelectedTable(table.name)}
                  onDoubleClick={() => openTable(table.name)}
                >
                  <span className="schema-table-icon">T</span>
                  <span className="schema-table-copy">
                    <strong>{table.name}</strong>
                    <small>{table.columns.length} cols · {table.indexes.length} idx · {table.foreignKeys.length} fk</small>
                  </span>
                </button>
              ))}
            </aside>
            <SchemaDetail
              schema={schema}
              selectedTable={selectedTable}
              onOpenTable={openTable}
              emptyMessage={emptyMessage || "Создайте таблицу через SQL Console — она сразу появится здесь."}
            />
          </div>
        </div>
      )}

      {tab === "erd" && (
        <div className="database-tool-panel">
          <div className="database-panel-note database-panel-note-action">
            <span>
              Диаграмма строится из фактической схемы runtime. Создайте или измените таблицы через SQL Console
              и нажмите Refresh при необходимости. Двойной клик по таблице вставит SELECT в редактор.
            </span>
            <button className="small-action" onClick={() => openDesigner(null)}>ER Designer</button>
            <ApplyDesignerButton onRefresh={refresh} onDone={() => setTab("erd")} onStatus={setStatus} />
          </div>
          <LiveErd schema={schema} onOpenTable={openTable} empty={emptyMessage} />
        </div>
      )}

      {tab === "load" && <LoadPanel onRefresh={refresh} />}
    </section>
  );
}

function SchemaDetail({ schema, selectedTable, onOpenTable, emptyMessage }) {
  const table = schema.tables.find((item) => item.name === selectedTable) || schema.tables[0];
  if (!table) {
    return <div className="schema-detail"><div className="schema-empty">{emptyMessage}</div></div>;
  }

  return (
    <div className="schema-detail">
      <div className="schema-detail-head">
        <div>
          <div className="schema-detail-kicker">TABLE</div>
          <h3>{table.name}</h3>
        </div>
        <button className="small-action" onClick={() => onOpenTable(table.name)}>SELECT *</button>
      </div>

      <div className="schema-detail-section">
        <div className="schema-section-title">Колонки</div>
        <div className="schema-columns-wrap">
          <table className="schema-columns">
            <thead><tr><th>Имя</th><th>Тип</th><th>Key</th><th>Nullable</th><th>Default</th></tr></thead>
            <tbody>
              {table.columns.map((column) => (
                <tr key={column.name}>
                  <td><span className="column-name">{column.name}</span></td>
                  <td><code>{column.type || "—"}</code></td>
                  <td>
                    {column.primaryKey && <span className="schema-pill key">PK</span>}
                    {column.identity && <span className="schema-pill">identity</span>}
                  </td>
                  <td>{column.nullable ? "NULL" : "NOT NULL"}</td>
                  <td className="schema-default">
                    {column.default == null ? "—" : <code>{column.default}</code>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="schema-detail-grid">
        <div className="schema-detail-section">
          <div className="schema-section-title">Индексы</div>
          {table.indexes.length === 0 && <div className="schema-empty compact">Пользовательских индексов нет.</div>}
          {table.indexes.map((index) => (
            <div className="schema-object" key={index.name}>
              <div>
                <span className={`schema-pill${index.unique ? " key" : ""}`}>{index.unique ? "UNIQUE" : "INDEX"}</span>{" "}
                <strong>{index.name}</strong>
              </div>
              <small>{(index.columns || []).join(", ") || index.definition || ""}</small>
            </div>
          ))}
        </div>
        <div className="schema-detail-section">
          <div className="schema-section-title">Связи</div>
          {table.foreignKeys.length === 0 && <div className="schema-empty compact">Внешних ключей нет.</div>}
          {table.foreignKeys.map((fk, index) => (
            <div className="schema-object" key={`${fk.column}-${index}`}>
              <strong>{fk.column}</strong>
              <span className="schema-relation-arrow">→</span>
              <code>{fk.refTable}.{fk.refColumn}</code>
              <small>
                {[fk.onUpdate && `UPDATE ${fk.onUpdate}`, fk.onDelete && `DELETE ${fk.onDelete}`].filter(Boolean).join(" · ")}
              </small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function designerDDL(model) {
  if (!model || !Array.isArray(model.tables)) return "";
  const byId = Object.fromEntries(model.tables.map((table) => [table.id, table]));
  const visited = new Set();
  const order = [];

  const visit = (table, stack = new Set()) => {
    if (!table || visited.has(table.id) || stack.has(table.id)) return;
    stack.add(table.id);
    for (const column of table.columns || []) {
      if (column.fk && byId[column.fk.tableId]) visit(byId[column.fk.tableId], stack);
    }
    stack.delete(table.id);
    visited.add(table.id);
    order.push(table);
  };

  model.tables.forEach((table) => visit(table));

  return order.map((table) => {
    const columns = (table.columns || []).map((column) => {
      let line = `  ${quoteIdent(column.name)} ${column.type || "TEXT"}`;
      if (column.pk) line += " PRIMARY KEY";
      return line;
    });
    for (const column of table.columns || []) {
      if (!column.fk || !byId[column.fk.tableId]) continue;
      const target = byId[column.fk.tableId];
      columns.push(
        `  FOREIGN KEY (${quoteIdent(column.name)}) REFERENCES ${quoteIdent(target.name)}(${quoteIdent(column.fk.column)})`
      );
    }
    return `CREATE TABLE ${quoteIdent(table.name)} (\n${columns.join(",\n")}\n);`;
  }).join("\n\n");
}

function ApplyDesignerButton({ onRefresh, onDone, onStatus }) {
  const apply = async () => {
    let model;
    try {
      model = JSON.parse(localStorage.getItem("sqltr.design.sandbox") || "null");
    } catch {
      model = null;
    }
    if (!model || !Array.isArray(model.tables) || !model.tables.length) {
      onStatus("ER Designer пока пуст");
      return;
    }
    const ddl = designerDDL(model);
    if (!ddl) {
      onStatus("Не удалось сформировать DDL");
      return;
    }
    if (!window.confirm("Применить схему из ER Designer к текущему runtime? Существующие таблицы не удаляются.")) return;

    const result = await runtime.execute(ddl, { internal: true });
    if (result?.error) {
      onStatus(`DDL error: ${result.error}`);
      return;
    }
    onStatus("Схема из ER Designer применена");
    await onRefresh();
    onDone();
  };
  return <button className="small-action" onClick={apply}>Применить ER Designer → runtime</button>;
}

function LiveErd({ schema, onOpenTable, empty }) {
  const viewportRef = useRef(null);
  const stageRef = useRef(null);
  const svgRef = useRef(null);
  const tables = schema.tables || [];

  const drawRelations = useCallback(() => {
    const stage = stageRef.current;
    const svg = svgRef.current;
    const viewport = viewportRef.current;
    if (!stage || !svg || !viewport) return;

    const stageRect = stage.getBoundingClientRect();
    const width = Math.max(stage.scrollWidth, stage.clientWidth);
    const height = Math.max(stage.scrollHeight, stage.clientHeight);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const paths = [];
    for (const table of tables) {
      const fromCard = stage.querySelector(`[data-erd-table="${CSS.escape(table.name)}"]`);
      if (!fromCard) continue;
      for (const fk of table.foreignKeys || []) {
        const toCard = stage.querySelector(`[data-erd-table="${CSS.escape(fk.refTable)}"]`);
        if (!toCard) continue;
        const fromRect = fromCard.getBoundingClientRect();
        const toRect = toCard.getBoundingClientRect();
        const fromCenterX = fromRect.left - stageRect.left + viewport.scrollLeft + fromRect.width / 2;
        const toCenterX = toRect.left - stageRect.left + viewport.scrollLeft + toRect.width / 2;
        const leftToRight = fromCenterX <= toCenterX;
        const x1 = leftToRight ? fromRect.right - stageRect.left : fromRect.left - stageRect.left;
        const x2 = leftToRight ? toRect.left - stageRect.left : toRect.right - stageRect.left;
        const y1 = fromRect.top - stageRect.top + Math.min(70, fromRect.height / 2);
        const y2 = toRect.top - stageRect.top + Math.min(70, toRect.height / 2);
        const bend = Math.max(50, Math.abs(x2 - x1) * 0.45);
        const c1 = x1 + (leftToRight ? bend : -bend);
        const c2 = x2 + (leftToRight ? -bend : bend);
        paths.push(
          `<path class="erd-link" d="M ${x1} ${y1} C ${c1} ${y1}, ${c2} ${y2}, ${x2} ${y2}" marker-end="url(#erd-arrow)"></path>`
        );
      }
    }
    svg.innerHTML =
      `<defs><marker id="erd-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z"></path></marker></defs>` +
      paths.join("");
  }, [tables]);

  useEffect(() => {
    if (!tables.length) return undefined;
    const raf = requestAnimationFrame(drawRelations);
    return () => cancelAnimationFrame(raf);
  }, [drawRelations, tables]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !tables.length) return undefined;

    let pan = null;
    const onDown = (event) => {
      if (event.button !== 0 || event.target.closest(".erd-table")) return;
      pan = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
      viewport.classList.add("panning");
      viewport.setPointerCapture(event.pointerId);
    };
    const onMove = (event) => {
      if (!pan) return;
      viewport.scrollLeft = pan.left - (event.clientX - pan.x);
      viewport.scrollTop = pan.top - (event.clientY - pan.y);
    };
    const stop = () => {
      pan = null;
      viewport.classList.remove("panning");
    };
    viewport.addEventListener("pointerdown", onDown);
    viewport.addEventListener("pointermove", onMove);
    viewport.addEventListener("pointerup", stop);
    viewport.addEventListener("pointercancel", stop);
    return () => {
      viewport.removeEventListener("pointerdown", onDown);
      viewport.removeEventListener("pointermove", onMove);
      viewport.removeEventListener("pointerup", stop);
      viewport.removeEventListener("pointercancel", stop);
    };
  }, [tables]);

  const startCardDrag = (event, card) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const stage = stageRef.current;
    const handle = event.currentTarget;
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = parseFloat(card.style.left) || 0;
    const startTop = parseFloat(card.style.top) || 0;
    handle.setPointerCapture(event.pointerId);
    card.classList.add("dragging");

    const move = (ev) => {
      const left = Math.max(8, startLeft + ev.clientX - startX);
      const top = Math.max(8, startTop + ev.clientY - startY);
      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
      stage.style.width = `${Math.max(900, left + card.offsetWidth + 40)}px`;
      stage.style.height = `${Math.max(440, top + card.offsetHeight + 40)}px`;
      drawRelations();
    };
    const stop = () => {
      card.classList.remove("dragging");
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  };

  if (!tables.length) {
    return <div className="live-erd"><div className="schema-empty">Создайте таблицы — Live ERD построится автоматически.</div></div>;
  }

  return (
    <div className="live-erd" ref={viewportRef}>
      <div className="erd-stage" ref={stageRef} style={{ width: 900, height: 440 }}>
        <svg className="erd-links" ref={svgRef} aria-hidden="true" />
        <div className="erd-grid">
          {tables.map((table, index) => (
            <article
              key={table.name}
              className="erd-table"
              data-erd-table={table.name}
              style={{ left: `${28 + (index % 3) * 290}px`, top: `${28 + Math.floor(index / 3) * 300}px` }}
              onDoubleClick={() => onOpenTable(table.name)}
            >
              <header onPointerDown={(event) => startCardDrag(event, event.currentTarget.parentElement)}>
                <span>{table.name}</span>
                <small>{table.columns.length}</small>
              </header>
              <div className="erd-columns">
                {table.columns.map((column) => {
                  const fk = table.foreignKeys.find((item) => item.column === column.name);
                  return (
                    <div
                      key={column.name}
                      className={`erd-column${column.primaryKey ? " pk" : ""}${fk ? " fk" : ""}`}
                      data-column={column.name}
                    >
                      <span className="erd-key">{column.primaryKey ? "PK" : fk ? "FK" : ""}</span>
                      <span className="erd-column-name">{column.name}</span>
                      <span className="erd-type">{column.type || ""}</span>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

const METRICS = ["avg", "p50", "p95", "p99", "ops/s", "rows"];

function LoadPanel({ onRefresh }) {
  const { sandbox } = useApp();
  const [rowCount, setRowCount] = useState(10000);
  const [iterations, setIterations] = useState(30);
  const [query, setQuery] = useState(DEFAULT_LOAD_QUERY);
  const [metrics, setMetrics] = useState(METRICS.map((metric) => ({ metric, value: "—" })));
  const [loadStatus, setLoadStatus] = useState("Сначала создайте dataset или используйте свой запрос.");
  const [busy, setBusy] = useState(false);

  const engine = runtime.activeId || "sqlite";
  const runtimeName = engine === "postgres" ? "PostgreSQL / PGlite" : "SQLite / sql.js";

  const generate = async () => {
    const count = Math.max(100, Math.min(250000, Number(rowCount) || 10000));
    setRowCount(count);
    setBusy(true);
    setLoadStatus(`Создание ${count.toLocaleString("ru-RU")} строк…`);
    const started = performance.now();
    try {
      let result;
      if (runtime.activeId === "postgres") {
        result = await runtime.execute(`
          DROP TABLE IF EXISTS lab_load_events;
          CREATE TABLE lab_load_events (
            id BIGINT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL,
            payload TEXT NOT NULL
          );
          INSERT INTO lab_load_events (id, user_id, category, created_at, payload)
          SELECT i,
                 (i % 1000) + 1,
                 'category-' || (i % 20),
                 TIMESTAMP '2024-01-01' + ((i % 31536000) * INTERVAL '1 second'),
                 repeat('x', 80)
          FROM generate_series(1, ${count}) AS g(i);
        `, { internal: true });
        if (result?.error) throw new Error(result.error);
      } else {
        result = await runtime.execute(`
          DROP TABLE IF EXISTS lab_load_events;
          CREATE TABLE lab_load_events (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            created_at TEXT NOT NULL,
            payload TEXT NOT NULL
          );
        `, { internal: true });
        if (result?.error) throw new Error(result.error);

        const chunkSize = 400;
        for (let start = 1; start <= count; start += chunkSize) {
          const end = Math.min(count, start + chunkSize - 1);
          result = await runtime.execute(`
            WITH RECURSIVE seq(i) AS (
              SELECT ${start}
              UNION ALL
              SELECT i + 1 FROM seq WHERE i < ${end}
            )
            INSERT INTO lab_load_events (id, user_id, category, created_at, payload)
            SELECT i,
                   (i % 1000) + 1,
                   'category-' || (i % 20),
                   datetime('2024-01-01', '+' || (i % 31536000) || ' seconds'),
                   printf('%080d', i)
            FROM seq;
          `, { internal: true });
          if (result?.error) throw new Error(result.error);
          setLoadStatus(`Записано ${end.toLocaleString("ru-RU")} / ${count.toLocaleString("ru-RU")}…`);
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
      const duration = performance.now() - started;
      setLoadStatus(`Dataset готов: ${count.toLocaleString("ru-RU")} строк за ${fmtMs(duration)}.`);
      await onRefresh();
    } catch (err) {
      setLoadStatus(`Ошибка генерации: ${(err && err.message) || err}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleIndex = async (create) => {
    const sql = create
      ? "CREATE INDEX IF NOT EXISTS idx_lab_load_events_user_created ON lab_load_events(user_id, created_at DESC);"
      : "DROP INDEX IF EXISTS idx_lab_load_events_user_created;";
    const started = performance.now();
    const result = await runtime.execute(sql, { internal: true });
    if (result?.error) {
      setLoadStatus(result.error);
      return;
    }
    setLoadStatus(`${create ? "Индекс создан" : "Индекс удалён"} за ${fmtMs(performance.now() - started)}. Запустите benchmark и сравните p95.`);
    await onRefresh();
  };

  const benchmark = async () => {
    const sql = String(query || "").trim();
    const count = Math.max(5, Math.min(200, Number(iterations) || 30));
    setIterations(count);
    if (!sql) {
      setLoadStatus("Введите запрос для benchmark.");
      return;
    }
    setBusy(true);
    setLoadStatus("Прогрев runtime…");
    try {
      for (let i = 0; i < 3; i++) {
        const warm = await runtime.execute(sql, { internal: true });
        if (warm?.error) throw new Error(warm.error);
      }
      const samples = [];
      let rows = 0;
      for (let i = 0; i < count; i++) {
        const started = performance.now();
        const result = await runtime.execute(sql, { internal: true });
        const elapsed = performance.now() - started;
        if (result?.error) throw new Error(result.error);
        rows = Array.isArray(result?.rows) ? result.rows.length : 0;
        samples.push(elapsed);
        setLoadStatus(`Benchmark ${i + 1} / ${count}…`);
        if (i % 8 === 7) await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const sorted = [...samples].sort((a, b) => a - b);
      const total = samples.reduce((sum, value) => sum + value, 0);
      const avg = total / samples.length;
      const qps = avg > 0 ? 1000 / avg : 0;
      setMetrics([
        { metric: "avg", value: fmtMs(avg) },
        { metric: "p50", value: fmtMs(percentile(sorted, 50)) },
        { metric: "p95", value: fmtMs(percentile(sorted, 95)) },
        { metric: "p99", value: fmtMs(percentile(sorted, 99)) },
        { metric: "ops/s", value: qps.toFixed(qps >= 100 ? 0 : 1) },
        { metric: "rows", value: String(rows) },
      ]);
      setLoadStatus(`Готово: ${count} последовательных выполнений. Сравните результат до и после индекса.`);
    } catch (err) {
      setLoadStatus(`Benchmark остановлен: ${(err && err.message) || err}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="database-tool-panel">
      <div className="load-layout">
        <section className="load-config">
          <div className="load-section-title">1. Данные для эксперимента</div>
          <p className="load-copy">
            Создайте отдельную таблицу <code>lab_load_events</code>, чтобы безопасно сравнивать запросы и индексы,
            не затрагивая собственную схему.
          </p>
          <label className="load-field">
            <span>Количество строк</span>
            <input type="number" min="100" max="250000" step="1000" value={rowCount} onChange={(event) => setRowCount(event.target.value)} />
          </label>
          <div className="load-actions">
            <button className="primary" disabled={busy} onClick={generate}>Создать dataset</button>
            <button disabled={busy} onClick={() => toggleIndex(true)}>+ Индекс</button>
            <button disabled={busy} onClick={() => toggleIndex(false)}>− Индекс</button>
          </div>
          <div className="load-section-title load-query-title">2. Запрос для benchmark</div>
          <textarea className="load-query" spellCheck={false} value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="load-benchmark-row">
            <label className="load-field compact-field">
              <span>Повторов</span>
              <input type="number" min="5" max="200" value={iterations} onChange={(event) => setIterations(event.target.value)} />
            </label>
            <button disabled={busy} onClick={() => setQuery(String(sandbox.draft || "").trim() || query)}>Взять SQL из Console</button>
            <button className="primary" disabled={busy} onClick={benchmark}>Run benchmark</button>
          </div>
        </section>
        <aside className="load-results">
          <div className="load-section-title">Результаты</div>
          <div className="load-runtime-hint">
            <strong>{runtimeName}</strong> · локальный browser benchmark.{" "}
            {engine === "postgres"
              ? "Он показывает влияние данных, индексов и SQL, но не имитирует многопользовательский PostgreSQL-сервер."
              : "Он показывает влияние данных, индексов и SQL в локальном SQLite runtime."}
          </div>
          <div className="load-metrics">
            {metrics.map((item) => (
              <div className="load-metric" key={item.metric}><small>{item.metric}</small><strong>{item.value}</strong></div>
            ))}
          </div>
          <div className="load-status">{loadStatus}</div>
          <div className="load-learning-note">
            Попробуйте benchmark без индекса, затем создайте индекс и повторите. Так видно, как структура БД влияет на latency.
          </div>
        </aside>
      </div>
    </div>
  );
}
