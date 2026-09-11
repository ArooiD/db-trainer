// IT Study Lab — sandbox-first shell with Tests as a separate learning mode.
const TASKS = window.DB_TASKS || [];
const COURSES = window.IT_STUDY_COURSES || [];
const runtime = window.ITStudyLab.runtime;
const WorkbenchSession = window.ITStudyLab.WorkbenchSession;
const workbench = new WorkbenchSession(runtime);

const LEVEL_NAMES = {
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
const $ = (id) => document.getElementById(id);

let currentTask = null;
let solved = loadSet(STORE_DONE);
let activeMode = "sandbox";
let activeLab = "database";
let activeCourseId = COURSES[0]?.id || "";
let activeLectureId = COURSES[0]?.lectures?.[0]?.id || "";
let pendingTaskId = null;

const LAB_COURSE = { database: "databases", programming: "programming" };
const COURSE_LAB = { databases: "database", programming: "programming" };

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatInline(text) {
  return escapeHtml(text).replace(/`([^`]+)`/g, "<code>$1</code>");
}

function loadSet(key) {
  try {
    const current = localStorage.getItem(key);
    const legacy = key === STORE_DONE ? localStorage.getItem("sqltr.done") : null;
    return new Set(JSON.parse(current || legacy || "[]"));
  } catch {
    return new Set();
  }
}

function saveSet(key, set) {
  localStorage.setItem(key, JSON.stringify([...set]));
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

function renderTable(result) {
  if (!result) return '<div class="empty">—</div>';
  if (result.error) {
    return `<div class="empty result-error">${escapeHtml(result.error)}</div>`;
  }
  if (!result.columns || result.columns.length === 0) {
    return '<div class="empty">Команда выполнена. Табличного результата нет.</div>';
  }
  if (!result.rows || result.rows.length === 0) {
    return '<div class="empty">0 строк</div>';
  }

  const head = '<th class="row-number-head"></th>' +
    result.columns.map((c) => `<th><span class="column-type">◇</span>${escapeHtml(c)}<span class="column-filter">▽</span></th>`).join("");
  const body = result.rows
    .map((row, rowIndex) => `<tr><td class="row-number">${rowIndex + 1}</td>${row.map((value) => `<td>${
      value === null
        ? '<span class="null-value">NULL</span>'
        : escapeHtml(value)
    }</td>`).join("")}</tr>`)
    .join("");
  const note = result.truncated
    ? '<div class="empty">Показаны первые 500 строк</div>'
    : "";
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>${note}`;
}

function normalizeCell(value) {
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

function resultsMatch(a, b, ordered) {
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

function syncUrl() {
  const url = new URL(location.href);
  if (activeMode === "sandbox") url.searchParams.delete("mode");
  else url.searchParams.set("mode", activeMode);

  url.searchParams.delete("lab");
  url.searchParams.delete("course");
  url.searchParams.delete("lecture");
  url.searchParams.delete("task");

  if (activeMode === "sandbox") {
    if (activeLab !== "database") url.searchParams.set("lab", activeLab);
  } else if (activeMode === "lectures") {
    if (activeCourseId) url.searchParams.set("course", activeCourseId);
    if (activeLectureId) url.searchParams.set("lecture", activeLectureId);
  } else if (activeMode === "tests") {
    if (currentTask) url.searchParams.set("task", currentTask.id);
  }

  history.replaceState(null, "", url);
}

function readStateFromUrl() {
  const params = new URL(location.href).searchParams;
  const mode = params.get("mode");
  if (["tests", "lectures"].includes(mode)) activeMode = mode;

  const lab = params.get("lab");
  if (lab === "programming" || lab === "database") activeLab = lab;

  const course = params.get("course");
  if (course && COURSES.some((item) => item.id === course)) {
    activeCourseId = course;
    if (!["programming", "database"].includes(params.get("lab"))) {
      activeLab = COURSE_LAB[course] || activeLab;
    }
    const lecture = params.get("lecture");
    const courseObj = COURSES.find((item) => item.id === course);
    if (lecture && courseObj.lectures.some((item) => item.id === lecture)) {
      activeLectureId = lecture;
    } else {
      activeLectureId = courseObj.lectures[0]?.id || "";
    }
  }

  const task = params.get("task");
  if (task && TASKS.some((item) => item.id === task)) pendingTaskId = task;
}

function setMode(mode) {
  activeMode = ["sandbox", "tests", "lectures"].includes(mode) ? mode : "sandbox";
  $("sandbox-view").classList.toggle("hidden", activeMode !== "sandbox");
  $("tests-view").classList.toggle("hidden", activeMode !== "tests");
  $("lectures-view").classList.toggle("hidden", activeMode !== "lectures");
  $("tab-sandbox").classList.toggle("active", activeMode === "sandbox");
  $("tab-tests").classList.toggle("active", activeMode === "tests");
  $("tab-lectures").classList.toggle("active", activeMode === "lectures");
  $("progress").classList.toggle("hidden", activeMode !== "tests");

  syncUrl();
  updateRail();

  if (activeMode === "sandbox") {
    syncSandboxDraft();
    $("sandbox-editor").focus();
  } else if (!currentTask && TASKS.length) {
    if (activeMode === "tests") selectTask(TASKS[0].id);
  }
}

function setLab(lab) {
  activeLab = lab === "programming" ? "programming" : "database";
  $("database-sandbox").classList.toggle("hidden", activeLab !== "database");
  $("programming-sandbox").classList.toggle("hidden", activeLab !== "programming");
  if (LAB_COURSE[activeLab] && LAB_COURSE[activeLab] !== activeCourseId) {
    activeCourseId = LAB_COURSE[activeLab];
    activeLectureId = COURSES.find((item) => item.id === activeCourseId)?.lectures?.[0]?.id || "";
    renderLectures();
  }
  updateRail();
  syncUrl();
  if (activeLab === "programming") $("program-editor").focus();
  else $("sandbox-editor").focus();
}

function updateRail() {
  document.querySelectorAll("[data-open-lab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.openLab === activeLab && activeMode === "sandbox");
  });
  document.querySelectorAll("[data-open-course]").forEach((button) => {
    button.classList.toggle("active", button.dataset.openCourse === activeCourseId && activeMode === "lectures");
  });
}

function selectCourse(courseId) {
  const course = COURSES.find((item) => item.id === courseId);
  if (!course) return;
  if (activeCourseId !== course.id) {
    activeCourseId = course.id;
    activeLectureId = course.lectures[0]?.id || "";
  }
  renderLectures();
  updateRail();
  syncUrl();
}

function renderLectures() {
  if (!COURSES.length) return;

  const course = COURSES.find((item) => item.id === activeCourseId) || COURSES[0];
  activeCourseId = course.id;
  const lecture = course.lectures.find((item) => item.id === activeLectureId) || course.lectures[0];
  activeLectureId = lecture?.id || "";

  $("course-overview").innerHTML = `
    <div>
      <span class="course-badge" style="--course-accent:${escapeHtml(course.accent)}">${escapeHtml(course.code)}</span>
      <div class="course-heading">
        <small>${course.status === "available" ? "Активный курс" : "Каркас курса"}</small>
        <h2>${escapeHtml(course.title)}</h2>
        <p>${escapeHtml(course.description)}</p>
      </div>
    </div>
    <div class="course-meta"><strong>${course.lectures.length}</strong><span>темы</span><small>${escapeHtml(course.runtime)}</small></div>
  `;

  $("lecture-list").innerHTML = course.lectures.map((item, index) => `
    <button class="lecture-item ${item.id === activeLectureId ? "active" : ""}" data-lecture-id="${escapeHtml(item.id)}">
      <span class="lecture-index">${String(index + 1).padStart(2, "0")}</span>
      <span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.level)} · ${escapeHtml(item.duration)}</small></span>
    </button>
  `).join("");

  if (lecture) renderLectureReader(course, lecture);

  $("lecture-list").querySelectorAll("[data-lecture-id]").forEach((button) => {
    button.addEventListener("click", () => {
      activeLectureId = button.dataset.lectureId;
      renderLectures();
      syncUrl();
    });
  });
}

function renderLectureReader(course, lecture) {
  const available = Array.isArray(lecture.theory);
  $("lecture-reader").innerHTML = `
    <div class="lecture-reader-head">
      <div><span>${escapeHtml(lecture.level)}</span><h3>${escapeHtml(lecture.title)}</h3></div>
      <span class="lecture-duration">${escapeHtml(lecture.duration)}</span>
    </div>
    <p class="lecture-lead">${escapeHtml(lecture.summary)}</p>
    ${available ? `
      <div class="theory-points">
        ${lecture.theory.map((point, index) => `<section><span>${index + 1}</span><p>${escapeHtml(point)}</p></section>`).join("")}
      </div>
      <div class="lecture-practice"><small>Практическое продолжение</small><p>${escapeHtml(lecture.practice)}</p></div>
      ${course.id === "databases" ? `
        <div class="lecture-actions">
          <button class="primary" id="lecture-open-sandbox">Открыть Database Sandbox</button>
          <button id="lecture-open-tests">Перейти к SQL Tests</button>
        </div>
      ` : course.id === "programming" ? `
        <div class="lecture-actions">
          <button class="primary" id="lecture-open-programming">Открыть Programming Sandbox</button>
          <span class="lecture-runtime-status">JavaScript готов сразу · Python загружается при первом запуске</span>
        </div>
      ` : `
        <div class="lecture-actions"><span class="lecture-runtime-status">Практический runtime готовится для этого курса.</span></div>
      `}
    ` : `
      <div class="lecture-placeholder">
        <span>Содержание готовится</span>
        <p>Структура курса создана. Сюда подключаются теория, примеры, лабораторная работа и runtime <strong>${escapeHtml(course.runtime)}</strong>.</p>
      </div>
    `}
  `;
 $("lecture-open-sandbox")?.addEventListener("click", () => setMode("sandbox"));
 $("lecture-open-tests")?.addEventListener("click", () => setMode("tests"));
  $("lecture-open-programming")?.addEventListener("click", () => { setMode("sandbox"); setLab("programming"); });
}

function renderEngineOptions() {
  $("engine-select").innerHTML = runtime
    .list()
    .map((engine) =>
      `<option value="${escapeHtml(engine.id)}">${escapeHtml(engine.label)} · ${escapeHtml(
        engine.technology || engine.dialect || "runtime"
      )}</option>`
    )
    .join("");
}

function updateEngineStatus(text, state = "") {
  const el = $("engine-status");
  el.textContent = text;
  el.className = `runtime-status ${state}`.trim();
}

async function switchEngine(id) {
  const select = $("engine-select");
  const previous = runtime.activeId;
  select.disabled = true;
  $("sandbox-run").disabled = true;
  $("test-run").disabled = true;
  updateEngineStatus("загрузка…", "loading");

  try {
    await window.DB.use(id);
    select.value = id;
    const meta = runtime.getMeta(id);
    updateEngineStatus(`${meta.label} готов`, "ready");
    $("sandbox-runtime-name").textContent = meta.label;
    $("sandbox-runtime-tech").textContent = meta.technology || meta.dialect || "runtime";
    if ($("ide-engine-label")) $("ide-engine-label").textContent = meta.label;
    $("sandbox-result").innerHTML = '<div class="empty">Среда готова. Выполните команду.</div>';
    $("sandbox-feedback").textContent = "";
    syncSandboxDraft();
    renderHistory();

    if (currentTask) selectTask(currentTask.id);
  } catch (err) {
    select.value = previous || "sqlite";
    updateEngineStatus("ошибка запуска", "error");
    showFeedback(
      $("sandbox-feedback"),
      `Не удалось запустить runtime: ${(err && err.message) || err}`,
      false
    );
  } finally {
    select.disabled = false;
    $("sandbox-run").disabled = false;
    $("test-run").disabled = false;
  }
}

function syncSandboxDraft() {
  const engineId = runtime.activeId || "sqlite";
  const key = `it-study-lab.workbench.draft.${engineId}`;
  $("sandbox-editor").value =
    localStorage.getItem(key) ||
    (engineId === "postgres"
      ? "SELECT version();\n\nSELECT * FROM employees LIMIT 5;"
      : "SELECT sqlite_version();\n\nSELECT * FROM employees LIMIT 5;");
}

function saveSandboxDraft() {
  const engineId = runtime.activeId || "sqlite";
  localStorage.setItem(
    `it-study-lab.workbench.draft.${engineId}`,
    $("sandbox-editor").value
  );
}

async function runSandbox() {
  const command = $("sandbox-editor").value.trim();
  if (!command) {
    showFeedback($("sandbox-feedback"), "Введите SQL-команду.", false);
    return;
  }

  saveSandboxDraft();
  $("sandbox-run").disabled = true;
  $("sandbox-feedback").textContent = "Выполнение…";
  try {
    const entry = await workbench.run(command);
    $("sandbox-result").innerHTML = renderTable(entry.result);
    if (!$("result-tab-title").dataset.table) $("result-tab-title").textContent = "SQL Result";
    const rows = (entry.result && entry.result.rows && entry.result.rows.length) || 0;
    const message = entry.result && entry.result.error
      ? `Ошибка · ${entry.durationMs} ms`
      : `Готово · ${entry.durationMs} ms · ${rows} строк`;
    showFeedback($("sandbox-feedback"), message, !(entry.result && entry.result.error));
    renderHistory();
  } finally {
    $("sandbox-run").disabled = false;
  }
}

async function resetSandbox() {
  if (!confirm("Сбросить текущее окружение и восстановить учебную базу?")) return;
  $("sandbox-run").disabled = true;
  try {
    await workbench.reset();
    $("sandbox-result").innerHTML = '<div class="empty">Окружение сброшено.</div>';
    showFeedback($("sandbox-feedback"), "Runtime восстановлен в исходное состояние.", true);
  } finally {
    $("sandbox-run").disabled = false;
  }
}

function renderHistory() {
  const items = workbench.history();
  const target = $("sandbox-history");
  if (!items.length) {
    target.innerHTML = '<div class="history-empty">История появится после первого запуска.</div>';
    return;
  }
  target.innerHTML = items
    .slice(0, 20)
    .map((item, index) => {
      const preview = item.command.replace(/\s+/g, " ").trim();
      const ok = !item.error;
      return `<button class="history-item" data-history-index="${index}">
        <span class="history-state ${ok ? "ok" : "bad"}">${ok ? "✓" : "!"}</span>
        <span class="history-command">${escapeHtml(preview)}</span>
        <span class="history-time">${item.durationMs} ms</span>
      </button>`;
    })
    .join("");

  target.querySelectorAll(".history-item").forEach((button) => {
    button.addEventListener("click", () => {
      const item = items[Number(button.dataset.historyIndex)];
      if (item) {
        $("sandbox-editor").value = item.command;
        $("sandbox-editor").focus();
      }
    });
  });
}

function showFeedback(element, message, ok) {
  element.textContent = message;
  element.className = `inline-feedback ${ok ? "ok" : "bad"}`;
}

function showSchema() {
  const meta = runtime.getMeta() || { label: "SQL" };
  openModal(
    `<h3>Схема учебной базы · ${escapeHtml(meta.label)}</h3>` +
    `<pre>${escapeHtml(window.DB.schemaDoc())}</pre>` +
    '<p class="muted">Схема одинакова в SQLite и PostgreSQL, чтобы можно было сравнивать диалекты.</p>'
  );
}

function renderSidebar() {
  const byLevel = {};
  TASKS.forEach((task) => (byLevel[task.level] = byLevel[task.level] || []).push(task));
  $("test-task-list").innerHTML = Object.keys(byLevel)
    .sort((a, b) => Number(a) - Number(b))
    .map((level) => {
      const items = byLevel[level]
        .map((task) => {
          const ok = solved.has(task.id);
          const active = currentTask && currentTask.id === task.id;
          return `<button class="task-item ${ok ? "solved" : ""} ${active ? "active" : ""}" data-id="${task.id}">
            <span class="mark">${ok ? "✓" : ""}</span>
            <span>${escapeHtml(task.title)}</span>
          </button>`;
        })
        .join("");
      return `<div class="level-group">
        <div class="level-name">${LEVEL_NAMES[level] || `Уровень ${level}`}</div>
        ${items}
      </div>`;
    })
    .join("");

  $("test-task-list").querySelectorAll(".task-item").forEach((button) => {
    button.addEventListener("click", () => selectTask(button.dataset.id));
  });
}

function updateProgress() {
  $("progress").textContent = `Tests: ${solved.size} / ${TASKS.length}`;
}

function selectTask(id) {
  const task = TASKS.find((item) => item.id === id);
  if (!task) return;
  currentTask = task;

  $("test-level").textContent = LEVEL_NAMES[task.level] || `Уровень ${task.level}`;
  $("test-title").textContent = task.title;
  $("test-desc").innerHTML = formatInline(task.description);
  $("test-hint-box").classList.add("hidden");
  $("test-solution-box").classList.add("hidden");
  $("test-feedback").classList.add("hidden");
  $("test-user-result").innerHTML = "";
  $("test-expected-result").innerHTML = "";
  $("test-editor").value = loadDrafts()[id] || "";

  const status = $("test-status");
  if (solved.has(id)) {
    status.textContent = "Решено ✓";
    status.className = "badge ok";
  } else {
    status.textContent = "Не решено";
    status.className = "badge";
  }
  renderSidebar();
  syncUrl();
}

async function runTest() {
  const sql = $("test-editor").value.trim();
  const feedback = $("test-feedback");
  if (!sql || !currentTask) {
    feedback.className = "feedback no";
    feedback.textContent = "Введите SQL-запрос.";
    return;
  }

  const drafts = loadDrafts();
  drafts[currentTask.id] = $("test-editor").value;
  localStorage.setItem(STORE_DRAFTS, JSON.stringify(drafts));

  $("test-run").disabled = true;
  let testEngine = null;
  try {
    // Tests use a separate temporary engine. Free Sandbox state must survive
    // opening and running knowledge checks.
    testEngine = await runtime.createIsolated(runtime.activeId);
    const userResult = await testEngine.execute(sql);
    $("test-user-result").innerHTML = renderTable(userResult);

    await testEngine.reset();
    const expected = await testEngine.execute(currentTask.solution);
    $("test-expected-result").innerHTML = renderTable(expected);

    const ok =
      !userResult.error &&
      !expected.error &&
      resultsMatch(userResult, expected, currentTask.ordered !== false);

    if (ok) {
      solved.add(currentTask.id);
      saveSet(STORE_DONE, solved);
      updateProgress();
      renderSidebar();
      $("test-status").textContent = "Решено ✓";
      $("test-status").className = "badge ok";
      feedback.className = "feedback ok";
      feedback.textContent = "Верно. Результат совпадает с ожидаемым.";
    } else if (userResult.error) {
      feedback.className = "feedback no";
      feedback.innerHTML =
        `Запрос завершился с ошибкой:<br><span class="err">${escapeHtml(userResult.error)}</span>`;
    } else {
      feedback.className = "feedback no";
      feedback.textContent =
        "Результат не совпадает с ожидаемым. Сравните таблицы и попробуйте ещё раз.";
    }
  } catch (err) {
    feedback.className = "feedback no";
    feedback.innerHTML =
      `Не удалось запустить тестовое окружение:<br><span class="err">${escapeHtml((err && err.message) || err)}</span>`;
  } finally {
    if (testEngine && typeof testEngine.destroy === "function") {
      await testEngine.destroy();
    }
    $("test-run").disabled = false;
  }
}

function openModal(html) {
  $("modal-content").innerHTML = html;
  $("modal").classList.remove("hidden");
}

function wireEvents() {
  $("tab-sandbox").addEventListener("click", () => setMode("sandbox"));
  $("tab-tests").addEventListener("click", () => setMode("tests"));
 $("tab-lectures").addEventListener("click", () => setMode("lectures"));
  document.querySelectorAll("[data-open-lab]").forEach((button) => button.addEventListener("click", () => { setMode("sandbox"); setLab(button.dataset.openLab); }));
  document.querySelectorAll("[data-open-course]").forEach((button) => button.addEventListener("click", () => { setMode("lectures"); selectCourse(button.dataset.openCourse); }));
  $("program-open-lectures").addEventListener("click", () => {
    setMode("lectures");
    selectCourse("programming");
  });
  $("engine-select").addEventListener("change", (event) => switchEngine(event.target.value));

  $("sandbox-run").addEventListener("click", runSandbox);
  $("sandbox-refresh-result").addEventListener("click", runSandbox);
  $("new-query-tab").addEventListener("click", () => {
    $("result-tab-title").textContent = "SQL Result";
    delete $("result-tab-title").dataset.table;
    $("sandbox-editor").value = "";
    $("sandbox-result").innerHTML = '<div class="empty">Новая SQL-консоль. Введите запрос ниже.</div>';
    $("sandbox-feedback").textContent = "";
    $("sandbox-editor").focus();
  });
  window.addEventListener("it-study-lab:open-table", async (event) => {
    const tableName = event.detail && event.detail.tableName;
    if (!tableName) return;
    $("result-tab-title").textContent = tableName;
    $("result-tab-title").dataset.table = tableName;
    await runSandbox();
  });
  $("sandbox-clear").addEventListener("click", () => {
    $("sandbox-editor").value = "";
    $("sandbox-editor").focus();
  });
  $("sandbox-reset").addEventListener("click", resetSandbox);
  $("sandbox-schema").addEventListener("click", showSchema);
  $("sandbox-design").addEventListener("click", () => window.Designer.open(null));
  $("sandbox-clear-history").addEventListener("click", () => {
    workbench.clearHistory();
    renderHistory();
  });
  $("sandbox-editor").addEventListener("input", saveSandboxDraft);
  $("sandbox-editor").addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      runSandbox();
    }
  });

  $("test-run").addEventListener("click", runTest);
  $("test-editor").addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      runTest();
    }
  });
  $("test-hint").addEventListener("click", () => {
    if (!currentTask) return;
    $("test-hint-box").textContent = currentTask.hint;
    $("test-hint-box").classList.remove("hidden");
  });
  $("test-solution").addEventListener("click", () => {
    if (!currentTask) return;
    $("test-solution-box").innerHTML =
      `Пример решения:<pre>${escapeHtml(currentTask.solution)}</pre>`;
    $("test-solution-box").classList.remove("hidden");
  });
  $("test-clear").addEventListener("click", () => ($("test-editor").value = ""));
  $("test-schema").addEventListener("click", showSchema);
  $("test-design").addEventListener("click", () => window.Designer.open(currentTask));
  $("test-reset-progress").addEventListener("click", () => {
    if (!confirm("Сбросить прогресс и черновики блока Tests?")) return;
    localStorage.removeItem(STORE_DONE);
    localStorage.removeItem(STORE_DRAFTS);
    localStorage.removeItem("sqltr.done");
    localStorage.removeItem("sqltr.drafts");
    solved = new Set();
    updateProgress();
    renderSidebar();
    if (currentTask) selectTask(currentTask.id);
  });


  $("modal-close").addEventListener("click", () => $("modal").classList.add("hidden"));
  $("modal").addEventListener("click", (event) => {
    if (event.target === $("modal")) $("modal").classList.add("hidden");
  });
}

async function boot() {
  readStateFromUrl();
  renderEngineOptions();
  updateProgress();
  renderSidebar();
  renderLectures();
  window.ITStudyLab.initProgramming();
  wireEvents();

  setLab(activeLab);
  setMode(activeMode);
  await switchEngine("sqlite");

  if (pendingTaskId) selectTask(pendingTaskId);
  else if (!currentTask && TASKS.length) selectTask(TASKS[0].id);
}

boot();
