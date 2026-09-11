export default function AppHeader() {
  return (
    <>
  <header className="topbar app-topbar">
    <div className="brand-block">
      <div className="brand">IT Study Lab</div>
      <div className="brand-subtitle">Interactive sandbox for future programmers</div>
    </div>

    <nav className="mode-tabs" aria-label="Режим работы">
      <button id="tab-sandbox" className="mode-tab active">Sandbox</button>
      <button id="tab-tests" className="mode-tab">Tests</button>
      <button id="tab-lectures" className="mode-tab">Лекции</button>
    </nav>

    <div className="runtime-switch">
      <label htmlFor="engine-select">Runtime</label>
      <select id="engine-select" aria-label="Выбор runtime"></select>
      <span className="runtime-status" id="engine-status">инициализация…</span>
    </div>

    <div className="progress hidden" id="progress">Tests: …</div>

    <div className="pwa-controls">
      <span id="connection-status" className="connection-status" aria-live="polite"></span>
      <button id="install-app" className="install-app hidden" type="button" tabIndex="-1" aria-hidden="true"></button>
    </div>
  </header>
    </>
  );
}
