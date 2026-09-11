export default function ProgrammingSandbox() {
  return (
    <>
    <div id="programming-sandbox" className="programming-ide hidden">
      <aside className="ide-activity-bar" aria-label="Лаборатории">
        <button className="activity-button" data-open-lab="database" title="Базы данных"><span>▦</span><small>DB</small></button>
        <button className="activity-button active" data-open-lab="programming" title="Программирование"><span>⌘</span><small>Code</small></button>
        <button className="activity-button" data-future-module data-title="Операционные системы" data-description="Интерактивный Linux terminal, файловая система, процессы и сигналы." title="Операционные системы"><span>›_</span><small>OS</small></button>
        <button className="activity-button" data-future-module data-title="Специальные программные продукты" data-description="Dockerfile, Compose, контейнеры, сети, volumes и CI/CD." title="Docker / Software"><span>◫</span><small>Dev</small></button>
      </aside>
      <main className="ide-main">
        <div className="ide-document-tabs">
          <button className="ide-document-tab active"><span className="tab-table-icon">⌘</span><span id="program-file-name">main.js</span></button>
          <button className="ide-new-tab" title="Новый файл">＋</button>
          <div className="ide-runtime-caption"><span id="program-language">JavaScript / Browser</span><small id="program-status">JavaScript готов</small></div>
        </div>
        <div className="program-workspace">
          <section className="program-center">
            <div className="data-toolbar">
              <button id="program-run" className="primary">▶ Run <kbd>Ctrl↵</kbd></button>
              <button id="program-reset">Reset</button>
              <span className="toolbar-separator"></span>
              <select id="program-runtime" className="program-runtime" aria-label="Язык программирования">
                <option defaultValue="javascript">JavaScript</option>
                <option defaultValue="python">Python / Pyodide</option>
              </select>
              <span className="inline-feedback">Локальное выполнение в браузере</span>
            </div>
            <section className="program-editor-card">
              <div className="panel-head"><span>Source code</span><small>Файл сохраняется в этой сессии</small></div>
              <textarea id="program-editor" className="workbench-editor" spellCheck="false" aria-label="Редактор кода"></textarea>
            </section>
            <section className="program-output-card">
              <div className="panel-head"><span>Console output</span><small>stdout / stderr</small></div>
              <div id="program-output" className="program-output"><div className="empty">Запустите программу, чтобы увидеть результат.</div></div>
            </section>
          </section>
          <aside className="program-sidebar">
            <div className="panel-head"><span>Project</span><small>browser FS</small></div>
            <div className="program-files"><button className="program-file active"><span>⌘</span><span id="program-sidebar-file">main.js</span></button></div>
            <div className="program-course-link">
              <small>Связанный курс</small>
              <strong>Программирование IT-систем</strong>
              <p>Теория, практика и Sandbox работают в одном контексте обучения.</p>
              <button id="program-open-lectures">Открыть лекции</button>
            </div>
            <div className="program-examples">
              <small>Быстрые примеры</small>
              <button data-program-example="javascript">JavaScript basics</button>
              <button data-program-example="python">Python basics</button>
            </div>
          </aside>
        </div>
        <div className="ide-statusbar"><span>● <strong>Programming</strong></span><span>JavaScript · Python / Pyodide</span><span className="statusbar-spacer"></span><span>IT Study Lab</span></div>
      </main>
    </div>
    </>
  );
}
