import { useApp, runtime } from "../../state/app-store.jsx";
import ResultTable from "../shared/ResultTable.jsx";

function formatInline(text) {
  return String(text || "").replace(/`([^`]+)`/g, "$1");
}

export default function TestsView() {
  const {
    TASKS, LEVEL_NAMES, nav, selectTask,
    tests, setTests, setTestDraft, runTest, resetProgress, showModal, openDesigner, engineBusy,
  } = useApp();

  const task = TASKS.find((item) => item.id === nav.task) || TASKS[0];
  const byLevel = {};
  TASKS.forEach((item) => (byLevel[item.level] = byLevel[item.level] || []).push(item));
  const solved = task ? tests.solved.has(task.id) : false;

  const showSchema = () =>
    showModal(
      <>
        <h3>Схема учебной базы · {runtime.getMeta()?.label || "SQL"}</h3>
        <pre>{runtime.schemaDoc()}</pre>
        <p className="muted">Схема одинакова в SQLite и PostgreSQL, чтобы можно было сравнивать диалекты.</p>
      </>
    );

  return (
    <section className="product-view tests-layout">
      <aside className="sidebar">
        <div className="sidebar-title">Базы данных · задания</div>
        <nav className="task-list">
          {Object.keys(byLevel)
            .sort((a, b) => Number(a) - Number(b))
            .map((level) => (
              <div className="level-group" key={level}>
                <div className="level-name">{LEVEL_NAMES[level] || `Уровень ${level}`}</div>
                {byLevel[level].map((item) => (
                  <button
                    key={item.id}
                    className={`task-item${tests.solved.has(item.id) ? " solved" : ""}${task && item.id === task.id ? " active" : ""}`}
                    onClick={() => selectTask(item.id)}
                  >
                    <span className="mark">{tests.solved.has(item.id) ? "✓" : ""}</span>
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
            ))}
        </nav>
      </aside>

      <section className="content">
        <div className="tests-actions">
          <button onClick={showSchema}>Схема БД</button>
          <button onClick={() => openDesigner(task)}>Спроектировать</button>
          <button className="danger" onClick={resetProgress}>Сбросить прогресс</button>
        </div>

        {task && (
          <>
            <div className="task-head">
              <div>
                <div className="task-level">{LEVEL_NAMES[task.level] || `Уровень ${task.level}`}</div>
                <h2>{task.title}</h2>
              </div>
              <span className={`badge${solved ? " ok" : ""}`}>{solved ? "Решено ✓" : "Не решено"}</span>
            </div>
            <p className="task-desc">{formatInline(task.description)}</p>

            <div className="controls">
              <button className="primary" disabled={tests.running || engineBusy} onClick={runTest}>
                ▶ Проверить
              </button>
              <button onClick={() => setTests((prev) => ({ ...prev, hint: task.hint, solution: "" }))}>
                Подсказка
              </button>
              <button onClick={() => setTests((prev) => ({ ...prev, solution: task.solution, hint: "" }))}>
                Показать решение
              </button>
              <button onClick={() => setTestDraft("")}>Очистить</button>
            </div>

            <textarea
              className="test-editor"
              spellCheck={false}
              placeholder="Введите SQL-запрос..."
              value={tests.draft}
              onChange={(event) => setTestDraft(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                  event.preventDefault();
                  runTest();
                }
              }}
            />

            {tests.feedback && (
              <div className={`feedback ${tests.feedback.state}`}>{tests.feedback.text}</div>
            )}

            <div className="results">
              <div className="results-col">
                <div className="results-caption">Результат вашего запроса</div>
                <div className="result-box"><ResultTable result={tests.userResult} /></div>
              </div>
              <div className="results-col">
                <div className="results-caption">Ожидаемый результат</div>
                <div className="result-box"><ResultTable result={tests.expectedResult} /></div>
              </div>
            </div>

            {tests.hint && <div className="hint-box">{tests.hint}</div>}
            {tests.solution && (
              <div className="solution-box">
                Пример решения:<pre>{tests.solution}</pre>
              </div>
            )}
          </>
        )}
      </section>
    </section>
  );
}
