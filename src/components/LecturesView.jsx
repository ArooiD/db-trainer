import CourseCatalog from "./lectures/CourseCatalog.jsx";
import LectureWorkspace from "./lectures/LectureWorkspace.jsx";

export default function LecturesView() {
  return <section id="lectures-view" className="product-view lectures-view hidden"><header className="lectures-header"><div><div className="workspace-kicker">IT Study Lab / Learning</div><h1>Лекции и курсы</h1><p>Теория связана с практикой: после лекции можно перейти в соответствующую песочницу или режим Tests.</p></div><div className="lectures-summary"><strong id="lectures-ready-count">1</strong><span id="lectures-ready-label">курс доступен</span></div></header><div className="lectures-shell"><CourseCatalog /><LectureWorkspace /></div></section>;
}
