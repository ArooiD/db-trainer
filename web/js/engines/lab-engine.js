// Базовый контракт исполняемой лабораторной среды IT Study Lab.
(function () {
  const ns = (window.ITStudyLab = window.ITStudyLab || {});

  class LabEngine {
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
    // Engines that expose a database-like schema should return:
    // { engine, tables: [{ name, columns, primaryKey, foreignKeys, indexes }] }
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

  ns.LabEngine = LabEngine;
})();
