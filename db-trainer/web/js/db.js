// Инициализация SQLite в браузере через sql.js (WASM) и функции выполнения SQL.
// Бинарник WASM встроен base64 (vendor/sql-binary.js), поэтому работает и по
// file://, и из подпапок: никаких fetch на внешний файл не требуется.

(function () {
  const MAX_ROWS = 500;
  let db = null;

  function base64ToBytes(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function init() {
    const SQL = await initSqlJs({ wasmBinary: base64ToBytes(window.SQL_WASM_B64) });
    db = new SQL.Database();
    db.run(window.DB_DATA.schema);
    for (const [table, def] of Object.entries(window.DB_DATA.tables)) {
      const ph = def.columns.map(() => "?").join(",");
      const stmt = db.prepare(`INSERT INTO ${table} VALUES (${ph})`);
      for (const row of def.rows) stmt.run(row);
      stmt.free();
    }
  }

  function executeSQL(sql) {
    if (!db) return { error: "База данных ещё не готова." };
    try {
      const res = db.exec(sql);
      if (!res.length) return { columns: [], rows: [], truncated: false };
      const { columns, values } = res[res.length - 1];
      const truncated = values.length > MAX_ROWS;
      const rows = values
        .slice(0, MAX_ROWS)
        .map((r) => r.map((v) => (v === undefined ? null : v)));
      return { columns, rows, truncated };
    } catch (e) {
      return { error: String((e && e.message) || e) };
    }
  }

  function schemaDoc() {
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

  window.DB = { init, executeSQL, schemaDoc, ready: () => !!db };
})();
