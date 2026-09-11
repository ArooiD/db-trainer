// SQLite/sql.js adapter for IT Study Lab.
import initSqlJs from "sql.js/dist/sql-wasm.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { LabEngine, SCHEMA_DOC, quoteIdent } from "./lab-engine.js";
import { DATASET } from "../data/dataset.js";

const MAX_ROWS = 500;

export class SqliteEngine extends LabEngine {
  constructor() {
    super({
      id: "sqlite",
      label: "SQLite",
      technology: "sql.js / WASM",
      dialect: "sqlite",
      description: "Лёгкая полностью локальная SQL-среда, работающая офлайн.",
      networkRequired: false,
      capabilities: ["sql", "ddl", "dml", "schema", "schema-introspection", "snapshot", "benchmark"],
    });
    this.db = null;
    this.SQL = null;
  }

  async init() {
    if (this.ready) return this;
    this.SQL = await initSqlJs({ locateFile: () => wasmUrl });
    await this._seed();
    this._ready = true;
    return this;
  }

  async _seed() {
    if (this.db) this.db.close();
    this.db = new this.SQL.Database();
    this.db.run(DATASET.schema);
    for (const [table, def] of Object.entries(DATASET.tables)) {
      const ph = def.columns.map(() => "?").join(",");
      const stmt = this.db.prepare(`INSERT INTO ${quoteIdent(table)} VALUES (${ph})`);
      for (const row of def.rows) stmt.run(row);
      stmt.free();
    }
  }

  _rows(sql) {
    const res = this.db.exec(sql);
    if (!res.length) return [];
    const { columns, values } = res[0];
    return values.map((row) => Object.fromEntries(columns.map((name, index) => [name, row[index]])));
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

  async inspectSchema() {
    if (!this.ready || !this.db) return { engine: "sqlite", tables: [] };

    const tableRows = this._rows(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    const tables = [];

    for (const tableRow of tableRows) {
      const tableName = String(tableRow.name);
      const q = quoteIdent(tableName);
      const columnRows = this._rows(`PRAGMA table_info(${q})`);
      const fkRows = this._rows(`PRAGMA foreign_key_list(${q})`);
      const indexRows = this._rows(`PRAGMA index_list(${q})`);

      const columns = columnRows.map((row) => ({
        name: String(row.name),
        type: String(row.type || ""),
        nullable: !(Number(row.notnull) || Number(row.pk)),
        primaryKey: !!Number(row.pk),
        default: row.dflt_value == null ? null : String(row.dflt_value),
        position: Number(row.cid || 0) + 1,
      }));

      const indexes = [];
      for (const row of indexRows) {
        const indexName = String(row.name);
        const indexColumns = this._rows(`PRAGMA index_info(${quoteIdent(indexName)})`)
          .sort((a, b) => Number(a.seqno) - Number(b.seqno))
          .map((item) => String(item.name));
        indexes.push({
          name: indexName,
          unique: !!Number(row.unique),
          columns: indexColumns,
          definition: "",
        });
      }

      const foreignKeys = fkRows.map((row) => ({
        column: String(row.from),
        refTable: String(row.table),
        refColumn: String(row.to || "id"),
        onUpdate: String(row.on_update || ""),
        onDelete: String(row.on_delete || ""),
      }));

      tables.push({
        name: tableName,
        columns,
        primaryKey: columns.filter((column) => column.primaryKey).map((column) => column.name),
        foreignKeys,
        indexes,
      });
    }

    return { engine: "sqlite", dialect: "sqlite", tables };
  }

  schemaDoc() {
    return `Runtime: SQLite (sql.js / WASM)\nDialect: SQLite\n\n${SCHEMA_DOC}`;
  }

  async snapshot() { return this.db ? this.db.export() : null; }

  async destroy() {
    if (this.db) this.db.close();
    this.db = null;
    this._ready = false;
  }
}
