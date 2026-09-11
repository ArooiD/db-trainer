export function TestTaskList() {
  return <aside className="sidebar"><div className="sidebar-title">Базы данных · задания</div><nav id="test-task-list" className="task-list" /></aside>;
}

export function TestTaskWorkspace() {
  return <section className="content"><div className="task-head"><div><div className="task-level" id="test-level" /><h2 id="test-title" /></div><span id="test-status" className="badge" /></div><p className="task-desc" id="test-desc" /><div className="controls"><button id="test-run" className="primary">▶ Проверить</button><button id="test-hint">Подсказка</button><button id="test-solution">Показать решение</button><button id="test-clear">Очистить</button></div><textarea id="test-editor" className="test-editor" spellCheck={false} placeholder="Введите SQL-запрос..." /><div id="test-feedback" className="feedback hidden" /><div className="results"><div className="results-col"><div className="results-caption">Результат вашего запроса</div><div id="test-user-result" className="result-box" /></div><div className="results-col"><div className="results-caption">Ожидаемый результат</div><div id="test-expected-result" className="result-box" /></div></div><div className="hint-box hidden" id="test-hint-box" /><div className="solution-box hidden" id="test-solution-box" /></section>;
}
