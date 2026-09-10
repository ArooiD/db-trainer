// SQLite/sql.js adapter for IT Study Lab.
(function () {
  const ns = (window.ITStudyLab = window.ITStudyLab || {});
  const LabEngine = ns.LabEngine;
  const MAX_ROWS = 500;

  function base64ToBytes(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function commonSchemaDoc() {
    return [
      "Таблица `departments` — отделы компании.",
      "  id INTEGER PK, name TEXT, budget REAL",
      "",
      "Таблица `employees` — сотрудники.",
      "  id INTEGER PK, first_name TEXT, last_name TEXT, email TEXT,",
      "  department_id INTEGER -> departments.id (может быть NULL),",
      "  salary REAL, hired_at TEXT ('ГГГГ-ММ-ДД'), is_active INTEGER (1 = работает)",
      "",
      "Таблица `projects` — проекты.",
      "  id INTEGER PK, name TEXT, department_id INTEGER -> departments.id,",
      "  started_at TEXT, finished_at TEXT (NULL = проект ещё идёт)",
      "",
      "Таблица `assignments` — работы сотрудников над проектами.",
      "  id INTEGER PK, employee_id INTEGER -> employees.id,",
      "  project_id INTEGER -> projects.id, role TEXT, hours INTEGER",
    ].join("\n");
  }

  class SqliteEngine extends LabEngine {
    constructor() {
      super({
        id: "sqlite",
        label: "SQLite",
        technology: "sql.js / WASM",
        dialect: "sqlite",
        description: "Лёгкая полностью локальная SQL-среда, работающая офлайн.",
        networkRequired: false,
        capabilities: ["sql", "ddl", "dml", "schema", "snapshot"],
      });
      this.db = null;
      this.SQL = null;
    }

    async init() {
      if (this.ready) return this;
      this.SQL = await initSqlJs({ wasmBinary: base64ToBytes(window.SQL_WASM_B64) });
      await this._seed();
      this._ready = true;
      return this;
    }

    async _seed() {
      if (this.db) this.db.close();
      this.db = new this.SQL.Database();
      this.db.run(window.DB_DATA.schema);
      for (const [table, def] of Object.entries(window.DB_DATA.tables)) {
        const ph = def.columns.map(() => "?").join(",");
        const stmt = this.db.prepare(`INSERT INTO ${table} VALUES (${ph})`);
        for (const row of def.rows) stmt.run(row);
        stmt.free();
      }
    }

    async execute(sql) {
      if (!this.ready || !this.db) return { error: "SQLite ещё не готов." };
      try {
        const res = this.db.exec(sql);
        if (!res.length) return { columns: [], rows: [], truncated: false };
        const { columns, values } = res[res.length - 1];
        const truncated = values.length > MAX_ROWS;
        const rows = values.slice(0, MAX_ROWS).map((r) => r.map((v) => (v === undefined ? null : v)));
        return { columns, rows, truncated };
      } catch (e) {
        return { error: String((e && e.message) || e) };
      }
    }

    async reset() {
      await this._seed();
      return this;
    }

    schemaDoc() {
      return `Runtime: SQLite (sql.js / WASM)\nDialect: SQLite\n\n${commonSchemaDoc()}`;
    }

    async snapshot() { return this.db ? this.db.export() : null; }

    async destroy() {
      if (this.db) this.db.close();
      this.db = null;
      this._ready = false;
    }
  }

  ns.SqliteEngine = SqliteEngine;
  ns.runtime.register("sqlite", () => new SqliteEngine(), {
    label: "SQLite",
    technology: "sql.js / WASM",
    dialect: "sqlite",
    description: "Полностью локально и офлайн",
    networkRequired: false,
    capabilities: ["sql", "ddl", "dml", "schema", "snapshot"],
  });
})();
