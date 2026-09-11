(function () {
  const $ = (id) => document.getElementById(id);
  let pyodide = null;
  let active = "javascript";
  const drafts = {
    javascript: 'const users = ["Аня", "Илья", "Мария"];\\n\\nfor (const user of users) {\\n  console.log("Привет, " + user + "!");\\n}',
    python: 'names = ["Аня", "Илья", "Мария"]\\n\\nfor name in names:\\n    print(f"Привет, {name}!")'
  };
  let pythonOut = [], pythonErr = [];
  const escapeHtml = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function write(text, kind = "") {
    $("program-output").innerHTML = text ? '<pre class="' + kind + '">' + escapeHtml(text) + '</pre>' : '<div class="empty">Запустите программу, чтобы увидеть результат.</div>';
  }
  function setStatus(text, state = "") {
    const el = $("program-status"); el.textContent = text; el.className = "program-status " + state;
  }
  function setRuntime(id) {
    drafts[active] = $("program-editor").value; active = id;
    $("program-runtime").value = id; $("program-editor").value = drafts[id];
   $("program-file-name").textContent = id === "python" ? "main.py" : "main.js";
    $("program-sidebar-file").textContent = id === "python" ? "main.py" : "main.js";
    $("program-language").textContent = id === "python" ? "Python / Pyodide" : "JavaScript / Browser";
    write(""); setStatus(id === "python" ? "Python загрузится при запуске" : "JavaScript готов", id === "python" ? "loading" : "ready");
  }
  async function ensurePyodide() {
    if (pyodide) return pyodide;
    setStatus("Загрузка Python runtime…", "loading");
    const module = await import("../vendor/pyodide/pyodide.mjs");
    pyodide = await module.loadPyodide({
      indexURL: new URL("../vendor/pyodide/", location.href).href,
      stdout: (line) => pythonOut.push(line), stderr: (line) => pythonErr.push(line)
    });
    setStatus("Python готов", "ready"); return pyodide;
  }
  async function run() {
    const code = $("program-editor").value; drafts[active] = code;
    $("program-run").disabled = true; setStatus("Выполнение…", "loading");
    try {
      if (active === "javascript") {
        const lines = [];
        const consoleProxy = { log: (...args) => lines.push(args.map(String).join(" ")), error: (...args) => lines.push("ERROR: " + args.map(String).join(" ")) };
        await new Function("console", '"use strict"; return (async () => { ' + code + '\\n })();')(consoleProxy);
        write(lines.join("\\n") || "Программа завершилась без вывода."); setStatus("JavaScript выполнен", "ready");
      } else {
        pythonOut = []; pythonErr = []; const py = await ensurePyodide(); await py.runPythonAsync(code);
        const text = (pythonOut.length ? pythonOut.join("\\n") : "") + (pythonErr.length ? "\\n" + pythonErr.join("\\n") : "") || "Программа завершилась без вывода.";
        write(text, pythonErr.length ? "program-error" : "");
      }
    } catch (error) { write(error && error.stack ? error.stack : String(error), "program-error"); setStatus("Ошибка выполнения", "error"); }
    finally { $("program-run").disabled = false; }
  }
  function init() {
    $("program-runtime").addEventListener("change", (e) => setRuntime(e.target.value));
    $("program-run").addEventListener("click", run);
    $("program-reset").addEventListener("click", () => { $("program-editor").value = drafts[active]; write(""); });
    $("program-editor").addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); } });
    document.querySelectorAll("[data-program-example]").forEach((button) => button.addEventListener("click", () => setRuntime(button.dataset.programExample)));
    setRuntime("javascript");
  }
  window.ITStudyLab = window.ITStudyLab || {}; window.ITStudyLab.initProgramming = init;
})();
