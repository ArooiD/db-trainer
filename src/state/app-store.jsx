import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { TASKS } from "../data/tasks.js";
import { COURSES } from "../data/courses.js";
import { LabRuntime } from "../runtime/runtime.js";
import { SqliteEngine } from "../runtime/sqlite-engine.js";
import { PGliteEngine } from "../runtime/pglite-engine.js";
import { WorkbenchSession } from "../runtime/workbench.js";

export const LEVEL_NAMES = {
  1: "1. Основы SELECT",
  2: "2. Фильтрация WHERE",
  3: "3. Сортировка и лимиты",
  4: "4. Агрегаты и GROUP BY",
  5: "5. JOIN нескольких таблиц",
  6: "6. Подзапросы",
  7: "7. CASE и условия",
};

const STORE_DONE = "it-study-lab.databases.done";
const STORE_DRAFTS = "it-study-lab.databases.drafts";
const STORE_RUNTIMES = "it-study-lab.runtimes.enabled";
const DRAFT_PREFIX = "it-study-lab.workbench.draft.";
const LAB_COURSE = { database: "databases", programming: "programming" };
const COURSE_LAB = { databases: "database", programming: "programming" };

const runtime = new LabRuntime();
runtime.register("sqlite", () => new SqliteEngine(), {
  label: "SQLite",
  technology: "sql.js / WASM",
  dialect: "sqlite",
  description: "Полностью локально и офлайн",
  networkRequired: false,
  capabilities: ["sql", "ddl", "dml", "schema", "schema-introspection", "snapshot", "benchmark"],
});
runtime.register("postgres", () => new PGliteEngine(), {
  label: "PostgreSQL",
  technology: "PGlite / WASM",
  dialect: "postgresql",
  description: "Реальный PostgreSQL в браузере",
  networkRequired: false,
  capabilities: ["sql", "ddl", "dml", "schema", "schema-introspection", "postgresql", "benchmark"],
});
const workbench = new WorkbenchSession(runtime);

export { runtime, workbench };

export function loadSet(key) {
  try {
    const current = localStorage.getItem(key);
    const legacy = key === STORE_DONE ? localStorage.getItem("sqltr.done") : null;
    return new Set(JSON.parse(current || legacy || "[]"));
  } catch {
    return new Set();
  }
}

export function normalizeCell(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    return Math.abs(value - Math.round(value)) < 1e-9
      ? String(Math.round(value))
      : (Math.round(value * 1e6) / 1e6).toString();
  }
  return String(value);
}

function rowKey(row) {
  return row.map(normalizeCell).join("\u0001");
}

export function resultsMatch(a, b, ordered) {
  if (!a || !b) return false;
  const ra = a.rows || [];
  const rb = b.rows || [];
  if (ra.length !== rb.length) return false;
  if (ordered) return ra.every((row, index) => rowKey(row) === rowKey(rb[index]));

  const expected = {};
  rb.forEach((row) => {
    const key = rowKey(row);
    expected[key] = (expected[key] || 0) + 1;
  });
  for (const row of ra) {
    const key = rowKey(row);
    if (!expected[key]) return false;
    expected[key] -= 1;
  }
  return true;
}

function loadDrafts() {
  try {
    return JSON.parse(
      localStorage.getItem(STORE_DRAFTS) ||
      localStorage.getItem("sqltr.drafts") ||
      "{}"
    );
  } catch {
    return {};
  }
}

const DEFAULT_DRAFT = {
  postgres: "SELECT version();\n\nSELECT * FROM employees LIMIT 5;",
  sqlite: "SELECT sqlite_version();\n\nSELECT * FROM employees LIMIT 5;",
};

function qIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return `'${value.toISOString()}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

function initialLocation() {
  const params = new URL(location.href).searchParams;
  const state = { mode: "sandbox", lab: "database", course: COURSES[0]?.id || "", lecture: "", task: "" };

  const mode = params.get("mode");
  if (["sandbox", "tests", "lectures"].includes(mode)) state.mode = mode;

  // Единая навигация: primary axis — курс. `lab` всегда выводится из курса.
  let course = params.get("course");
  // обратная совместимость со старыми ссылками ?lab=…
  if (!course) {
    const legacyLab = params.get("lab");
    if (legacyLab && LAB_COURSE[legacyLab]) course = LAB_COURSE[legacyLab];
  }
  if (course && COURSES.some((item) => item.id === course)) {
    state.course = course;
    state.lab = COURSE_LAB[course] || "";
    const lecture = params.get("lecture");
    const courseObj = COURSES.find((item) => item.id === course);
    if (lecture && courseObj.lectures.some((item) => item.id === lecture)) state.lecture = lecture;
    else state.lecture = courseObj.lectures[0]?.id || "";
  }

  const task = params.get("task");
  if (task && TASKS.some((item) => item.id === task)) state.task = task;

  return state;
}

const AppContext = createContext(null);

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}

export function AppProvider({ children }) {
  const [nav, setNav] = useState(initialLocation);
  const [engineId, setEngineId] = useState("sqlite");
  const [engineStatus, setEngineStatus] = useState({ text: "инициализация…", state: "" });
  const [engineBusy, setEngineBusy] = useState(false);
  const [sandbox, setSandbox] = useState(() => ({
    draft: "",
    result: null,
    resultEmpty: "Среда запускается…",
    feedback: { text: "", state: "" },
    tabTitle: "SQL Result",
    tabIsTable: false,
    history: [],
    running: false,
  }));
  const sandboxRef = useRef(sandbox);
  sandboxRef.current = sandbox;

  const [tests, setTests] = useState(() => ({
    solved: loadSet(STORE_DONE),
    currentTaskId: null,
    draft: "",
    feedback: null,
    userResult: null,
    expectedResult: null,
    hint: "",
    solution: "",
    running: false,
  }));

  const [modalContent, setModalContent] = useState(null);
  const [designer, setDesigner] = useState({ open: false, task: null });

  // --- URL sync -------------------------------------------------------------
  useEffect(() => {
    const url = new URL(location.href);
    if (nav.mode === "sandbox") url.searchParams.delete("mode");
    else url.searchParams.set("mode", nav.mode);
    url.searchParams.delete("lab");
    url.searchParams.delete("course");
    url.searchParams.delete("lecture");
    url.searchParams.delete("task");

    // курс — общая ось, кодируется во всех режимах (кроме курса по умолчанию)
    if (nav.course && nav.course !== "databases") url.searchParams.set("course", nav.course);
    if (nav.mode === "lectures" && nav.lecture) url.searchParams.set("lecture", nav.lecture);
    if (nav.mode === "tests" && nav.task) url.searchParams.set("task", nav.task);
    history.replaceState(null, "", url);
  }, [nav]);

  // --- navigation -----------------------------------------------------------
  const setMode = useCallback((mode) => {
    setNav((prev) => {
      const next = { ...prev, mode: ["sandbox", "tests", "lectures"].includes(mode) ? mode : "sandbox" };
      if (next.mode === "tests" && !next.task) next.task = TASKS[0]?.id || "";
      if (next.mode === "lectures" && !COURSES.some((c) => c.id === next.course)) {
        next.course = COURSES[0]?.id || "";
        next.lecture = COURSES[0]?.lectures?.[0]?.id || "";
      }
      return next;
    });
  }, []);

  const selectLecture = useCallback((courseId, lectureId) => {
    setNav((prev) => ({ ...prev, course: courseId, lecture: lectureId }));
  }, []);

  const selectTask = useCallback((taskId) => {
    const task = TASKS.find((item) => item.id === taskId);
    if (!task) return;
    setNav((prev) => ({ ...prev, task: task.id }));
    setTests((prev) => ({
      ...prev,
      currentTaskId: task.id,
      draft: loadDrafts()[task.id] || "",
      feedback: null,
      userResult: null,
      expectedResult: null,
      hint: "",
      solution: "",
    }));
  }, []);

  const selectCourse = useCallback((courseId) => {
    const course = COURSES.find((item) => item.id === courseId);
    if (!course) return;
    setNav((prev) => {
      const next = { ...prev, course: course.id };
      if (prev.course !== course.id) next.lecture = course.lectures[0]?.id || "";
      next.lab = COURSE_LAB[course.id] || "";
      return next;
    });
  }, []);

  const openLab = useCallback((lab) => {
    setNav((prev) => {
      const next = { ...prev, lab: lab === "programming" ? "programming" : "database" };
      const course = LAB_COURSE[next.lab];
      if (course && course !== prev.course) {
        next.course = course;
        next.lecture = COURSES.find((item) => item.id === course)?.lectures?.[0]?.id || "";
      }
      return next;
    });
  }, []);

  // Rail item: выбранный предмет становится активным во всех режимах.
  // Лекции/Тесты читают nav.course напрямую; Песочница переключает lab на
  // лабораторию курса (пусто для курсов без runtime → placeholder в App).
  // Клик из Лекций/Тестов остаётся в текущем режиме (смена только предмета).
  const openRailItem = useCallback((item) => {
    setNav((prev) => {
      const course = COURSES.find((entry) => entry.id === item.course);
      if (!course) return prev;
      const next = { ...prev, course: course.id };
      if (prev.course !== course.id) next.lecture = course.lectures[0]?.id || "";
      next.lab = COURSE_LAB[course.id] || "";
      return next;
    });
  }, []);

  // --- runtime settings (gear) + parallel connections ------------------------
  const [enabledRuntimes, setEnabledRuntimes] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_RUNTIMES) || "null");
      if (Array.isArray(raw) && raw.length) return raw.filter((id) => runtime.registry.has(id));
    } catch { /* ignore */ }
    return runtime.list().map((item) => item.id);
  });
  const [connections, setConnections] = useState(() => runtime.getConnections());
  const [activeConnId, setActiveConnId] = useState(() => runtime.activeConnId);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [artifactsOpen, setArtifactsOpen] = useState(() => {
    try { return localStorage.getItem("it-study-lab.artifacts-dock") !== "off"; }
    catch { return true; }
  });
  const toggleArtifacts = useCallback(() => {
    setArtifactsOpen((open) => {
      const next = !open;
      try { localStorage.setItem("it-study-lab.artifacts-dock", next ? "on" : "off"); } catch { /* ignore */ }
      return next;
    });
  }, []);
  const [transfer, setTransfer] = useState({ open: false, result: null, busy: false, error: "" });
  const sessionsRef = useRef(new Map());

  const syncConnections = useCallback(() => {
    setConnections(runtime.getConnections());
    setActiveConnId(runtime.activeConnId);
    setEngineId(runtime.activeId);
  }, []);

  const persistEnabledRuntimes = useCallback((ids) => {
    try { localStorage.setItem(STORE_RUNTIMES, JSON.stringify(ids)); } catch { /* ignore */ }
  }, []);

  // Save the current active session so switching back restores draft/result/history.
  const stashActiveSession = useCallback(() => {
    const connId = runtime.activeConnId;
    if (!connId) return;
    sessionsRef.current.set(connId, sandboxRef.current);
  }, []);

  const applySession = useCallback((session, connId) => {
    setSandbox(session);
    setActiveConnId(connId);
    setEngineId(runtime.activeId);
  }, []);

  const freshSession = useCallback(() => ({
    draft: DEFAULT_DRAFT[runtime.activeId] || DEFAULT_DRAFT.sqlite,
    result: null,
    resultEmpty: "Среда готова. Выполните команду.",
    feedback: { text: "", state: "" },
    tabTitle: "SQL Result",
    tabIsTable: false,
    history: workbench.history(),
    running: false,
  }), []);

  const loadStoredDraft = useCallback((connId, engineId) => {
    try {
      return localStorage.getItem(`${DRAFT_PREFIX}${connId}`) || DEFAULT_DRAFT[engineId] || DEFAULT_DRAFT.sqlite;
    } catch {
      return DEFAULT_DRAFT[engineId] || DEFAULT_DRAFT.sqlite;
    }
  }, []);

  const setDraft = useCallback((value) => {
    setSandbox((prev) => {
      const next = { ...prev, draft: value };
      try { localStorage.setItem(`${DRAFT_PREFIX}${runtime.activeConnId}`, value); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const openConnection = useCallback(async (engineId, { label } = {}) => {
    setEngineBusy(true);
    setEngineStatus({ text: "загрузка…", state: "loading" });
    try {
      stashActiveSession();
      const meta = runtime.getMeta(engineId);
      const existing = runtime.getConnections().filter((c) => c.engineId === engineId).length;
      const autoLabel = existing === 0 ? meta.label : `${meta.label} · ${existing + 1}`;
      const conn = await runtime.openConnection(engineId, { label: label || autoLabel });
      syncConnections();
      setEngineStatus({ text: `${meta.label} готов`, state: "ready" });
      applySession(freshSession(), conn.id);
      return conn;
    } catch (err) {
      setEngineStatus({ text: "ошибка запуска", state: "error" });
      setSandbox((prev) => ({ ...prev, feedback: { text: `Не удалось запустить runtime: ${(err && err.message) || err}`, state: "bad" } }));
      throw err;
    } finally {
      setEngineBusy(false);
    }
  }, [applySession, freshSession, stashActiveSession, syncConnections]);

  const switchConnection = useCallback((connId) => {
    if (connId === runtime.activeConnId) return;
    stashActiveSession();
    const conn = runtime.switchConnection(connId);
    if (!conn) return;
    syncConnections();
    const saved = sessionsRef.current.get(connId);
    const draft = loadStoredDraft(connId, conn.engineId);
    applySession(saved ? { ...saved, draft } : { ...freshSession(), draft }, connId);
  }, [applySession, freshSession, loadStoredDraft, stashActiveSession, syncConnections]);

  const closeConnection = useCallback(async (connId) => {
    setEngineBusy(true);
    try {
      sessionsRef.current.delete(connId);
      try { localStorage.removeItem(`${DRAFT_PREFIX}${connId}`); } catch { /* ignore */ }
      await runtime.closeConnection(connId);
      syncConnections();
      if (runtime.activeConnId) {
        const active = runtime.getConnections().find((c) => c.id === runtime.activeConnId);
        const saved = sessionsRef.current.get(runtime.activeConnId);
        const draft = loadStoredDraft(runtime.activeConnId, active?.engineId);
        applySession(saved ? { ...saved, draft } : { ...freshSession(), draft }, runtime.activeConnId);
      } else {
        applySession({ ...freshSession(), resultEmpty: "Все подключения закрыты. Откройте новое в ⚙ настройках." }, null);
      }
    } finally {
      setEngineBusy(false);
    }
  }, [applySession, freshSession, loadStoredDraft, syncConnections]);

  const renameConnection = useCallback((connId) => {
    const conn = connections.find((c) => c.id === connId);
    const next = window.prompt("Имя подключения", conn?.label || "");
    if (next === null) return;
    runtime.renameConnection(connId, next);
    setConnections(runtime.getConnections());
  }, [connections]);

  const toggleRuntime = useCallback((engineId, on) => {
    setEnabledRuntimes((prev) => {
      const next = on ? [...new Set([...prev, engineId])] : prev.filter((id) => id !== engineId);
      const safe = next.length ? next : prev;
      persistEnabledRuntimes(safe);
      return safe;
    });
  }, [persistEnabledRuntimes]);

  // Close every connection of an engine (used when a runtime is disabled).
  const closeConnectionsOf = useCallback(async (engineId) => {
    const targets = runtime.getConnections().filter((c) => c.engineId === engineId).map((c) => c.id);
    for (const id of targets) {
      sessionsRef.current.delete(id);
      try { localStorage.removeItem(`${DRAFT_PREFIX}${id}`); } catch { /* ignore */ }
      await runtime.closeConnection(id);
    }
    syncConnections();
    if (runtime.activeConnId) {
      const saved = sessionsRef.current.get(runtime.activeConnId);
      const draft = loadStoredDraft(runtime.activeConnId, runtime.activeId);
      applySession(saved ? { ...saved, draft } : { ...freshSession(), draft }, runtime.activeConnId);
    } else {
      applySession({ ...freshSession(), resultEmpty: "Нет активных подключений." }, null);
    }
  }, [applySession, freshSession, loadStoredDraft, syncConnections]);

  // --- cross-database transfer -------------------------------------------------
  const openTransfer = useCallback((config = {}) => {
    const conns = runtime.getConnections();
    setTransfer({
      open: true,
      busy: false,
      error: "",
      result: null,
      config: {
        sourceConnId: config.sourceConnId || runtime.activeConnId || conns[0]?.id || "",
        sourceSql: config.sourceSql || sandboxRef.current.draft || "",
        targetConnId: config.targetConnId || conns.find((c) => c.id !== runtime.activeConnId)?.id || "",
        targetTable: config.targetTable || "",
        mode: config.mode || "create",
      },
    });
  }, []);

  const closeTransfer = useCallback(() => setTransfer((prev) => ({ ...prev, open: false })), []);

  const setTransferConfig = useCallback((patch) => {
    setTransfer((prev) => ({ ...prev, config: { ...prev.config, ...patch }, error: "" }));
  }, []);

  const runTransfer = useCallback(async () => {
    const cfg = transfer.config || {};
    const source = runtime.getConnections().find((c) => c.id === cfg.sourceConnId);
    const target = runtime.getConnections().find((c) => c.id === cfg.targetConnId);
    if (!source || !target) {
      setTransfer((prev) => ({ ...prev, error: "Выберите исходное и целевое подключения." }));
      return;
    }
    if (cfg.sourceConnId === cfg.targetConnId) {
      setTransfer((prev) => ({ ...prev, error: "Источник и приёмник должны быть разными подключениями." }));
      return;
    }
    if (!String(cfg.sourceSql || "").trim()) {
      setTransfer((prev) => ({ ...prev, error: "Введите SELECT-запрос источника." }));
      return;
    }
    const table = String(cfg.targetTable || "").trim();
    if (!table) {
      setTransfer((prev) => ({ ...prev, error: "Укажите имя таблицы-приёмника." }));
      return;
    }

    setTransfer((prev) => ({ ...prev, busy: true, error: "", result: null }));
    const log = [];
    try {
      // 1. source query
      const selectSql = String(cfg.sourceSql).trim().replace(/;\s*$/, "");
      log.push(`[${source.label}] → ${selectSql.replace(/\s+/g, " ").slice(0, 90)}`);
      const data = await runtime.executeIn(cfg.sourceConnId, selectSql, { internal: true });
      if (data?.error) throw new Error(`Источник: ${data.error}`);
      const columns = (data.columns || []).map(String);
      const rows = data.rows || [];
      log.push(`[${source.label}] ← ${rows.length} строк × ${columns.length} колонок`);
      if (!columns.length || !rows.length) throw new Error("Запрос источника не вернул строк — переносить нечего.");

      const dialect = target.meta?.dialect || target.engineId;
      const inferType = (col) => {
        const sample = rows.map((row) => row[columns.indexOf(col)] ?? row[col]).find((v) => v !== null && v !== undefined);
        if (typeof sample === "number") return Number.isInteger(sample) ? (dialect === "postgresql" ? "INTEGER" : "INTEGER") : "REAL";
        if (typeof sample === "boolean") return dialect === "postgresql" ? "BOOLEAN" : "INTEGER";
        return "TEXT";
      };
      const cellAt = (row, col) => (Array.isArray(row) ? row[columns.indexOf(col)] : row[col]);

      // 2. create target table when needed
      if (cfg.mode === "create") {
        const defs = columns.map((col) => `${qIdent(col)} ${inferType(col)}`).join(", ");
        const createSql = `CREATE TABLE ${qIdent(table)} (${defs});`;
        log.push(`[${target.label}] → CREATE TABLE ${table} (${columns.length} колонок)`);
        const created = await runtime.executeIn(cfg.targetConnId, createSql, { internal: true });
        if (created?.error) throw new Error(`Приёмник: ${created.error}`);
      }

      // 3. insert in batches — this is the "data flowing between databases"
      const columnList = columns.map(qIdent).join(", ");
      const BATCH = 50;
      let inserted = 0;
      for (let start = 0; start < rows.length; start += BATCH) {
        const batch = rows.slice(start, start + BATCH);
        const values = batch.map((row) => `(${columns.map((col) => sqlLiteral(cellAt(row, col))).join(", ")})`).join(",\n");
        const insertSql = `INSERT INTO ${qIdent(table)} (${columnList}) VALUES\n${values};`;
        const res = await runtime.executeIn(cfg.targetConnId, insertSql, { internal: true });
        if (res?.error) throw new Error(`Приёмник, batch ${Math.floor(start / BATCH) + 1}: ${res.error}`);
        inserted += batch.length;
        log.push(`[${source.label}] → [${target.label}] INSERT batch ${Math.floor(start / BATCH) + 1} · ${batch.length} строк`);
        setTransfer((prev) => ({ ...prev, result: { inserted, total: rows.length, log: [...log] } }));
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      log.push(`✓ Перенесено ${inserted} строк: ${source.label} → ${target.label} · таблица ${table}`);
      setTransfer((prev) => ({
        ...prev,
        busy: false,
        result: { inserted, total: rows.length, log: [...log] },
      }));
      // refresh target studio tree if target is the active connection
      if (runtime.activeConnId === cfg.targetConnId) {
        setSandbox((prev) => ({ ...prev, feedback: { text: `Принято ${inserted} строк из «${source.label}»`, state: "ok" } }));
      }
    } catch (err) {
      log.push(`✕ ${err.message}`);
      setTransfer((prev) => ({ ...prev, busy: false, error: err.message, result: { log: [...log] } }));
    }
  }, [transfer.config]);

  // --- sandbox run/reset -------------------------------------------------------
  const runCommand = useCallback(async (command, { tabTitle } = {}) => {
    const trimmed = String(command || "").trim();
    if (!trimmed) {
      setSandbox((prev) => ({ ...prev, feedback: { text: "Введите SQL-команду.", state: "bad" } }));
      return;
    }
    setSandbox((prev) => ({ ...prev, running: true, feedback: { text: "Выполнение…", state: "" } }));
    try {
      const entry = await workbench.run(trimmed);
      setSandbox((prev) => ({
        ...prev,
        result: entry.result,
        resultEmpty: "",
        feedback: entry.result && entry.result.error
          ? { text: `Ошибка · ${entry.durationMs} ms`, state: "bad" }
          : {
            text: `Готово · ${entry.durationMs} ms · ${(entry.result?.rows || []).length} строк`,
            state: "ok",
          },
        ...(tabTitle ? { tabTitle, tabIsTable: true } : {}),
        history: workbench.history(),
        running: false,
      }));
    } finally {
      setSandbox((prev) => (prev.running ? { ...prev, running: false } : prev));
    }
  }, []);

  const runSandbox = useCallback(() => {
    setDraft(sandboxRef.current.draft);
    return runCommand(sandboxRef.current.draft);
  }, [runCommand, setDraft]);

  const resetSandbox = useCallback(async () => {
    if (!window.confirm("Сбросить текущее окружение и восстановить учебную базу?")) return;
    setSandbox((prev) => ({ ...prev, running: true }));
    try {
      await workbench.reset();
      setSandbox((prev) => ({
        ...prev,
        result: null,
        resultEmpty: "Окружение сброшено.",
        feedback: { text: "Runtime восстановлен в исходное состояние.", state: "ok" },
        history: workbench.history(),
        running: false,
      }));
    } finally {
      setSandbox((prev) => (prev.running ? { ...prev, running: false } : prev));
    }
  }, []);

  const clearSandbox = useCallback(() => {
    setSandbox((prev) => ({
      ...prev,
      draft: "",
      result: null,
      resultEmpty: "Новая SQL-консоль. Введите запрос ниже.",
      feedback: { text: "", state: "" },
      tabTitle: "SQL Result",
      tabIsTable: false,
    }));
  }, []);

  const openTable = useCallback((tableName) => {
    const sql = `SELECT *\nFROM "${tableName}"\nLIMIT 100;`;
    setSandbox((prev) => ({ ...prev, draft: sql, tabTitle: tableName, tabIsTable: true }));
    return runCommand(sql, { tabTitle: tableName });
  }, [runCommand]);

  const clearHistory = useCallback(() => {
    workbench.clearHistory();
    setSandbox((prev) => ({ ...prev, history: [] }));
  }, []);

  const showHistoryCommand = useCallback((index) => {
    const item = (sandboxRef.current.history || [])[index];
    if (item) setDraft(item.command);
  }, [setDraft]);

  // --- tests -------------------------------------------------------------------
  const setTestDraft = useCallback((value) => {
    setTests((prev) => {
      const drafts = loadDrafts();
      if (prev.currentTaskId) {
        drafts[prev.currentTaskId] = value;
        localStorage.setItem(STORE_DRAFTS, JSON.stringify(drafts));
      }
      return { ...prev, draft: value };
    });
  }, []);

  const runTest = useCallback(async () => {
    const task = TASKS.find((item) => item.id === nav.task);
    if (!task) return;
    const sql = String(tests.draft || "").trim();
    if (!sql) {
      setTests((prev) => ({ ...prev, feedback: { state: "no", text: "Введите SQL-запрос." } }));
      return;
    }
    setTests((prev) => ({ ...prev, running: true }));
    let testEngine = null;
    try {
      // Tests use a separate temporary engine. Free Sandbox state must survive
      // opening and running knowledge checks.
      testEngine = await runtime.createIsolated(runtime.activeId);
      const userResult = await testEngine.execute(sql);
      await testEngine.reset();
      const expected = await testEngine.execute(task.solution);
      const ok =
        !userResult.error &&
        !expected.error &&
        resultsMatch(userResult, expected, task.ordered !== false);

      setTests((prev) => {
        const solved = new Set(prev.solved);
        if (ok) {
          solved.add(task.id);
          localStorage.setItem(STORE_DONE, JSON.stringify([...solved]));
        }
        let feedback;
        if (ok) feedback = { state: "ok", text: "Верно. Результат совпадает с ожидаемым." };
        else if (userResult.error) feedback = { state: "no", text: `Запрос завершился с ошибкой: ${userResult.error}` };
        else feedback = { state: "no", text: "Результат не совпадает с ожидаемым. Сравните таблицы и попробуйте ещё раз." };
        return { ...prev, solved, userResult, expectedResult: expected, feedback, running: false };
      });
    } catch (err) {
      setTests((prev) => ({
        ...prev,
        feedback: { state: "no", text: `Не удалось запустить тестовое окружение: ${(err && err.message) || err}` },
        running: false,
      }));
    } finally {
      if (testEngine && typeof testEngine.destroy === "function") await testEngine.destroy();
      setTests((prev) => (prev.running ? { ...prev, running: false } : prev));
    }
  }, [nav.task, tests.draft]);

  const resetProgress = useCallback(() => {
    if (!window.confirm("Сбросить прогресс и черновики блока Tests?")) return;
    localStorage.removeItem(STORE_DONE);
    localStorage.removeItem(STORE_DRAFTS);
    localStorage.removeItem("sqltr.done");
    localStorage.removeItem("sqltr.drafts");
    setTests((prev) => ({ ...prev, solved: new Set(), draft: "", feedback: null, userResult: null, expectedResult: null }));
  }, []);

  // --- modal / designer ----------------------------------------------------------
  const showModal = useCallback((content) => setModalContent(content), []);
  const closeModal = useCallback(() => setModalContent(null), []);
  const openDesigner = useCallback((task = null) => setDesigner({ open: true, task }), []);
  const closeDesigner = useCallback(() => setDesigner((prev) => ({ ...prev, open: false })), []);

  // --- boot -----------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      const first = enabledRuntimes.includes("sqlite") ? "sqlite" : enabledRuntimes[0] || "sqlite";
      try {
        await openConnection(first);
      } catch { /* engine status already reflects the error */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (nav.mode === "tests" && nav.task && tests.currentTaskId !== nav.task) {
      selectTask(nav.task);
    }
  }, [nav.mode, nav.task, tests.currentTaskId, selectTask]);

  const value = useMemo(() => ({
    TASKS,
    COURSES,
    LEVEL_NAMES,
    nav,
    setMode,
    setNav,
    selectLecture,
    selectTask,
    selectCourse,
    openLab,
    openRailItem,
    engineId,
    engineStatus,
    engineBusy,
    engines: runtime.list(),
    enabledRuntimes,
    toggleRuntime,
    settingsOpen,
    setSettingsOpen,
    connections,
    activeConnId,
    openConnection,
    switchConnection,
    closeConnection,
    renameConnection,
    closeConnectionsOf,
    transfer,
    openTransfer,
    closeTransfer,
    setTransferConfig,
    runTransfer,
    sandbox,
    setDraft,
    runSandbox,
    runCommand,
    resetSandbox,
    clearSandbox,
    openTable,
    clearHistory,
    showHistoryCommand,
    tests,
    setTestDraft,
    runTest,
    resetProgress,
    setTests,
    modalContent,
    showModal,
    closeModal,
    designer,
    openDesigner,
    closeDesigner,
    artifactsOpen,
    setArtifactsOpen,
    toggleArtifacts,
  }), [
    TASKS, COURSES, nav, setMode, selectLecture, selectTask, selectCourse, openLab, openRailItem,
    engineId, engineStatus, engineBusy, enabledRuntimes, toggleRuntime, settingsOpen,
    connections, activeConnId, openConnection, switchConnection, closeConnection, renameConnection, closeConnectionsOf,
    transfer, openTransfer, closeTransfer, setTransferConfig, runTransfer,
    sandbox, setDraft, runSandbox, runCommand,
    resetSandbox, clearSandbox, openTable, clearHistory, showHistoryCommand, tests, setTestDraft,
    runTest, resetProgress, modalContent, showModal, closeModal, designer, openDesigner, closeDesigner,
    artifactsOpen, toggleArtifacts,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
