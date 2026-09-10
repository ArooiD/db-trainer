// Совместимый фасад БД поверх общего runtime IT Study Lab.
// Старый UI и дизайнер могут продолжать обращаться к window.DB, при этом
// фактический движок выбирается через ITStudyLab.runtime.
(function () {
  const runtime = window.ITStudyLab.runtime;

  window.DB = {
    init: () => runtime.use(runtime.activeId || "sqlite"),
    use: (engineId) => runtime.use(engineId),
    executeSQL: (sql) => runtime.execute(sql),
    reset: () => runtime.reset(),
    schemaDoc: () => runtime.schemaDoc(),
    ready: () => runtime.ready(),
    activeEngine: () => runtime.active,
    activeEngineId: () => runtime.activeId,
    engines: () => runtime.list(),
  };
})();
