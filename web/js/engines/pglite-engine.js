// PostgreSQL adapter powered by PGlite (real Postgres compiled to WASM).
// PGlite is copied into dist/vendor/pglite during npm run build and loaded lazily.
(function () {
  const ns = (window.ITStudyLab = window.ITStudyLab || {});
  const LabEngine = ns.LabEngine;
  const MAX_ROWS = 500;

  function quoteIdent(value) {
    return '"' + String(value).replace(/"/g, '""') + '"';
  }

  function commonSchemaDoc() {
    return [
      "Таблица `departments` — отделы компании.",
      "  id INTEGER PK, name TEXT, budget REAL",
      "",
      "Таблица `employees` — сотрудники.",
      "  id INTEGER PK, first_name TEXT, last_name TEXT, email TEXT,",
      "  department_id INTEGER -> departments.id (может быть NULL),",
      "  salary REAL, hired_at TEXT, is_active INTEGER",
      "",
      "Таблица `projects` — проекты.",
      "  id INTEGER PK, name TEXT, department_id INTEGER -> departments.id,",
      "  started_at TEXT, finished_at TEXT",
      "",
      "Таблица `assignments` — работы сотрудников над проектами.",
      "  id INTEGER PK, employee_id INTEGER -> employees.id,",
      "  project_id INTEGER -> projects.id, role TEXT, hours INTEGER",
    ].join("\n");
  }

  class PGliteEngine extends LabEngine {
    constructor() {
      super({
        id: "postgres",
        label: "PostgreSQL",
        technology: "PGlite / WASM",
        dialect: "postgresql",
        description: "Настоящий PostgreSQL, работающий локально в браузере через PGlite.",
        networkRequired: false,
        capabilities: ["sql", "ddl", "dml", "schema", "postgresql"],
      });
      this.db = null;
      this.PGlite = null;
    }

    async init() {
      if (this.ready) return this;
      if (location.protocol === "file:") {
        throw new Error("PostgreSQL Lab недоступен из standalone file://. Откройте IT Study Lab через GitHub Pages или локальный HTTP-сервер.");
      }

      const moduleUrl = new URL("vendor/pglite/index.js", document.baseURI).href;
      let mod;
      try {
        mod = await import(moduleUrl);
      } catch (err) {
        throw new Error(`Не удалось загрузить PGlite runtime. Выполните npm install && npm run build и открывайте dist/: ${(err && err.message) || err}`);
      }

      this.PGlite = mod.PGlite;
      if (!this.PGlite) throw new Error("PGlite module does not export PGlite");
      await this._seed();
      this._ready = true;
      return this;
    }

    async _seed() {
      if (this.db && typeof this.db.close === "function") await this.db.close();
      this.db = new this.PGlite();
      await this.db.exec(window.DB_DATA.schema);

      for (const [table, def] of Object.entries(window.DB_DATA.tables)) {
        const columns = def.columns.map(quoteIdent).join(", ");
        const placeholders = def.columns.map((_, i) => `$${i + 1}`).join(", ");
        const sql = `INSERT INTO ${quoteIdent(table)} (${columns}) VALUES (${placeholders})`;
        for (const row of def.rows) await this.db.query(sql, row);
      }
    }

    async execute(sql) {
      if (!this.ready || !this.db) return { error: "PostgreSQL ещё не готов." };
      try {
        const results = await this.db.exec(sql, { rowMode: "array" });
        if (!results.length) return { columns: [], rows: [], truncated: false };
        const last = results[results.length - 1] || {};
        const rows = Array.isArray(last.rows) ? last.rows : [];
        const fields = Array.isArray(last.fields) ? last.fields : [];
        const columns = fields.map((field) => field.name);
        const truncated = rows.length > MAX_ROWS;
        return {
          columns,
          rows: rows.slice(0, MAX_ROWS).map((row) => Array.isArray(row) ? row.map((v) => (v === undefined ? null : v)) : []),
          truncated,
        };
      } catch (e) {
        return { error: String((e && e.message) || e) };
      }
    }

    async reset() {
      await this._seed();
      return this;
    }

    schemaDoc() {
      return `Runtime: PostgreSQL (PGlite / WASM)\nDialect: PostgreSQL\n\n${commonSchemaDoc()}`;
    }

    async snapshot() {
      if (!this.db) return null;
      const tables = await this.db.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
      return { engine: "postgres", tables: tables.rows || [] };
    }

    async destroy() {
      if (this.db && typeof this.db.close === "function") await this.db.close();
      this.db = null;
      this._ready = false;
    }
  }

  ns.PGliteEngine = PGliteEngine;
  ns.runtime.register("postgres", () => new PGliteEngine(), {
    label: "PostgreSQL",
    technology: "PGlite / WASM",
    dialect: "postgresql",
    description: "Реальный PostgreSQL в браузере",
    networkRequired: false,
    capabilities: ["sql", "ddl", "dml", "schema", "postgresql"],
  });
})();
