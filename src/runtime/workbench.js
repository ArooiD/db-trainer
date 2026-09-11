// Universal interactive session used by Sandbox views.
const STORAGE_KEY = "it-study-lab.workbench.history";
const HISTORY_LIMIT = 100;

export class WorkbenchSession {
  constructor(runtime) {
    this.runtime = runtime;
    this.memoryHistory = this._load();
  }

  _load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memoryHistory));
    } catch {
      // History is optional and must never block the runtime.
    }
  }

  history(sessionKey = this.runtime.activeConnId) {
    if (!sessionKey) return [];
    return [...(this.memoryHistory[sessionKey] || [])];
  }

  clearHistory(sessionKey = this.runtime.activeConnId) {
    if (!sessionKey) return;
    this.memoryHistory[sessionKey] = [];
    this._save();
  }

  async run(command, options = {}) {
    if (!this.runtime.active) throw new Error("No active runtime");
    const engineId = this.runtime.activeConnId;
    const started = performance.now();
    const result = await this.runtime.execute(command, options);
    const durationMs = Math.max(0, Math.round(performance.now() - started));

    // Persist only serializable execution metadata. Runtime values can contain
    // BigInt/blobs and should not be pushed into localStorage.
    const persisted = {
      command,
      engineId,
      createdAt: new Date().toISOString(),
      durationMs,
      error: result && result.error ? String(result.error) : "",
      rowCount: result && Array.isArray(result.rows) ? result.rows.length : 0,
    };
    const history = this.memoryHistory[engineId] || [];
    history.unshift(persisted);
    this.memoryHistory[engineId] = history.slice(0, HISTORY_LIMIT);
    this._save();

    return { ...persisted, result };
  }

  async reset(options = {}) {
    return this.runtime.reset(options);
  }

  async snapshot() {
    if (!this.runtime.active) return null;
    return this.runtime.active.snapshot();
  }

  async metrics() {
    if (!this.runtime.active) return null;
    if (typeof this.runtime.active.metrics === "function") {
      return this.runtime.active.metrics();
    }
    return {
      engine: this.runtime.activeId,
      ready: this.runtime.ready(),
    };
  }
}
