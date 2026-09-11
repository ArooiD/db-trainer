import { TestTaskList, TestTaskWorkspace } from "./tests/TestWorkspace.jsx";

export default function TestsView() {
  return <section id="tests-view" className="product-view hidden"><div className="tests-intro"><div className="tests-actions"><button id="test-schema">Схема БД</button><button id="test-design">Спроектировать</button><button id="test-reset-progress" className="danger">Сбросить прогресс</button></div></div><div className="layout tests-layout"><TestTaskList /><TestTaskWorkspace /></div></section>;
}
