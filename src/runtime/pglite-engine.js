// PostgreSQL adapter powered by PGlite (real Postgres compiled to WASM).
// PGlite runtime is copied into vendor/pglite during prepare-public and loaded lazily.
import { LabEngine, SCHEMA_DOC, quoteIdent } from "./lab-engine.js";
import { DATASET } from "../data/dataset.js";

const MAX_ROWS = 500;

export class PGliteEngine extends LabEngine {
  constructor() {
    super({
      id: "postgres",
      label: "PostgreSQL",
      technology: "PGlite / WASM",
      dialect: "postgresql",
      description: "Настоящий PostgreSQL, работающий локально в браузере через PGlite.",
      networkRequired: false,
      capabilities: ["sql", "ddl", "dml", "schema", "schema-introspection", "postgresql", "benchmark"],
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
      mod = await import(/* @vite-ignore */ moduleUrl);
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
    await this.db.exec(DATASET.schema);

    for (const [table, def] of Object.entries(DATASET.tables)) {
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

  async inspectSchema() {
    if (!this.ready || !this.db) return { engine: "postgres", tables: [] };

    // PGlite is a single local Postgres runtime, so introspection queries are
    // intentionally serialized instead of pretending to use parallel DB sessions.
    const tableResult = await this.db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const columnResult = await this.db.query(`
      SELECT table_name, column_name, data_type, udt_name, is_nullable,
             column_default, ordinal_position, is_identity
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
    const pkResult = await this.db.query(`
      SELECT tc.table_name, kcu.column_name, kcu.ordinal_position
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY tc.table_name, kcu.ordinal_position
    `);
    const fkResult = await this.db.query(`
      SELECT tc.table_name,
             kcu.column_name,
             ccu.table_name AS foreign_table_name,
             ccu.column_name AS foreign_column_name,
             rc.update_rule,
             rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.constraint_schema = kcu.constraint_schema
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
       AND tc.constraint_schema = rc.constraint_schema
      JOIN information_schema.constraint_column_usage ccu
        ON rc.unique_constraint_name = ccu.constraint_name
       AND rc.unique_constraint_schema = ccu.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.ordinal_position
    `);
    const indexResult = await this.db.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    const tableNames = (tableResult.rows || []).map((row) => String(row.table_name));
    const tables = tableNames.map((name) => {
      const primaryKey = (pkResult.rows || [])
        .filter((row) => row.table_name === name)
        .map((row) => String(row.column_name));

      const columns = (columnResult.rows || [])
        .filter((row) => row.table_name === name)
        .map((row) => ({
          name: String(row.column_name),
          type: String(row.data_type === "USER-DEFINED" ? row.udt_name : row.data_type),
          nullable: row.is_nullable === "YES",
          primaryKey: primaryKey.includes(String(row.column_name)),
          default: row.column_default == null ? null : String(row.column_default),
          identity: row.is_identity === "YES",
          position: Number(row.ordinal_position || 0),
        }));

      const foreignKeys = (fkResult.rows || [])
        .filter((row) => row.table_name === name)
        .map((row) => ({
          column: String(row.column_name),
          refTable: String(row.foreign_table_name),
          refColumn: String(row.foreign_column_name),
          onUpdate: String(row.update_rule || ""),
          onDelete: String(row.delete_rule || ""),
        }));

      const indexes = (indexResult.rows || [])
        .filter((row) => row.tablename === name)
        .map((row) => {
          const definition = String(row.indexdef || "");
          const match = definition.match(/\((.*)\)\s*$/);
          return {
            name: String(row.indexname),
            unique: /\bCREATE\s+UNIQUE\s+INDEX\b/i.test(definition),
            columns: match
              ? match[1].split(",").map((column) => column.trim().replace(/^"|"$/g, ""))
              : [],
            definition,
          };
        });

      return { name, columns, primaryKey, foreignKeys, indexes };
    });

    return { engine: "postgres", dialect: "postgresql", tables };
  }

  schemaDoc() {
    return `Runtime: PostgreSQL (PGlite / WASM)\nDialect: PostgreSQL\n\n${SCHEMA_DOC}`;
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
