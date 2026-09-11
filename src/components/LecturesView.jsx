import CourseCatalog from "./lectures/CourseCatalog.jsx";
import LectureWorkspace from "./lectures/LectureWorkspace.jsx";

export default function LecturesView() {
  return <section id="lectures-view" className="product-view lectures-view hidden"><div className="lectures-shell"><CourseCatalog /><LectureWorkspace /></div></section>;
}
