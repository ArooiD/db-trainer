// Реестр и диспетчер лабораторных движков IT Study Lab.
// Поддерживает несколько параллельных подключений: каждое подключение — это
// отдельный экземпляр движка со своей БД. «Активным» считается выбранное
// подключение; execute/reset/inspectSchema/snapshot работают именно с ним.
export class LabRuntime {
  constructor() {
    this.registry = new Map();
    this.connections = [];
    this.active = null;
    this.activeId = null;
    this.activeConnId = null;
    this.connSeq = 0;
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
    const payload = { id: this.activeId, connectionId: this.activeConnId, engine: this.active, meta: this.getMeta() };
    this.listeners.forEach((listener) => {
      try { listener(payload); }
      catch (err) { console.error("IT Study Lab runtime listener failed", err); }
    });
  }

  _emitEvent(type, detail = {}) {
    const payload = {
      type,
      engineId: this.activeId,
      connectionId: this.activeConnId,
      engine: this.active,
      ...detail,
    };
    this.eventListeners.forEach((listener) => {
      try { listener(payload); }
      catch (err) { console.error("IT Study Lab runtime event listener failed", err); }
    });
  }

  // --- connections -----------------------------------------------------------
  getConnections() {
    return this.connections.map((conn) => ({ id: conn.id, engineId: conn.engineId, label: conn.label, meta: conn.meta }));
  }

  _findConn(connId) {
    return this.connections.find((conn) => conn.id === connId) || null;
  }

  _activate(conn) {
    this.active = conn.engine;
    this.activeId = conn.engineId;
    this.activeConnId = conn.id;
    this._emit();
    this._emitEvent("use", { connectionId: conn.id });
  }

  async openConnection(engineId, { label } = {}) {
    const item = this.registry.get(engineId);
    if (!item) throw new Error(`Unknown lab engine: ${engineId}`);
    const engine = item.factory();
    await engine.init();
    this.connSeq += 1;
    const conn = {
      id: `conn-${this.connSeq}`,
      engineId,
      label: label || item.meta.label,
      meta: { id: item.id, ...item.meta },
      engine,
    };
    this.connections.push(conn);
    this._activate(conn);
    this._emitEvent("connection-open", { engineId });
    return conn;
  }

  switchConnection(connId) {
    const conn = this._findConn(connId);
    if (conn) this._activate(conn);
    return conn;
  }

  async closeConnection(connId) {
    const index = this.connections.findIndex((conn) => conn.id === connId);
    if (index === -1) return;
    const [conn] = this.connections.splice(index, 1);
    if (typeof conn.engine?.destroy === "function") {
      try { await conn.engine.destroy(); } catch (err) { console.warn("Engine destroy failed", err); }
    }
    if (this.activeConnId === connId) {
      const next = this.connections[this.connections.length - 1] || null;
      if (next) this._activate(next);
      else {
        this.active = null;
        this.activeId = null;
        this.activeConnId = null;
        this._emit();
      }
    }
    this._emitEvent("connection-close", { connectionId: connId });
  }

  renameConnection(connId, label) {
    const conn = this._findConn(connId);
    if (conn) conn.label = String(label || conn.label).trim() || conn.label;
    return conn;
  }

  // Backward-compatible helper: reuse an existing connection of this engine or open a new one.
  async use(id, options = {}) {
    const existing = this.connections.find((conn) => conn.engineId === id);
    if (existing) {
      this._activate(existing);
      return existing.engine;
    }
    const conn = await this.openConnection(id, options);
    return conn.engine;
  }

  async createIsolated(id, options = {}) {
    const item = this.registry.get(id);
    if (!item) throw new Error(`Unknown lab engine: ${id}`);
    const engine = item.factory();
    await engine.init(options);
    return engine;
  }

  async execute(command, options = {}) {
    if (!this.active) throw new Error("No active lab engine");
    const result = await this.active.execute(command, options);
    this._emitEvent("execute", { command, result, options });
    return result;
  }

  // Execute against a specific connection without changing the active one.
  async executeIn(connId, command, options = {}) {
    const conn = this._findConn(connId);
    if (!conn) throw new Error(`Unknown connection: ${connId}`);
    return conn.engine.execute(command, options);
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

  async inspectSchemaIn(connId) {
    const conn = this._findConn(connId);
    if (!conn || typeof conn.engine?.inspectSchema !== "function") return { engine: conn?.engineId || null, tables: [] };
    return conn.engine.inspectSchema();
  }

  schemaDoc() { return this.active ? this.active.schemaDoc() : ""; }
  ready() { return !!(this.active && this.active.ready); }
}
