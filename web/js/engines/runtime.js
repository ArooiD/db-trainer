// Реестр и диспетчер лабораторных движков IT Study Lab.
(function () {
  const ns = (window.ITStudyLab = window.ITStudyLab || {});

  class LabRuntime {
    constructor() {
      this.registry = new Map();
      this.instances = new Map();
      this.active = null;
      this.activeId = null;
      this.listeners = new Set();
    }

    register(id, factory, meta = {}) {
      if (!id || typeof factory !== "function") throw new Error("Engine registration requires id and factory");
      this.registry.set(id, { id, factory, meta: { id, ...meta } });
      return this;
    }

    list() {
      return [...this.registry.values()].map(({ id, meta }) => ({ id, ...meta }));
    }

    getMeta(id = this.activeId) {
      const item = this.registry.get(id);
      return item ? { id: item.id, ...item.meta } : null;
    }

    onChange(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    _emit() {
      const payload = { id: this.activeId, engine: this.active, meta: this.getMeta() };
      this.listeners.forEach((listener) => {
        try { listener(payload); }
        catch (err) { console.error("IT Study Lab runtime listener failed", err); }
      });
    }

    async use(id) {
      const item = this.registry.get(id);
      if (!item) throw new Error(`Unknown lab engine: ${id}`);
      let engine = this.instances.get(id);
      if (!engine) {
        engine = item.factory();
        this.instances.set(id, engine);
      }
      if (!engine.ready) await engine.init();
      this.active = engine;
      this.activeId = id;
      this._emit();
      return engine;
    }

    async execute(command) {
      if (!this.active) throw new Error("No active lab engine");
      return this.active.execute(command);
    }

    async reset() {
      if (!this.active) throw new Error("No active lab engine");
      return this.active.reset();
    }

    schemaDoc() { return this.active ? this.active.schemaDoc() : ""; }
    ready() { return !!(this.active && this.active.ready); }
  }

  ns.LabRuntime = LabRuntime;
  ns.runtime = ns.runtime || new LabRuntime();
})();
