// IT Study Lab — модуль «Базы данных».
// Учебный UI работает через общий LabRuntime, поэтому SQL-движок можно менять
// без изменения логики заданий и проверки.

const TASKS = window.DB_TASKS;
const runtime = window.ITStudyLab.runtime;
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
let sandboxMode = false;

// ---------- storage ----------
const loadSet = (key) => {
  try {
    const current = localStorage.getItem(key);
    const legacy = key === STORE_DONE ? localStorage.getItem("sqltr.done") : null;
    return new Set(JSON.parse(current || legacy || "[]"));
  } catch {
    return new Set();
  }
};
const saveSet = (key, set) => localStorage.setItem(key, JSON.stringify([...set]));
const loadDrafts = () => {
  try {
    return JSON.parse(
      localStorage.getItem(STORE_DRAFTS) || localStorage.getItem("sqltr.drafts") || "{}"
    );
  } catch {
    return {};
  }
};

let solved = loadSet(STORE_DONE);

// ---------- runtime ----------
const executeSQL = (sql) => Promise.resolve(window.DB.executeSQL(sql));

function renderEngineOptions() {
  $("engine-select").innerHTML = runtime
    .list()
    .map(
      (engine) =>
        `<option value="${engine.id}">${escapeHtml(engine.label)} · ${escapeHtml(
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
  $("btn-run").disabled = true;
  updateEngineStatus("загрузка…", "loading");

  try {
    await window.DB.use(id);
    select.value = id;
    const meta = runtime.getMeta(id);
    updateEngineStatus(`${meta.label} готов`, "ready");
    $("user-result").innerHTML = "";
    $("expected-result").innerHTML = "";
    $("feedback").classList.add("hidden");

    if (sandboxMode) enableSandbox();
    else selectTask((currentTask && currentTask.id) || TASKS[0].id);
  } catch (err) {
    select.value = previous || "sqlite";
    updateEngineStatus("ошибка запуска", "error");
    const fb = $("feedback");
    fb.className = "feedback no";
    fb.innerHTML =
      "Не удалось запустить выбранный runtime:<br><span class='err'>" +
      escapeHtml(String((err && err.message) || err)) +
      "</span>";
  } finally {
    select.disabled = false;
    $("btn-run").disabled = false;
  }
}

// ---------- comparison ----------
function normalizeCell(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") {
    return Math.abs(v - Math.round(v)) < 1e-9
      ? String(Math.round(v))
      : (Math.round(v * 1e6) / 1e6).toString();
  }
  return String(v);
}

function rowKey(row) {
  return row.map(normalizeCell).join("\u0001");
}

function resultsMatch(a, b, ordered) {
  if (!a || !b) return false;
  const ra = a.rows || [];
  const rb = b.rows || [];
  if (ra.length !== rb.length) return false;
  if (ordered) return ra.every((row, i) => rowKey(row) === rowKey(rb[i]));

  const mb = {};
  rb.forEach((r) => (mb[rowKey(r)] = (mb[rowKey(r)] || 0) + 1));
  for (const row of ra) {
    const k = rowKey(row);
    if (!mb[k]) return false;
    mb[k] -= 1;
  }
  return true;
}

// ---------- rendering ----------
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderTable(result) {
  if (!result) return '<div class="empty">—</div>';
  if (result.error)
    return `<div class="empty" style="color:#ff6b6b">${escapeHtml(result.error)}</div>`;
  if (!result.columns || result.columns.length === 0)
    return '<div class="empty">Команда выполнена. Табличного результата нет.</div>';
  if (!result.rows || result.rows.length === 0) return '<div class="empty">0 строк</div>';

  const head = result.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
  const body = result.rows
    .map(
      (r) =>
        `<tr>${r
          .map(
            (v) =>
              `<td>${
                v === null
                  ? '<span style="color:#8a97b3">NULL</span>'
                  : escapeHtml(v)
              }</td>`
          )
          .join("")}</tr>`
    )
    .join("");
  const note = result.truncated
    ? '<div class="empty">Показаны первые 500 строк</div>'
    : "";
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>${note}`;
}

function renderSidebar() {
  const byLevel = {};
  TASKS.forEach((t) => (byLevel[t.level] = byLevel[t.level] || []).push(t));
  $("task-list").innerHTML = Object.keys(byLevel)
    .sort((a, b) => a - b)
    .map((lvl) => {
      const items = byLevel[lvl]
        .map((t) => {
          const ok = solved.has(t.id);
          const active = !sandboxMode && currentTask && currentTask.id === t.id;
          return `<button class="task-item ${ok ? "solved" : ""} ${
            active ? "active" : ""
          }" data-id="${t.id}">
            <span class="mark">${ok ? "✓" : ""}</span>
            <span>${escapeHtml(t.title)}</span>
          </button>`;
        })
        .join("");
      return `<div class="level-group">
          <div class="level-name">${LEVEL_NAMES[lvl] || "Уровень " + lvl}</div>
          ${items}
        </div>`;
    })
    .join("");

  $("task-list")
    .querySelectorAll(".task-item")
    .forEach((el) => el.addEventListener("click", () => selectTask(el.dataset.id)));
}

function updateProgress() {
  $("progress").textContent = `Прогресс: ${solved.size} / ${TASKS.length}`;
}

function formatInline(text) {
  return escapeHtml(text).replace(/`([^`]+)`/g, "<code>$1</code>");
}

function selectTask(id) {
  const task = TASKS.find((t) => t.id === id);
  if (!task) return;
  sandboxMode = false;
  currentTask = task;
  $("task-level").textContent = LEVEL_NAMES[task.level] || "Уровень " + task.level;
  $("task-title").textContent = task.title;
  $("task-desc").innerHTML = formatInline(task.description);
  $("hint-box").classList.add("hidden");
  $("solution-box").classList.add("hidden");
  $("feedback").classList.add("hidden");
  $("user-result").innerHTML = "";
  $("expected-result").innerHTML = "";
  $("editor").value = loadDrafts()[id] || "";
  $("btn-hint").classList.remove("hidden");
  $("btn-solution").classList.remove("hidden");

  const st = $("task-status");
  if (solved.has(id)) {
    st.textContent = "Решено ✓";
    st.className = "badge ok";
  } else {
    st.textContent = "Не решено";
    st.className = "badge";
  }
  renderSidebar();
}

function enableSandbox() {
  sandboxMode = true;
  currentTask = null;
  const meta = runtime.getMeta() || { label: "SQL" };
  $("task-level").textContent = `${meta.label} · свободный режим`;
  $("task-title").textContent = "SQL-песочница";
  $("task-desc").innerHTML =
    `Выполните любой SQL-запрос в runtime <code>${escapeHtml(
      meta.label
    )}</code>. Здесь нет проверки и подсказок; состояние сохраняется до перезагрузки runtime.`;
  $("editor").value = "SELECT * FROM departments;";
  $("task-status").textContent = "Песочница";
  $("task-status").className = "badge";
  $("hint-box").classList.add("hidden");
  $("solution-box").classList.add("hidden");
  $("feedback").classList.add("hidden");
  $("user-result").innerHTML = "";
  $("expected-result").innerHTML = "";
  $("btn-solution").classList.add("hidden");
  $("btn-hint").classList.add("hidden");
  renderSidebar();
}

// ---------- check ----------
async function run() {
  const sql = $("editor").value.trim();
  const fb = $("feedback");
  if (!sql) {
    fb.className = "feedback no";
    fb.innerHTML = "Введите SQL-запрос.";
    return;
  }

  if (!sandboxMode && currentTask) {
    const drafts = loadDrafts();
    drafts[currentTask.id] = $("editor").value;
    localStorage.setItem(STORE_DRAFTS, JSON.stringify(drafts));
  }

  $("btn-run").disabled = true;
  try {
    const userResult = await executeSQL(sql);
    $("user-result").innerHTML = renderTable(userResult);

    if (sandboxMode) {
      fb.className = userResult.error ? "feedback no" : "feedback ok";
      fb.innerHTML = userResult.error ? "Ошибка в запросе." : "Запрос выполнен.";
      return;
    }

    const expected = await executeSQL(currentTask.solution);
    $("expected-result").innerHTML = renderTable(expected);
    const ok =
      !userResult.error &&
      !expected.error &&
      resultsMatch(userResult, expected, currentTask.ordered !== false);

    if (ok) {
      if (!solved.has(currentTask.id)) {
        solved.add(currentTask.id);
        saveSet(STORE_DONE, solved);
        updateProgress();
        renderSidebar();
        const st = $("task-status");
        st.textContent = "Решено ✓";
        st.className = "badge ok";
      }
      fb.className = "feedback ok";
      fb.innerHTML = "Верно. Результат совпадает с ожидаемым.";
    } else if (userResult.error) {
      fb.className = "feedback no";
      fb.innerHTML =
        "Запрос завершился с ошибкой:<br><span class='err'>" +
        escapeHtml(userResult.error) +
        "</span>";
    } else {
      fb.className = "feedback no";
      fb.innerHTML =
        "Результат не совпадает с ожидаемым. Сравните таблицы и попробуйте изменить запрос.";
    }
  } finally {
    $("btn-run").disabled = false;
  }
}

// ---------- modal ----------
function openModal(html) {
  $("modal-content").innerHTML = html;
  $("modal").classList.remove("hidden");
}

function showSchema() {
  const meta = runtime.getMeta() || { label: "SQL" };
  openModal(
    `<h3>Схема учебной базы · ${escapeHtml(meta.label)}</h3><pre>${escapeHtml(
      window.DB.schemaDoc()
    )}</pre><p style="color:#8a97b3">Пример: <code>SELECT * FROM employees LIMIT 5;</code></p>`
  );
}

// ---------- wire up ----------
$("btn-run").addEventListener("click", run);
$("editor").addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    run();
  }
});
$("btn-hint").addEventListener("click", () => {
  if (!currentTask) return;
  $("hint-box").textContent = currentTask.hint;
  $("hint-box").classList.remove("hidden");
});
$("btn-solution").addEventListener("click", () => {
  if (!currentTask) return;
  $("solution-box").innerHTML =
    "Пример решения:<pre>" + escapeHtml(currentTask.solution) + "</pre>";
  $("solution-box").classList.remove("hidden");
});
$("btn-clear").addEventListener("click", () => ($("editor").value = ""));
$("btn-schema").addEventListener("click", showSchema);
$("btn-design").addEventListener("click", () => window.Designer.open(sandboxMode ? null : currentTask));
$("btn-sandbox").addEventListener("click", enableSandbox);
$("engine-select").addEventListener("change", (e) => switchEngine(e.target.value));
$("btn-reset").addEventListener("click", () => {
  if (!confirm("Сбросить прогресс и все черновики по базам данных?")) return;
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
$("modal").addEventListener("click", (e) => {
  if (e.target === $("modal")) $("modal").classList.add("hidden");
});

// ---------- init ----------
async function boot() {
  renderEngineOptions();
  updateProgress();
  renderSidebar();
  await switchEngine("sqlite");
}

boot();
