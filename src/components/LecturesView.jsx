export default function LecturesView() {
  return (
    <>
  <section id="lectures-view" className="product-view lectures-view hidden">
    <header className="lectures-header">
      <div>
        <div className="workspace-kicker">IT Study Lab / Learning</div>
        <h1>Лекции и курсы</h1>
        <p>Теория связана с практикой: после лекции можно перейти в соответствующую песочницу или режим Tests.</p>
      </div>
      <div className="lectures-summary"><strong id="lectures-ready-count">1</strong><span id="lectures-ready-label">курс доступен</span></div>
    </header>

    <div className="lectures-shell">
      <aside className="course-catalog">
        <div className="lecture-panel-title">Курсы</div>
        <nav id="course-list" className="course-list" aria-label="Список курсов"></nav>
      </aside>
      <main className="lecture-workspace">
        <div id="course-overview" className="course-overview"></div>
        <div className="lecture-content-grid">
          <nav id="lecture-list" className="lecture-list" aria-label="Темы курса"></nav>
          <article id="lecture-reader" className="lecture-reader"></article>
        </div>
      </main>
    </div>
  </section>
    </>
  );
}
