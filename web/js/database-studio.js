// Database Sandbox tools: live schema explorer, ERD and educational benchmark lab.
(function () {
  const ns = (window.ITStudyLab = window.ITStudyLab || {});
  const runtime = ns.runtime;
  const $ = (id) => document.getElementById(id);

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

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

  class DatabaseStudio {
    constructor() {
      this.schema = { tables: [] };
      this.selectedTable = "";
      this.activeTab = "structure";
      this.refreshTimer = null;
      this.unsubscribe = null;
    }

    init() {
      if (!$("database-studio")) return;

      document.querySelectorAll("[data-db-tool-tab]").forEach((button) => {
        button.addEventListener("click", () => this.setTab(button.dataset.dbToolTab));
      });

      $("db-inspector-refresh")?.addEventListener("click", () => this.refresh());
      $("db-apply-designer")?.addEventListener("click", () => this.applyDesignerDraft());
      $("load-generate")?.addEventListener("click", () => this.generateLoadDataset());
      $("load-benchmark")?.addEventListener("click", () => this.runBenchmark());
      $("load-add-index")?.addEventListener("click", () => this.toggleIndex(true));
      $("load-drop-index")?.addEventListener("click", () => this.toggleIndex(false));
      $("load-use-editor")?.addEventListener("click", () => {
        const editor = $("sandbox-editor");
        if (editor) $("load-query").value = editor.value.trim();
      });

      this.unsubscribe = runtime.onEvent((event) => this.onRuntimeEvent(event));

      if (runtime.active) this.refresh();
      else this.renderEmpty("Схема появится после запуска runtime.");
    }

    onRuntimeEvent(event) {
      if (event.type === "use" || event.type === "reset") {
        this.scheduleRefresh(30);
        return;
      }
      if (
        event.type === "execute" &&
        !event.options?.internal &&
        event.result &&
        !event.result.error &&
        /\b(create|alter|drop|truncate|rename)\b/i.test(String(event.command || ""))
      ) {
        this.scheduleRefresh(80);
      }
    }

    scheduleRefresh(delay = 50) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(() => this.refresh(), delay);
    }

    setTab(tab) {
      this.activeTab = ["structure", "erd", "load"].includes(tab) ? tab : "structure";
      document.querySelectorAll("[data-db-tool-tab]").forEach((button) => {
        button.classList.toggle("active", button.dataset.dbToolTab === this.activeTab);
      });
      ["structure", "erd", "load"].forEach((name) => {
        $(`db-tool-${name}`)?.classList.toggle("hidden", name !== this.activeTab);
      });
      if (this.activeTab === "erd") this.renderERD();
      if (this.activeTab === "load") this.syncLoadHint();
    }

    setBusy(busy, text = "") {
      const refresh = $("db-inspector-refresh");
      if (refresh) refresh.disabled = !!busy;
      const status = $("db-inspector-status");
      if (status) status.textContent = text || (busy ? "обновление…" : "");
    }

    renderEmpty(message) {
      const tableList = $("schema-table-list");
      const detail = $("schema-detail");
      if (tableList) tableList.innerHTML = `<div class="schema-empty">${esc(message)}</div>`;
      if (detail) detail.innerHTML = `<div class="schema-empty">${esc(message)}</div>`;
      const erd = $("live-erd");
      if (erd) erd.innerHTML = `<div class="schema-empty">${esc(message)}</div>`;
    }

    async refresh() {
      if (!runtime.active || typeof runtime.inspectSchema !== "function") {
        this.renderEmpty("Runtime не поддерживает просмотр структуры.");
        return;
      }
      this.setBusy(true);
      try {
        const schema = await runtime.inspectSchema();
        this.schema = schema && Array.isArray(schema.tables) ? schema : { engine: runtime.activeId, tables: [] };

        if (
          !this.selectedTable ||
          !this.schema.tables.some((table) => table.name === this.selectedTable)
        ) {
          this.selectedTable = this.schema.tables[0]?.name || "";
        }

        this.renderStructure();
        if (this.activeTab === "erd") this.renderERD();
        this.syncLoadHint();

        const status = $("db-inspector-status");
        if (status) {
          const count = this.schema.tables.length;
          status.textContent = `${count} ${count === 1 ? "таблица" : count >= 2 && count <= 4 ? "таблицы" : "таблиц"}`;
        }
      } catch (err) {
        this.renderEmpty(`Не удалось прочитать структуру: ${(err && err.message) || err}`);
      } finally {
        this.setBusy(false, $("db-inspector-status")?.textContent || "");
      }
    }

    renderStructure() {
      const tables = this.schema.tables || [];
      const list = $("schema-table-list");
      const detail = $("schema-detail");
      if (!list || !detail) return;

      if (!tables.length) {
        list.innerHTML = '<div class="schema-empty">В базе пока нет пользовательских таблиц.</div>';
        detail.innerHTML =
          '<div class="schema-empty">Создайте таблицу через SQL Console — она сразу появится здесь.</div>';
        return;
      }

      list.innerHTML = tables
        .map((table) => `
          <button class="schema-table-item ${table.name === this.selectedTable ? "active" : ""}" data-schema-table="${esc(table.name)}">
            <span class="schema-table-icon">T</span>
            <span class="schema-table-copy">
              <strong>${esc(table.name)}</strong>
              <small>${table.columns.length} cols · ${table.indexes.length} idx · ${table.foreignKeys.length} fk</small>
            </span>
          </button>
        `)
        .join("");

      list.querySelectorAll("[data-schema-table]").forEach((button) => {
        button.addEventListener("click", () => {
          this.selectedTable = button.dataset.schemaTable;
          this.renderStructure();
        });
        button.addEventListener("dblclick", () => this.openTable(button.dataset.schemaTable));
      });

      const table = tables.find((item) => item.name === this.selectedTable) || tables[0];
      if (!table) return;

      const columns = table.columns
        .map((column) => `
          <tr>
            <td><span class="column-name">${esc(column.name)}</span></td>
            <td><code>${esc(column.type || "—")}</code></td>
            <td>${column.primaryKey ? '<span class="schema-pill key">PK</span>' : ""}${column.identity ? '<span class="schema-pill">identity</span>' : ""}</td>
            <td>${column.nullable ? "NULL" : "NOT NULL"}</td>
            <td class="schema-default">${column.default == null ? "—" : `<code>${esc(column.default)}</code>`}</td>
          </tr>
        `)
        .join("");

      const indexes = table.indexes.length
        ? table.indexes
            .map((index) => `
              <div class="schema-object">
                <div><span class="schema-pill ${index.unique ? "key" : ""}">${index.unique ? "UNIQUE" : "INDEX"}</span> <strong>${esc(index.name)}</strong></div>
                <small>${esc((index.columns || []).join(", ") || index.definition || "")}</small>
              </div>
            `)
            .join("")
        : '<div class="schema-empty compact">Пользовательских индексов нет.</div>';

      const foreignKeys = table.foreignKeys.length
        ? table.foreignKeys
            .map((fk) => `
              <div class="schema-object">
                <strong>${esc(fk.column)}</strong>
                <span class="schema-relation-arrow">→</span>
                <code>${esc(fk.refTable)}.${esc(fk.refColumn)}</code>
                <small>${esc([fk.onUpdate && `UPDATE ${fk.onUpdate}`, fk.onDelete && `DELETE ${fk.onDelete}`].filter(Boolean).join(" · "))}</small>
              </div>
            `)
            .join("")
        : '<div class="schema-empty compact">Внешних ключей нет.</div>';

      detail.innerHTML = `
        <div class="schema-detail-head">
          <div>
            <div class="schema-detail-kicker">TABLE</div>
            <h3>${esc(table.name)}</h3>
          </div>
          <button class="small-action" id="schema-open-table">SELECT *</button>
        </div>
        <div class="schema-detail-section">
          <div class="schema-section-title">Колонки</div>
          <div class="schema-columns-wrap">
            <table class="schema-columns">
              <thead><tr><th>Имя</th><th>Тип</th><th>Key</th><th>Nullable</th><th>Default</th></tr></thead>
              <tbody>${columns}</tbody>
            </table>
          </div>
        </div>
        <div class="schema-detail-grid">
          <div class="schema-detail-section">
            <div class="schema-section-title">Индексы</div>
            ${indexes}
          </div>
          <div class="schema-detail-section">
            <div class="schema-section-title">Связи</div>
            ${foreignKeys}
          </div>
        </div>
      `;

      $("schema-open-table")?.addEventListener("click", () => this.openTable(table.name));
    }

    openTable(tableName) {
      const editor = $("sandbox-editor");
      if (!editor) return;
      editor.value = `SELECT *\nFROM ${quoteIdent(tableName)}\nLIMIT 100;`;
      editor.focus();
      window.dispatchEvent(new CustomEvent("it-study-lab:open-table", {
        detail: { tableName },
      }));
    }

    designerDDL(model) {
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

    async applyDesignerDraft() {
      const status = $("db-inspector-status");
      let model;
      try {
        model = JSON.parse(localStorage.getItem("sqltr.design.sandbox") || "null");
      } catch {
        model = null;
      }

      if (!model || !Array.isArray(model.tables) || !model.tables.length) {
        if (status) status.textContent = "ER Designer пока пуст";
        return;
      }

      const ddl = this.designerDDL(model);
      if (!ddl) {
        if (status) status.textContent = "Не удалось сформировать DDL";
        return;
      }

      if (!confirm("Применить схему из ER Designer к текущему runtime? Существующие таблицы не удаляются.")) {
        return;
      }

      const result = await runtime.execute(ddl, { internal: true });
      if (result?.error) {
        if (status) status.textContent = `DDL error: ${result.error}`;
        return;
      }

      if (status) status.textContent = "Схема из ER Designer применена";
      await this.refresh();
      this.setTab("erd");
    }

    renderERD() {
      const target = $("live-erd");
      if (!target) return;
      const tables = this.schema.tables || [];

      if (!tables.length) {
        target.innerHTML = '<div class="schema-empty">Создайте таблицы — Live ERD построится автоматически.</div>';
        return;
      }

      target.innerHTML = `
        <div class="erd-stage" id="erd-stage">
          <svg class="erd-links" id="erd-links" aria-hidden="true">
            <defs>
              <marker id="erd-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z"></path>
              </marker>
            </defs>
          </svg>
          <div class="erd-grid">
            ${tables.map((table, index) => {
              const x = 28 + (index % 3) * 290;
              const y = 28 + Math.floor(index / 3) * 300;
              return `
              <article class="erd-table" data-erd-table="${esc(table.name)}" style="left:${x}px;top:${y}px">
                <header>
                  <span>${esc(table.name)}</span>
                  <small>${table.columns.length}</small>
                </header>
                <div class="erd-columns">
                  ${table.columns.map((column) => {
                    const fk = table.foreignKeys.find((item) => item.column === column.name);
                    return `
                      <div class="erd-column ${column.primaryKey ? "pk" : ""} ${fk ? "fk" : ""}" data-column="${esc(column.name)}">
                        <span class="erd-key">${column.primaryKey ? "PK" : fk ? "FK" : ""}</span>
                        <span class="erd-column-name">${esc(column.name)}</span>
                        <span class="erd-type">${esc(column.type || "")}</span>
                      </div>
                    `;
                  }).join("")}
                </div>
              </article>
            `;
            }).join("")}
          </div>
        </div>
      `;

      target.querySelectorAll("[data-erd-table]").forEach((card) => {
        card.addEventListener("dblclick", () => this.openTable(card.dataset.erdTable));
      });

      this.enableErdInteractions();
      requestAnimationFrame(() => this.drawRelations());
    }

    enableErdInteractions() {
      const viewport = $("live-erd");
      const stage = $("erd-stage");
      if (!viewport || !stage) return;

      const cards = [...stage.querySelectorAll(".erd-table")];
      const maxBottom = Math.max(440, ...cards.map((card) => parseFloat(card.style.top) + card.offsetHeight + 40));
      stage.style.width = "900px";
      stage.style.height = `${maxBottom}px`;

      let pan = null;
      viewport.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || event.target.closest(".erd-table")) return;
        pan = {
          x: event.clientX,
          y: event.clientY,
          left: viewport.scrollLeft,
          top: viewport.scrollTop,
        };
        viewport.classList.add("panning");
        viewport.setPointerCapture(event.pointerId);
      });
      viewport.addEventListener("pointermove", (event) => {
        if (!pan) return;
        viewport.scrollLeft = pan.left - (event.clientX - pan.x);
        viewport.scrollTop = pan.top - (event.clientY - pan.y);
      });
      const stopPan = () => {
        pan = null;
        viewport.classList.remove("panning");
      };
      viewport.addEventListener("pointerup", stopPan);
      viewport.addEventListener("pointercancel", stopPan);

      cards.forEach((card) => {
        const handle = card.querySelector("header");
        let drag = null;
        handle.addEventListener("pointerdown", (event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          drag = {
            x: event.clientX,
            y: event.clientY,
            left: parseFloat(card.style.left) || 0,
            top: parseFloat(card.style.top) || 0,
          };
          card.classList.add("dragging");
          handle.setPointerCapture(event.pointerId);
        });
        handle.addEventListener("pointermove", (event) => {
          if (!drag) return;
          const left = Math.max(8, drag.left + event.clientX - drag.x);
          const top = Math.max(8, drag.top + event.clientY - drag.y);
          card.style.left = `${left}px`;
          card.style.top = `${top}px`;
          stage.style.width = `${Math.max(900, left + card.offsetWidth + 40)}px`;
          stage.style.height = `${Math.max(440, top + card.offsetHeight + 40)}px`;
          this.drawRelations();
        });
        const stopDrag = () => {
          drag = null;
          card.classList.remove("dragging");
        };
        handle.addEventListener("pointerup", stopDrag);
        handle.addEventListener("pointercancel", stopDrag);
      });
    }

    drawRelations() {
      const stage = $("erd-stage");
      const svg = $("erd-links");
      if (!stage || !svg) return;

      const stageRect = stage.getBoundingClientRect();
      const width = Math.max(stage.scrollWidth, stage.clientWidth);
      const height = Math.max(stage.scrollHeight, stage.clientHeight);
      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

      const defs = svg.querySelector("defs")?.outerHTML || "";
      const paths = [];

      for (const table of this.schema.tables || []) {
        const fromCard = stage.querySelector(`[data-erd-table="${CSS.escape(table.name)}"]`);
        if (!fromCard) continue;

        for (const fk of table.foreignKeys || []) {
          const toCard = stage.querySelector(`[data-erd-table="${CSS.escape(fk.refTable)}"]`);
          if (!toCard) continue;

          const fromRect = fromCard.getBoundingClientRect();
          const toRect = toCard.getBoundingClientRect();
          const fromCenterX = fromRect.left - stageRect.left + stage.scrollLeft + fromRect.width / 2;
          const toCenterX = toRect.left - stageRect.left + stage.scrollLeft + toRect.width / 2;
          const leftToRight = fromCenterX <= toCenterX;

          const x1 = leftToRight
            ? fromRect.right - stageRect.left + stage.scrollLeft
            : fromRect.left - stageRect.left + stage.scrollLeft;
          const x2 = leftToRight
            ? toRect.left - stageRect.left + stage.scrollLeft
            : toRect.right - stageRect.left + stage.scrollLeft;
          const y1 = fromRect.top - stageRect.top + stage.scrollTop + Math.min(70, fromRect.height / 2);
          const y2 = toRect.top - stageRect.top + stage.scrollTop + Math.min(70, toRect.height / 2);
          const bend = Math.max(50, Math.abs(x2 - x1) * 0.45);
          const c1 = x1 + (leftToRight ? bend : -bend);
          const c2 = x2 + (leftToRight ? -bend : bend);

          paths.push(
            `<path class="erd-link" d="M ${x1} ${y1} C ${c1} ${y1}, ${c2} ${y2}, ${x2} ${y2}" marker-end="url(#erd-arrow)"></path>`
          );
        }
      }

      svg.innerHTML = defs + paths.join("");
    }

    syncLoadHint() {
      const engine = runtime.activeId || "sqlite";
      const runtimeName = engine === "postgres" ? "PostgreSQL / PGlite" : "SQLite / sql.js";
      const hint = $("load-runtime-hint");
      if (hint) {
        hint.innerHTML =
          `<strong>${esc(runtimeName)}</strong> · локальный browser benchmark. ` +
          (engine === "postgres"
            ? "Он показывает влияние данных, индексов и SQL, но не имитирует многопользовательский PostgreSQL-сервер."
            : "Он показывает влияние данных, индексов и SQL в локальном SQLite runtime.");
      }

      const query = $("load-query");
      if (query && !query.value.trim()) {
        query.value =
          "SELECT *\nFROM lab_load_events\nWHERE user_id = 42\nORDER BY created_at DESC\nLIMIT 20;";
      }
    }

    async generateLoadDataset() {
      if (!runtime.active) return;
      const button = $("load-generate");
      const output = $("load-status");
      const count = Math.max(100, Math.min(250000, Number($("load-row-count")?.value || 10000)));
      if ($("load-row-count")) $("load-row-count").value = String(count);

      if (button) button.disabled = true;
      if (output) output.textContent = `Создание ${count.toLocaleString("ru-RU")} строк…`;

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
            if (output) output.textContent = `Записано ${end.toLocaleString("ru-RU")} / ${count.toLocaleString("ru-RU")}…`;
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        const duration = performance.now() - started;
        if (output) output.textContent = `Dataset готов: ${count.toLocaleString("ru-RU")} строк за ${fmtMs(duration)}.`;
        await this.refresh();
      } catch (err) {
        if (output) output.textContent = `Ошибка генерации: ${(err && err.message) || err}`;
      } finally {
        if (button) button.disabled = false;
      }
    }

    async toggleIndex(create) {
      const output = $("load-status");
      const sql = create
        ? "CREATE INDEX IF NOT EXISTS idx_lab_load_events_user_created ON lab_load_events(user_id, created_at DESC);"
        : "DROP INDEX IF EXISTS idx_lab_load_events_user_created;";
      const started = performance.now();
      const result = await runtime.execute(sql, { internal: true });
      if (result?.error) {
        if (output) output.textContent = result.error;
        return;
      }
      if (output) {
        output.textContent = `${create ? "Индекс создан" : "Индекс удалён"} за ${fmtMs(performance.now() - started)}. Запустите benchmark и сравните p95.`;
      }
      await this.refresh();
    }

    async runBenchmark() {
      if (!runtime.active) return;
      const button = $("load-benchmark");
      const output = $("load-status");
      const query = String($("load-query")?.value || "").trim();
      const iterations = Math.max(5, Math.min(200, Number($("load-iterations")?.value || 30)));
      if ($("load-iterations")) $("load-iterations").value = String(iterations);

      if (!query) {
        if (output) output.textContent = "Введите запрос для benchmark.";
        return;
      }

      if (button) button.disabled = true;
      if (output) output.textContent = "Прогрев runtime…";

      try {
        for (let i = 0; i < 3; i++) {
          const warm = await runtime.execute(query, { internal: true });
          if (warm?.error) throw new Error(warm.error);
        }

        const samples = [];
        let rows = 0;
        for (let i = 0; i < iterations; i++) {
          const started = performance.now();
          const result = await runtime.execute(query, { internal: true });
          const elapsed = performance.now() - started;
          if (result?.error) throw new Error(result.error);
          rows = Array.isArray(result?.rows) ? result.rows.length : 0;
          samples.push(elapsed);
          if (output) output.textContent = `Benchmark ${i + 1} / ${iterations}…`;
          if (i % 8 === 7) await new Promise((resolve) => setTimeout(resolve, 0));
        }

        const sorted = [...samples].sort((a, b) => a - b);
        const total = samples.reduce((sum, value) => sum + value, 0);
        const avg = total / samples.length;
        const qps = avg > 0 ? 1000 / avg : 0;

        $("load-metrics").innerHTML = [
          ["avg", fmtMs(avg)],
          ["p50", fmtMs(percentile(sorted, 50))],
          ["p95", fmtMs(percentile(sorted, 95))],
          ["p99", fmtMs(percentile(sorted, 99))],
          ["ops/s", qps.toFixed(qps >= 100 ? 0 : 1)],
          ["rows", String(rows)],
        ]
          .map(([label, value]) => `<div class="load-metric"><small>${label}</small><strong>${esc(value)}</strong></div>`)
          .join("");

        if (output) output.textContent = `Готово: ${iterations} последовательных выполнений. Сравните результат до и после индекса.`;
      } catch (err) {
        if (output) output.textContent = `Benchmark остановлен: ${(err && err.message) || err}`;
      } finally {
        if (button) button.disabled = false;
      }
    }
  }

  ns.DatabaseStudio = DatabaseStudio;
  ns.databaseStudio = new DatabaseStudio();
  ns.databaseStudio.init();
})();
