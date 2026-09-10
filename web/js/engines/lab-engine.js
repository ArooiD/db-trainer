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
    async execute(_command) { throw new Error(`${this.constructor.name}.execute() is not implemented`); }
    async reset() { throw new Error(`${this.constructor.name}.reset() is not implemented`); }
    schemaDoc() { return ""; }
    async snapshot() { return null; }
    async destroy() { this._ready = false; }
  }

  ns.LabEngine = LabEngine;
})();
