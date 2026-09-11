import { useRef, useState } from "react";
import { useApp } from "../../state/app-store.jsx";

const DRAFTS_KEY = "it-study-lab.program.drafts";
const DRAFTS = {
  javascript: 'const users = ["Аня", "Илья", "Мария"];\n\nfor (const user of users) {\n  console.log("Привет, " + user + "!");\n}',
  python: 'names = ["Аня", "Илья", "Мария"]\n\nfor name in names:\n    print(f"Привет, {name}!")',
};

let pyodidePromise = null;

async function ensurePyodide(onStatus) {
  if (pyodidePromise) return pyodidePromise;
  onStatus("Загрузка Python runtime…", "loading");
  const out = [];
  const err = [];
  const module = await import(/* @vite-ignore */ new URL("vendor/pyodide/pyodide.mjs", document.baseURI).href);
  pyodidePromise = module.loadPyodide({
    indexURL: new URL("vendor/pyodide/", document.baseURI).href,
    stdout: (line) => out.push(line),
    stderr: (line) => err.push(line),
  });
  pyodidePromise._streams = { out, err };
  onStatus("Python готов", "ready");
  return pyodidePromise;
}

function loadDrafts() {
  try {
    return { ...DRAFTS, ...JSON.parse(localStorage.getItem(DRAFTS_KEY) || "{}") };
  } catch {
    return { ...DRAFTS };
  }
}

export default function ProgrammingSandbox() {
  const { nav, setMode, selectCourse } = useApp();
  const active = nav.mode === "sandbox" && nav.lab === "programming";

  const [runtimeId, setRuntimeId] = useState("javascript");
  const draftsRef = useRef(loadDrafts());
  const [code, setCode] = useState(draftsRef.current.javascript);
  const [output, setOutput] = useState({ text: "", kind: "", empty: "Запустите программу, чтобы увидеть результат." });
  const [status, setStatus] = useState({ text: "JavaScript готов", state: "ready" });
  const [running, setRunning] = useState(false);
  const editorRef = useRef(null);

  const saveDraft = (id, value) => {
    draftsRef.current[id] = value;
    try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(draftsRef.current)); } catch { /* ignore */ }
  };

  const switchRuntime = (id) => {
    setRuntimeId(id);
    setCode(draftsRef.current[id]);
    setOutput({ text: "", kind: "", empty: "Запустите программу, чтобы увидеть результат." });
    setStatus(
      id === "python"
        ? { text: "Python загрузится при запуске", state: "loading" }
        : { text: "JavaScript готов", state: "ready" }
    );
  };

  const run = async () => {
    saveDraft(runtimeId, code);
    setRunning(true);
    setStatus({ text: "Выполнение…", state: "loading" });
    try {
      if (runtimeId === "javascript") {
        const lines = [];
        const consoleProxy = {
          log: (...args) => lines.push(args.map(String).join(" ")),
          error: (...args) => lines.push("ERROR: " + args.map(String).join(" ")),
        };
        await new Function("console", '"use strict"; return (async () => { ' + code + "\n })();")(consoleProxy);
        const text = lines.join("\n") || "Программа завершилась без вывода.";
        setOutput({ text, kind: "", empty: "" });
        setStatus({ text: "JavaScript выполнен", state: "ready" });
      } else {
        const py = await ensurePyodide((text, state) => setStatus({ text, state }));
        py._streams.out.length = 0;
        py._streams.err.length = 0;
        await py.runPythonAsync(code);
        const combined =
          (py._streams.out.length ? py._streams.out.join("\n") : "") +
          (py._streams.err.length ? "\n" + py._streams.err.join("\n") : "") ||
          "Программа завершилась без вывода.";
        setOutput({ text: combined, kind: py._streams.err.length ? "program-error" : "", empty: "" });
        setStatus({ text: py._streams.err.length ? "Ошибка выполнения" : "Python выполнен", state: py._streams.err.length ? "error" : "ready" });
      }
    } catch (error) {
      setOutput({ text: error && error.stack ? error.stack : String(error), kind: "program-error", empty: "" });
      setStatus({ text: "Ошибка выполнения", state: "error" });
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    setCode(draftsRef.current[runtimeId]);
    setOutput({ text: "", kind: "", empty: "Запустите программу, чтобы увидеть результат." });
  };

  const isPython = runtimeId === "python";

  return (
    <div className={`programming-ide${active ? "" : " hidden"}`}>
      <main className="ide-main">
        <div className="ide-document-tabs">
          <button className="ide-document-tab active">
            <span className="tab-table-icon">⌘</span>
            <span>{isPython ? "main.py" : "main.js"}</span>
          </button>
          <button className="ide-new-tab" title="Новый файл">＋</button>
          <div className="ide-runtime-caption">
            <span>{isPython ? "Python / Pyodide" : "JavaScript / Browser"}</span>
            <small className={`program-status ${status.state}`}>{status.text}</small>
          </div>
        </div>

        <div className="program-workspace">
          <section className="program-center">
            <div className="data-toolbar">
              <button className="primary" disabled={running} onClick={run}>▶ Run <kbd>Ctrl↵</kbd></button>
              <button disabled={running} onClick={reset}>Reset</button>
              <span className="toolbar-separator" />
              <select
                className="program-runtime"
                aria-label="Язык программирования"
                value={runtimeId}
                onChange={(event) => switchRuntime(event.target.value)}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python / Pyodide</option>
              </select>
              <span className="inline-feedback">Локальное выполнение в браузере</span>
            </div>

            <section className="program-editor-card">
              <div className="panel-head"><span>Source code</span><small>Файл сохраняется в этой сессии</small></div>
              <textarea
                ref={editorRef}
                className="workbench-editor"
                spellCheck={false}
                aria-label="Редактор кода"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onBlur={(event) => saveDraft(runtimeId, event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault();
                    run();
                  }
                }}
              />
            </section>

            <section className="program-output-card">
              <div className="panel-head"><span>Console output</span><small>stdout / stderr</small></div>
              <div className="program-output">
                {output.text
                  ? <pre className={output.kind}>{output.text}</pre>
                  : <div className="empty">{output.empty}</div>}
              </div>
            </section>
          </section>

          <aside className="program-sidebar">
            <div className="panel-head"><span>Project</span><small>browser FS</small></div>
            <div className="program-files">
              <button className="program-file active"><span>⌘</span><span>{isPython ? "main.py" : "main.js"}</span></button>
            </div>
            <div className="program-course-link">
              <small>Связанный курс</small>
              <strong>Программирование IT-систем</strong>
              <p>Теория, практика и Sandbox работают в одном контексте обучения.</p>
              <button onClick={() => { setMode("lectures"); selectCourse("programming"); }}>Открыть лекции</button>
            </div>
            <div className="program-examples">
              <small>Быстрые примеры</small>
              <button onClick={() => switchRuntime("javascript")}>JavaScript basics</button>
              <button onClick={() => switchRuntime("python")}>Python basics</button>
            </div>
          </aside>
        </div>

        <div className="ide-statusbar">
          <span>● <strong>Programming</strong></span>
          <span>JavaScript · Python / Pyodide</span>
          <span className="statusbar-spacer" />
          <span>IT Study Lab</span>
        </div>
      </main>
    </div>
  );
}
