export function ProgramToolbar() {
  return <div className="data-toolbar"><button id="program-run" className="primary">▶ Run <kbd>Ctrl↵</kbd></button><button id="program-reset">Reset</button><span className="toolbar-separator" /><select id="program-runtime" className="program-runtime" aria-label="Язык программирования" defaultValue="javascript"><option value="javascript">JavaScript</option><option value="python">Python / Pyodide</option></select><span className="inline-feedback">Локальное выполнение в браузере</span></div>;
}

export function ProgramEditor() {
  return <section className="program-editor-card"><div className="panel-head"><span>Source code</span><small>Файл сохраняется в этой сессии</small></div><textarea id="program-editor" className="workbench-editor" spellCheck={false} aria-label="Редактор кода" /></section>;
}

export function ProgramOutput() {
  return <section className="program-output-card"><div className="panel-head"><span>Console output</span><small>stdout / stderr</small></div><div id="program-output" className="program-output"><div className="empty">Запустите программу, чтобы увидеть результат.</div></div></section>;
}

export function ProgramSidebar() {
  return <aside className="program-sidebar"><div className="panel-head"><span>Project</span><small>browser FS</small></div><div className="program-files"><button className="program-file active"><span>⌘</span><span id="program-sidebar-file">main.js</span></button></div><div className="program-course-link"><small>Связанный курс</small><strong>Программирование IT-систем</strong><p>Теория, практика и Sandbox работают в одном контексте обучения.</p><button id="program-open-lectures">Открыть лекции</button></div><div className="program-examples"><small>Быстрые примеры</small><button data-program-example="javascript">JavaScript basics</button><button data-program-example="python">Python basics</button></div></aside>;
}
