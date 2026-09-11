export default function TestsView() {
  return (
    <>
  <section id="tests-view" className="product-view hidden">
    <div className="tests-intro">
      <div>
        <div className="workspace-kicker">Knowledge check</div>
        <h1>Tests / Practice</h1>
        <p>Отдельный блок для проверки знаний. Он не ограничивает свободную песочницу.</p>
      </div>
      <div className="tests-actions">
        <button id="test-schema">Схема БД</button>
        <button id="test-design">Спроектировать</button>
        <button id="test-reset-progress" className="danger">Сбросить прогресс</button>
      </div>
    </div>

    <div className="layout tests-layout">
      <aside className="sidebar">
        <div className="sidebar-title">Базы данных · задания</div>
        <nav id="test-task-list" className="task-list"></nav>
      </aside>

      <section className="content">
        <div className="task-head">
          <div><div className="task-level" id="test-level"></div><h2 id="test-title"></h2></div>
          <span id="test-status" className="badge"></span>
        </div>
        <p className="task-desc" id="test-desc"></p>

        <div className="controls">
          <button id="test-run" className="primary">▶ Проверить</button>
          <button id="test-hint">Подсказка</button>
          <button id="test-solution">Показать решение</button>
          <button id="test-clear">Очистить</button>
        </div>

        <textarea id="test-editor" className="test-editor" spellCheck="false" placeholder="Введите SQL-запрос..."></textarea>
        <div id="test-feedback" className="feedback hidden"></div>

        <div className="results">
          <div className="results-col"><div className="results-caption">Результат вашего запроса</div><div id="test-user-result" className="result-box"></div></div>
          <div className="results-col"><div className="results-caption">Ожидаемый результат</div><div id="test-expected-result" className="result-box"></div></div>
        </div>

        <div className="hint-box hidden" id="test-hint-box"></div>
        <div className="solution-box hidden" id="test-solution-box"></div>
      </section>
    </div>
  </section>
    </>
  );
}
