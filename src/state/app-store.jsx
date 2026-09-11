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

function initialLocation() {
  const params = new URL(location.href).searchParams;
  const state = { mode: "sandbox", lab: "database", course: COURSES[0]?.id || "", lecture: "", task: "" };

  const mode = params.get("mode");
  if (["tests", "lectures"].includes(mode)) state.mode = mode;

  const lab = params.get("lab");
  if (lab === "programming" || lab === "database") state.lab = lab;

  const course = params.get("course");
  if (course && COURSES.some((item) => item.id === course)) {
    state.course = course;
    if (!["programming", "database"].includes(lab) && mode !== "sandbox") {
      state.lab = COURSE_LAB[course] || state.lab;
    }
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

    if (nav.mode === "sandbox") {
      if (nav.lab !== "database") url.searchParams.set("lab", nav.lab);
    } else if (nav.mode === "lectures") {
      if (nav.course) url.searchParams.set("course", nav.course);
      if (nav.lecture) url.searchParams.set("lecture", nav.lecture);
    } else if (nav.mode === "tests") {
      if (nav.task) url.searchParams.set("task", nav.task);
    }
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
    setNav((prev) => ({ ...prev, task }));
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
      const lab = COURSE_LAB[course.id];
      if (lab) next.lab = lab;
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

  // Rail item: в режиме лекций переключаем курс, иначе открываем лабораторию.
  const openRailItem = useCallback((item) => {
    setNav((prev) => {
      if (prev.mode === "lectures") {
        const course = COURSES.find((entry) => entry.id === item.course);
        if (!course) return prev;
        const next = { ...prev, course: course.id };
        if (prev.course !== course.id) next.lecture = course.lectures[0]?.id || "";
        const lab = COURSE_LAB[course.id];
        if (lab) next.lab = lab;
        return next;
      }
      if (!item.lab) return prev;
      const next = { ...prev, mode: "sandbox", lab: item.lab };
      const course = LAB_COURSE[item.lab];
      if (course && course !== prev.course) {
        next.course = course;
        next.lecture = COURSES.find((entry) => entry.id === course)?.lectures?.[0]?.id || "";
      }
      return next;
    });
  }, []);

  // --- sandbox draft per engine ---------------------------------------------
  const loadEngineDraft = useCallback((id) => {
    try {
      return localStorage.getItem(`it-study-lab.workbench.draft.${id}`) || DEFAULT_DRAFT[id] || DEFAULT_DRAFT.sqlite;
    } catch {
      return DEFAULT_DRAFT[id] || DEFAULT_DRAFT.sqlite;
    }
  }, []);

  const setDraft = useCallback((value) => {
    setSandbox((prev) => ({ ...prev, draft: value }));
    try {
      localStorage.setItem(`it-study-lab.workbench.draft.${runtime.activeId || "sqlite"}`, value);
    } catch { /* ignore */ }
  }, []);

  // --- engine lifecycle -------------------------------------------------------
  const switchEngine = useCallback(async (id) => {
    setEngineBusy(true);
    setEngineStatus({ text: "загрузка…", state: "loading" });
    try {
      await runtime.use(id);
      setEngineId(id);
      const meta = runtime.getMeta(id);
      setEngineStatus({ text: `${meta.label} готов`, state: "ready" });
      setSandbox((prev) => ({
        ...prev,
        draft: loadEngineDraft(id),
        result: null,
        resultEmpty: "Среда готова. Выполните команду.",
        feedback: { text: "", state: "" },
        tabTitle: "SQL Result",
        tabIsTable: false,
        history: workbench.history(id),
      }));
    } catch (err) {
      setEngineStatus({ text: "ошибка запуска", state: "error" });
      setSandbox((prev) => ({
        ...prev,
        feedback: { text: `Не удалось запустить runtime: ${(err && err.message) || err}`, state: "bad" },
      }));
      throw err;
    } finally {
      setEngineBusy(false);
    }
  }, [loadEngineDraft]);

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
    switchEngine("sqlite").catch(() => {});
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
    switchEngine,
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
  }), [
    TASKS, COURSES, nav, setMode, selectLecture, selectTask, selectCourse, openLab, openRailItem,
    engineId, engineStatus, engineBusy, switchEngine, sandbox, setDraft, runSandbox, runCommand,
    resetSandbox, clearSandbox, openTable, clearHistory, showHistoryCommand, tests, setTestDraft,
    runTest, resetProgress, modalContent, showModal, closeModal, designer, openDesigner, closeDesigner,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
