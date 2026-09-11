// Реестр и диспетчер лабораторных движков IT Study Lab.
export class LabRuntime {
  constructor() {
    this.registry = new Map();
    this.instances = new Map();
    this.active = null;
    this.activeId = null;
    this.listeners = new Set();
    this.eventListeners = new Set();
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

  onEvent(listener) {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  _emit() {
    const payload = { id: this.activeId, engine: this.active, meta: this.getMeta() };
    this.listeners.forEach((listener) => {
      try { listener(payload); }
      catch (err) { console.error("IT Study Lab runtime listener failed", err); }
    });
  }

  _emitEvent(type, detail = {}) {
    const payload = {
      type,
      engineId: this.activeId,
      engine: this.active,
      ...detail,
    };
    this.eventListeners.forEach((listener) => {
      try { listener(payload); }
      catch (err) { console.error("IT Study Lab runtime event listener failed", err); }
    });
  }

  async createIsolated(id, options = {}) {
    const item = this.registry.get(id);
    if (!item) throw new Error(`Unknown lab engine: ${id}`);
    const engine = item.factory();
    await engine.init(options);
    return engine;
  }

  async use(id, options = {}) {
    const item = this.registry.get(id);
    if (!item) throw new Error(`Unknown lab engine: ${id}`);
    let engine = this.instances.get(id);
    if (!engine) {
      engine = item.factory();
      this.instances.set(id, engine);
    }
    if (!engine.ready) await engine.init(options);
    this.active = engine;
    this.activeId = id;
    this._emit();
    this._emitEvent("use", { options });
    return engine;
  }

  async execute(command, options = {}) {
    if (!this.active) throw new Error("No active lab engine");
    const result = await this.active.execute(command, options);
    this._emitEvent("execute", { command, result, options });
    return result;
  }

  async reset(options = {}) {
    if (!this.active) throw new Error("No active lab engine");
    const result = await this.active.reset(options);
    this._emitEvent("reset", { options });
    return result;
  }

  async inspectSchema() {
    if (!this.active) return { engine: null, tables: [] };
    if (typeof this.active.inspectSchema !== "function") {
      return { engine: this.activeId, tables: [] };
    }
    return this.active.inspectSchema();
  }

  schemaDoc() { return this.active ? this.active.schemaDoc() : ""; }
  ready() { return !!(this.active && this.active.ready); }
}
