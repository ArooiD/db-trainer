// Базовый контракт исполняемой лабораторной среды IT Study Lab.
export class LabEngine {
  constructor(meta = {}) {
    this.meta = {
      id: meta.id || "unknown",
      label: meta.label || meta.id || "Unknown engine",
      technology: meta.technology || "",
      dialect: meta.dialect || "",
      description: meta.description || "",
      networkRequired: !!meta.networkRequired,
      capabilities: Array.isArray(meta.capabilities) ? meta.capabilities : [],
    };
    this._ready = false;
  }

  get id() { return this.meta.id; }
  get ready() { return this._ready; }

  async init() { throw new Error(`${this.constructor.name}.init() is not implemented`); }
  async execute(_command, _options = {}) { throw new Error(`${this.constructor.name}.execute() is not implemented`); }
  async reset(_options = {}) { throw new Error(`${this.constructor.name}.reset() is not implemented`); }
  schemaDoc() { return ""; }

  // Structured introspection is used by the Database Inspector and live ERD.
  async inspectSchema() {
    return { engine: this.id, tables: [] };
  }

  async snapshot() { return null; }

  async metrics() {
    return {
      engine: this.id,
      ready: this.ready,
      technology: this.meta.technology,
    };
  }

  async destroy() { this._ready = false; }
}

export const SCHEMA_DOC = [
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

export function quoteIdent(value) {
  return '"' + String(value).replace(/"/g, '""') + '"';
}
