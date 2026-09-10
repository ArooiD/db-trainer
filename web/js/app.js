// IT Study Lab — sandbox-first shell with Tests as a separate learning mode.
const TASKS = window.DB_TASKS || [];
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
    return JSON.parse(localStorage.getItem(STORE_DRAFTS) || localStorage.getItem("sqltr.drafts") || "{}");
  } catch {
    return {};
  }
}

function renderTable(result) {
  if (!result) return '<div class="empty">—</div>';
  if (result.error) return `<div class="empty result-error">${escapeHtml(result.error)}</div>`;
  if (!result.columns || result.columns.length === 0) return '<div class="empty">Команда выполнена. Табличного результата нет.</div>';
  if (!result.rows || result.rows.length === 0) return '<div class="empty">0 строк</div>';

  const head = result.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
  const body = result.rows.map((row) => `<tr>${row.map((value) => `<td>${value === null ? '<span class="null-value">NULL</span>' : escapeHtml(value)}</td>`).join("")}</tr>`).join("");
  const note = result.truncated ? '<div class="empty">Показаны первые 500 строк</div>' : "";
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>${note}`;
}

function normalizeCell(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    return Math.abs(value - Math.round(value)) < 1e-9 ? String(Math.round(value)) : (Math.round(value * 1e6) / 1e6).toString();
  }
  return String(value);
}

function rowKey(row) { return row.map(normalizeCell).join("\u0001"); }

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

function setMode(mode) {
  activeMode = mode === "tests" ? "tests" : "sandbox";
  $("sandbox-view").classList.toggle("hidden", activeMode !== "sandbox");
  $("tests-view").classList.toggle("hidden", activeMode !== "tests");
  $("tab-sandbox").classList.toggle("active", activeMode === "sandbox");
  $("tab-tests").classList.toggle("active", activeMode === "tests");
  $("progress").classList.toggle("hidden", activeMode !== "tests");

  const url = new URL(location.href);
  if (activeMode === "tests") url.searchParams.set("mode", "tests");
  else url.searchParams.delete("mode");
  history.replaceState(null, "", url);

  if (activeMode === "sandbox") {
    syncSandboxDraft();
    $("sandbox-editor").focus();
  } else if (!currentTask && TASKS.length) {
    selectTask(TASKS[0].id);
  }
}

function renderEngineOptions() {
  $("engine-select").innerHTML = runtime.list().map((engine) => `<option value="${escapeHtml(engine.id)}">${escapeHtml(engine.label)} · ${escapeHtml(engine.technology || engine.dialect || "runtime")}</option>`).join("");
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
    $("sandbox-result").innerHTML = '<div class="empty">Среда готова. Выполните команду.</div>';
    $("sandbox-feedback").textContent = "";
    syncSandboxDraft();
    renderHistory();
    if (currentTask) selectTask(currentTask.id);
  } catch (err) {
    select.value = previous || "sqlite";
    updateEngineStatus("ошибка запуска", "error");
    showFeedback($("sandbox-feedback"), `Не удалось запустить runtime: ${(err && err.message) || err}`, false);
  } finally {
    select.disabled = false;
    $("sandbox-run").disabled = false;
    $("test-run").disabled = false;
  }
}

function syncSandboxDraft() {
  const engineId = runtime.activeId || "sqlite";
  const key = `it-study-lab.workbench.draft.${engineId}`;
  $("sandbox-editor").value = localStorage.getItem(key) || (engineId === "postgres" ? "SELECT version();\n\nSELECT * FROM employees LIMIT 5;" : "SELECT sqlite_version();\n\nSELECT * FROM employees LIMIT 5;");
}

function saveSandboxDraft() {
  const engineId = runtime.activeId || "sqlite";
  localStorage.setItem(`it-study-lab.workbench.draft.${engineId}`, $("sandbox-editor").value);
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
    const rows = (entry.result && entry.result.rows && entry.result.rows.length) || 0;
    const message = entry.result && entry.result.error ? `Ошибка · ${entry.durationMs} ms` : `Готово · ${entry.durationMs} ms · ${rows} строк`;
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
  target.innerHTML = items.slice(0, 20).map((item, index) => {
    const preview = item.command.replace(/\s+/g, " ").trim();
    const ok = !item.error;
    return `<button class="history-item" data-history-index="${index}"><span class="history-state ${ok ? "ok" : "bad"}">${ok ? "✓" : "!"}</span><span class="history-command">${escapeHtml(preview)}</span><span class="history-time">${item.durationMs} ms</span></button>`;
  }).join("");

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
  openModal(`<h3>Схема учебной базы · ${escapeHtml(meta.label)}</h3><pre>${escapeHtml(window.DB.schemaDoc())}</pre><p class="muted">Схема одинакова в SQLite и PostgreSQL, чтобы можно было сравнивать диалекты.</p>`);
}

function openFutureModule(name, description) {
  openModal(`<div class="coming-badge">Следующий runtime</div><h3>${escapeHtml(name)}</h3><p>${escapeHtml(description)}</p><p class="muted">Этот модуль будет подключаться к тому же Workbench API: input → runtime → output/state.</p>`);
}

function renderSidebar() {
  const byLevel = {};
  TASKS.forEach((task) => (byLevel[task.level] = byLevel[task.level] || []).push(task));
  $("test-task-list").innerHTML = Object.keys(byLevel).sort((a, b) => Number(a) - Number(b)).map((level) => {
    const items = byLevel[level].map((task) => {
      const ok = solved.has(task.id);
      const active = currentTask && currentTask.id === task.id;
      return `<button class="task-item ${ok ? "solved" : ""} ${active ? "active" : ""}" data-id="${task.id}"><span class="mark">${ok ? "✓" : ""}</span><span>${escapeHtml(task.title)}</span></button>`;
    }).join("");
    return `<div class="level-group"><div class="level-name">${LEVEL_NAMES[level] || `Уровень ${level}`}</div>${items}</div>`;
  }).join("");

  $("test-task-list").querySelectorAll(".task-item").forEach((button) => button.addEventListener("click", () => selectTask(button.dataset.id)));
}

function updateProgress() { $("progress").textContent = `Tests: ${solved.size} / ${TASKS.length}`; }

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
  try {
    await runtime.reset();
    const userResult = await runtime.execute(sql);
    $("test-user-result").innerHTML = renderTable(userResult);
    await runtime.reset();
    const expected = await runtime.execute(currentTask.solution);
    $("test-expected-result").innerHTML = renderTable(expected);

    const ok = !userResult.error && !expected.error && resultsMatch(userResult, expected, currentTask.ordered !== false);
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
      feedback.innerHTML = `Запрос завершился с ошибкой:<br><span class="err">${escapeHtml(userResult.error)}</span>`;
    } else {
      feedback.className = "feedback no";
      feedback.textContent = "Результат не совпадает с ожидаемым. Сравните таблицы и попробуйте ещё раз.";
    }
  } finally {
    await runtime.reset();
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
  $("engine-select").addEventListener("change", (event) => switchEngine(event.target.value));

  $("sandbox-run").addEventListener("click", runSandbox);
  $("sandbox-clear").addEventListener("click", () => { $("sandbox-editor").value = ""; $("sandbox-editor").focus(); });
  $("sandbox-reset").addEventListener("click", resetSandbox);
  $("sandbox-schema").addEventListener("click", showSchema);
  $("sandbox-design").addEventListener("click", () => window.Designer.open(null));
  $("sandbox-clear-history").addEventListener("click", () => { workbench.clearHistory(); renderHistory(); });
  $("sandbox-editor").addEventListener("input", saveSandboxDraft);
  $("sandbox-editor").addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); runSandbox(); }
  });

  $("test-run").addEventListener("click", runTest);
  $("test-editor").addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); runTest(); }
  });
  $("test-hint").addEventListener("click", () => {
    if (!currentTask) return;
    $("test-hint-box").textContent = currentTask.hint;
    $("test-hint-box").classList.remove("hidden");
  });
  $("test-solution").addEventListener("click", () => {
    if (!currentTask) return;
    $("test-solution-box").innerHTML = `Пример решения:<pre>${escapeHtml(currentTask.solution)}</pre>`;
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

  document.querySelectorAll("[data-future-module]").forEach((button) => {
    button.addEventListener("click", () => openFutureModule(button.dataset.title, button.dataset.description));
  });

  $("modal-close").addEventListener("click", () => $("modal").classList.add("hidden"));
  $("modal").addEventListener("click", (event) => { if (event.target === $("modal")) $("modal").classList.add("hidden"); });
}

async function boot() {
  renderEngineOptions();
  updateProgress();
  renderSidebar();
  wireEvents();
  const requestedMode = new URL(location.href).searchParams.get("mode");
  setMode(requestedMode === "tests" ? "tests" : "sandbox");
  await switchEngine("sqlite");
  if (!currentTask && TASKS.length) selectTask(TASKS[0].id);
}

boot();
